import { withTargetLocks } from '../utils/TargetLocks';
import { MessageIdentity, assertMessage } from './generation/GenerationHost';
import { eventOutputChannel, EventWritePayload, matchTaskRegex, RunResult, TaskConfig, TaskFailure, TaskResult, TextWriteSpec, WriteResult, WriteSpec } from './TaskSchema';

type TextTarget = { kind: 'message' } | { kind: 'worldbook'; book: string; uid: number };
type TextEdit = { kind: 'text'; key: string; target: TextTarget; identity: MessageIdentity; start: number; before: string; after: string; overlapped: boolean; result: WriteResult; owner: string;
  applied: boolean; beforeText: string; afterText: string };
type ValueEdit = { kind: 'mvu'; identity: MessageIdentity; path: string[]; before: unknown; after: unknown; hadBefore: boolean; hasAfter: boolean; result: WriteResult;
  owner: string; overlapped: boolean; arrays: { path: string[]; length: number }[] };
type CreateEdit = { kind: 'created'; identity: MessageIdentity; book: string; uid: number; initial: WorldbookEntry; result: WriteResult };
type CreateAttempt = { kind: 'create_pending'; identity: MessageIdentity; book: string; name: string; beforeUids: number[]; result: WriteResult };
export type JournalEdit = TextEdit | ValueEdit | CreateEdit | CreateAttempt;
export type Journal = { runId: string; edits: JournalEdit[]; commitOrder?: number;
  broadcasts?: { eventName: string; payload: EventWritePayload; result: WriteResult }[] };
const trackedTextEdits = new Set<TextEdit>();
const trackedMvuEdits = new Set<ValueEdit>();
const trustedTargetContent = new Map<string, string>();
let commitSequence = 0;
function observeTarget(key: string, latest: string) {
  if (trustedTargetContent.has(key) && trustedTargetContent.get(key) !== latest) {
    for (const edit of trackedTextEdits) if (edit.key === key) edit.overlapped = true;
  }
}
const same = (left: unknown, right: unknown) => _.isEqual(left, right);
const messageKey = (identity: MessageIdentity) => `message:${identity.chatKey}:${identity.messageId}:${identity.swipeId}`;
const bookKey = (name: string) => `worldbook:${name}`;
function targetKey(identity: MessageIdentity, target: TextTarget) { return target.kind === 'message' ? messageKey(identity) : `${bookKey(target.book)}:${target.uid}`; }
function overlap(previous: TextEdit, start: number, length: number, replacementLength: number) {
  const end = start + length;
  const previousEnd = previous.start + previous.after.length;
  if (end <= previous.start) previous.start += replacementLength - length;
  else if (start < previousEnd || (previous.after.length === 0 && start === previous.start)) previous.overlapped = true;
}
function recordText(journal: Journal, edit: TextEdit, result: Pick<RunResult, 'warnings'>) {
  if (edit.applied) return;
  for (const previous of trackedTextEdits) {
    if (previous.key !== edit.key) continue;
    const beforeOverlap = previous.overlapped;
    if (previous.owner === journal.runId) {
      if (edit.start + edit.before.length <= previous.start) previous.start += edit.after.length - edit.before.length;
    } else overlap(previous, edit.start, edit.before.length, edit.after.length);
    if (!beforeOverlap && previous.overlapped && previous.owner !== journal.runId) {
      result.warnings.push({ code: 'overlapping_write', message: '并发运行写入范围重叠，常规链回滚可能无法保留重叠结果', target: edit.key });
    }
  }
  edit.applied = true;
  trackedTextEdits.add(edit);
}
function extract(text: string, write: WriteSpec): string {
  if (!write.extract.length) return text;
  const matches = write.extract.flatMap(spec => {
    return matchTaskRegex(text, spec).map(match => match[0]);
  });
  if (!matches.length) throw new TaskFailure('extraction_failed', `写入 ${write.id} 的提取正则均未匹配`, 'extract');
  return matches.join('\n');
}
export function validateTaskOutput(task: TaskConfig, text: string) {
  if (!text.trim()) throw new TaskFailure('empty_result', '任务结果为空', 'extract');
  for (const write of task.output.writes) {
    if (!extract(text, write).trim()) throw new TaskFailure('empty_result', `写入 ${write.id} 的提取内容为空`, 'extract');
  }
}
function editsFor(text: string, content: string, write: TextWriteSpec) {
  if (write.operation.kind === 'append') return [{ start: text.length, before: '', after: (text ? '\n' : '') + content }];
  const matches = matchTaskRegex(text, write.operation.regex);
  if (!matches.length) throw new TaskFailure('conflict', `写入 ${write.id} 的目标替换条件已失效`, 'commit');
  return matches.map(match => ({ start: match.index!, before: match[0], after: content })).reverse();
}
type ValueChange = Pick<ValueEdit, 'path' | 'before' | 'after' | 'hadBefore' | 'hasAfter'>;
function leafChanges(before: any, after: any, path: string[] = []): ValueChange[] {
  if (same(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after) && before.length === after.length
    && Array.from({ length: before.length }, (_, index) => Object.hasOwn(before, index) && Object.hasOwn(after, index)).every(Boolean)) {
    return before.flatMap((value, index) => leafChanges(value, after[index], [...path, String(index)]));
  }
  if (_.isPlainObject(before) && _.isPlainObject(after)) return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .flatMap(key => leafChanges(before[key], after[key], [...path, key]).map(change => change.path.length === path.length + 1
      ? { ...change, hadBefore: Object.prototype.hasOwnProperty.call(before, key), hasAfter: Object.prototype.hasOwnProperty.call(after, key) } : change));
  return [{ path, before: structuredClone(before), after: structuredClone(after), hadBefore: before !== undefined, hasAfter: after !== undefined }];
}
function arrayGuards(data: unknown, path: string[]): ValueEdit['arrays'] {
  const result: ValueEdit['arrays'] = [];
  for (let length = 0; length < path.length; length++) {
    const ancestorPath = path.slice(0, length);
    const value = length === 0 ? data : _.get(data, ancestorPath);
    if (Array.isArray(value)) result.push({ path: ancestorPath, length: value.length });
  }
  return result;
}
function recordMvu(journal: Journal, edit: ValueEdit, runResult: RunResult) {
  for (const previous of trackedMvuEdits) {
    if (previous.owner === journal.runId || messageKey(previous.identity) !== messageKey(edit.identity)) continue;
    const common = Math.min(previous.path.length, edit.path.length);
    if (previous.path.slice(0, common).every((part, index) => part === edit.path[index])) {
      previous.overlapped = true;
      runResult.warnings.push({ code: 'overlapping_write', message: '并发运行的 MVU 路径重叠，常规链回滚可能无法保留重叠结果', target: `${messageKey(edit.identity)}:mvu:${JSON.stringify(edit.path)}` });
    }
  }
  journal.edits.push(edit); trackedMvuEdits.add(edit);
}
async function readText(target: TextTarget, identity: MessageIdentity): Promise<string> {
  assertMessage(identity);
  if (target.kind === 'message') return getChatMessages(identity.messageId)[0].message;
  const entry = (await getWorldbook(target.book)).find(item => item.uid === target.uid);
  assertMessage(identity);
  if (!entry) throw new TaskFailure('target_changed', '世界书目标已删除', 'commit');
  return entry.content;
}
async function writeText(target: TextTarget, identity: MessageIdentity, text: string) {
  assertMessage(identity);
  if (target.kind === 'message') await setChatMessages([{ message_id: identity.messageId, message: text }], { refresh: 'none' });
  else await updateWorldbookWith(target.book, entries => {
    assertMessage(identity);
    if (!entries.some(entry => entry.uid === target.uid)) throw new TaskFailure('target_changed', '世界书目标已删除', 'commit');
    return entries.map(entry => entry.uid === target.uid ? { ...entry, content: text } : entry);
  });
}
async function worldTarget(write: TextWriteSpec & { target: Extract<TextWriteSpec['target'], { kind: 'worldbook' }> }, identity: MessageIdentity, journal: Journal, result: WriteResult): Promise<TextTarget> {
  const target = write.target;
  result.target = `${bookKey(target.bookName)}:${target.entryUid ?? target.entryName}`;
  const entries = await getWorldbook(target.bookName);
  assertMessage(identity);
  let entry = target.entryUid !== undefined ? entries.find(item => item.uid === target.entryUid) : undefined;
  if (!entry) {
    const sameName = entries.filter(item => item.name === target.entryName);
    if (sameName.length > 1 || (target.entryUid !== undefined && sameName.length > 0)) throw new TaskFailure('ambiguous_target', `条目 ${target.entryName} 的身份不明确，请重新选择 UID`, 'commit');
    entry = sameName[0];
    if (!entry) {
      const attempt: CreateAttempt = { kind: 'create_pending', identity, book: target.bookName, name: target.entryName, beforeUids: entries.map(value => value.uid), result };
      journal.edits.push(attempt);
      const created = await createWorldbookEntries(target.bookName, [{ name: target.entryName, content: '', enabled: true }]);
      entry = created.new_entries[0];
      if (!entry) throw new TaskFailure('create_failed', '世界书条目创建未返回 UID', 'commit');
      journal.edits.splice(journal.edits.indexOf(attempt), 1);
      journal.edits.push({ kind: 'created', identity, book: target.bookName, uid: entry.uid, initial: structuredClone(entry), result });
      assertMessage(identity);
    }
  }
  return { kind: 'worldbook', book: target.bookName, uid: entry.uid };
}
export async function commitTask(task: TaskConfig, text: string, identity: MessageIdentity, journal: Journal, taskResult: TaskResult, runResult: RunResult, signal: AbortSignal) {
  const writes = task.output.writes;
  const prepared = writes.map(write => ({ write, content: extract(text, write) }));
  if (prepared.some(item => !item.content.trim())) throw new TaskFailure('empty_result', '提取内容为空，未执行写入', 'extract');
  if (writes.some(write => write.target.kind === 'message')) await waitGlobalInitialized('Mvu');
  const keys = writes.flatMap(write => write.target.kind === 'event' ? [] : [write.target.kind === 'message' ? messageKey(identity) : bookKey(write.target.bookName)]);
  await withTargetLocks(keys, async () => {
    assertMessage(identity, signal);
    journal.commitOrder = ++commitSequence;
    const messageWrites = prepared.filter(item => item.write.target.kind === 'message');
    const mvuContent = messageWrites.map(item => item.content).join('\n');
    const mvuOption = { type: 'message' as const, message_id: identity.messageId };
    const mvuBefore = messageWrites.length ? structuredClone(Mvu.getMvuData(mvuOption)) : undefined;
    const mvuAfter = messageWrites.length ? await Mvu.parseMessage(mvuContent, structuredClone(mvuBefore!)) : undefined;
    assertMessage(identity, signal);
    if (messageWrites.length && !mvuAfter && /<UpdateVariable\b|<JSONPatch\b/.test(mvuContent)) throw new TaskFailure('mvu_parse_failed', 'MVU 未成功解析任务变量更新', 'commit');
    let messageResult: WriteResult | undefined;
    for (const { write, content } of prepared) {
      assertMessage(identity, signal);
      const writeResult: WriteResult = { writeId: write.id, target: '', status: 'failed' };
      taskResult.writes.push(writeResult);
      if (write.target.kind === 'event') {
        const eventName = eventOutputChannel(task.eventName);
        writeResult.target = `event:${eventName}`;
        writeResult.status = 'pending';
        (journal.broadcasts ??= []).push({ eventName, result: writeResult, payload: {
          version: 1, scriptId: getScriptId(), runId: runResult.runId, requestId: runResult.requestId,
          taskId: task.id, writeId: write.id, chatId: identity.chatId, messageId: identity.messageId, swipeId: identity.swipeId, text: content,
        } });
        continue;
      }
      const target: TextTarget = write.target.kind === 'message' ? { kind: 'message' } : await worldTarget(write as any, identity, journal, writeResult);
      const key = targetKey(identity, target);
      writeResult.target = key;
      let latest = await readText(target, identity);
      observeTarget(key, latest);
      const created = target.kind === 'worldbook' && journal.edits.some(edit => edit.kind === 'created' && edit.result === writeResult);
      const edits = created ? [{ start: 0, before: '', after: content }] : editsFor(latest, content, write as TextWriteSpec);
      for (const edit of edits) {
        assertMessage(identity, signal);
        const after = latest.slice(0, edit.start) + edit.after + latest.slice(edit.start + edit.before.length);
        const pending: TextEdit = { kind: 'text', key, target, identity, ...edit, overlapped: false, result: writeResult, owner: journal.runId,
          applied: false, beforeText: latest, afterText: after };
        journal.edits.push(pending);
        try { await writeText(target, identity, after); }
        catch (error) {
          // A rejected acknowledgement can still have persisted the target. Inspect under
          // the same target lock; an unreadable/partial target stays pending for rollback.
          try {
            if (await readText(target, identity) === after) { recordText(journal, pending, runResult); trustedTargetContent.set(key, after); }
          } catch { /* Ownership remains explicitly unresolved in the pending journal. */ }
          throw error;
        }
        recordText(journal, pending, runResult);
        trustedTargetContent.set(key, after);
        assertMessage(identity, signal);
        latest = after;
      }
      writeResult.status = 'committed';
      if (target.kind === 'message') messageResult = writeResult;
    }
    if (messageResult) {
      assertMessage(identity, signal);
      if (mvuAfter) {
        if (!same(Mvu.getMvuData(mvuOption), mvuBefore)) throw new TaskFailure('mvu_conflict', 'MVU 数据在解析后发生外部修改', 'commit');
        const changes = leafChanges(mvuBefore, mvuAfter);
        for (const change of changes) recordMvu(journal, { kind: 'mvu', identity, ...change, result: messageResult,
          owner: journal.runId, overlapped: false, arrays: arrayGuards(mvuBefore, change.path) }, runResult);
        await Mvu.replaceMvuData(mvuAfter, mvuOption);
        assertMessage(identity, signal);
        await eventEmit('mag_variable_update_ended', mvuAfter, mvuBefore!);
      }
    }
  });
  if (writes.some(write => write.target.kind === 'message')) {
    assertMessage(identity, signal);
    await setChatMessages([{ message_id: identity.messageId }]);
  }
}
export async function rollbackJournal(journal: Journal, warnings: RunResult['warnings']): Promise<string[]> {
  discardBroadcasts(journal, '所属任务或运行未提交成功，未广播');
  const errors: string[] = [];
  const edits = [...journal.edits].reverse();
  const failedEdits = new Set<JournalEdit>();
  for (const edit of edits) {
    const key = edit.kind === 'text' ? (edit.target.kind === 'message' ? messageKey(edit.identity) : bookKey(edit.target.book)) : edit.kind === 'created' || edit.kind === 'create_pending' ? bookKey(edit.book) : messageKey(edit.identity);
    try {
      await withTargetLocks([key], async () => {
        assertMessage(edit.identity);
        if (edit.kind === 'text') {
          let latest = await readText(edit.target, edit.identity);
          if (!edit.applied) {
            if (latest === edit.beforeText) { edit.result.status = 'rolled_back'; return; }
            if (latest !== edit.afterText) throw new Error('写入确认失败后的目标状态不可验证');
            recordText(journal, edit, { warnings }); trustedTargetContent.set(edit.key, latest);
          }
          if (edit.overlapped) throw new Error('写入范围已被其他运行重叠修改');
          if (trustedTargetContent.get(edit.key) !== latest) throw new Error('目标存在未跟踪的外部修改，无法证明回滚片段归属');
          const start = edit.start;
          if (latest.slice(start, start + edit.after.length) !== edit.after) throw new Error('回滚片段的已跟踪位置或内容已变化');
          latest = latest.slice(0, start) + edit.before + latest.slice(start + edit.after.length);
          await writeText(edit.target, edit.identity, latest);
          trustedTargetContent.set(edit.key, latest);
          trackedTextEdits.delete(edit);
          for (const previous of trackedTextEdits) if (previous.key === edit.key) {
            if (previous.owner === edit.owner) {
              if (start + edit.after.length <= previous.start) previous.start += edit.before.length - edit.after.length;
            } else overlap(previous, start, edit.after.length, edit.before.length);
          }
        } else if (edit.kind === 'mvu') {
          const option = { type: 'message' as const, message_id: edit.identity.messageId };
          const data = structuredClone(Mvu.getMvuData(option));
          if (edit.overlapped || edit.arrays.some(guard => {
            const value = guard.path.length ? _.get(data, guard.path) : data;
            return !Array.isArray(value) || value.length !== guard.length;
          })) throw new Error(`MVU 路径或数组结构存在重叠修改: ${edit.path.join('.')}`);
          if (same(_.get(data, edit.path), edit.before) && _.has(data, edit.path) === edit.hadBefore) { trackedMvuEdits.delete(edit); return; }
          if (!same(_.get(data, edit.path), edit.after) || _.has(data, edit.path) !== edit.hasAfter) throw new Error(`MVU 路径已变化: ${edit.path.join('.')}`);
          if (edit.hadBefore) _.set(data, edit.path, edit.before); else _.unset(data, edit.path);
          await Mvu.replaceMvuData(data, option);
          trackedMvuEdits.delete(edit);
          assertMessage(edit.identity);
        } else if (edit.kind === 'create_pending') {
          const entries = await getWorldbook(edit.book);
          assertMessage(edit.identity);
          const candidates = entries.filter(value => value.name === edit.name && !edit.beforeUids.includes(value.uid));
          if (candidates.length) throw new Error(`条目创建确认失败，无法证明新 UID 归属，保留待核验：${edit.book}/${edit.name} (${candidates.map(value => value.uid).join(', ')})`);
        } else {
          const entries = await getWorldbook(edit.book);
          assertMessage(edit.identity);
          const entry = entries.find(value => value.uid === edit.uid);
          if (entry && same(entry, edit.initial)) await deleteWorldbookEntries(edit.book, value => { assertMessage(edit.identity); return value.uid === edit.uid; });
          else if (entry) warnings.push({ code: 'created_target_retained', message: '新建条目已有其他修改，回滚保留该条目', target: `${edit.book}:${edit.uid}` });
        }
        if (edit.result.status !== 'rollback_failed') edit.result.status = 'rolled_back';
      });
    } catch (error) {
      failedEdits.add(edit);
      edit.result.status = 'rollback_failed';
      edit.result.error = String(error);
      errors.push(String(error));
    }
  }
  journal.edits = journal.edits.filter(edit => failedEdits.has(edit));
  return errors;
}
export function discardBroadcasts(journal: Journal, reason: string) {
  for (const broadcast of journal.broadcasts ?? []) if (broadcast.result.status === 'pending') {
    broadcast.result.status = 'not_delivered'; broadcast.result.error = reason;
  }
}
/** Delivery is irreversible and deliberately outside generation retry and rollback. */
export async function flushBroadcasts(journal: Journal, taskResult: TaskResult, runResult: RunResult, identity: MessageIdentity, signal: AbortSignal) {
  for (const broadcast of journal.broadcasts ?? []) {
    if (broadcast.result.status !== 'pending') continue;
    try { assertMessage(identity, signal); }
    catch {
      discardBroadcasts(journal, '广播交付前运行已取消或消息身份已变化');
      taskResult.status = 'failed';
      taskResult.error = { code: 'broadcast_delivery_stopped', message: '写入与状态已提交，广播交付因取消或消息身份变化停止；已送达广播无法撤回', phase: 'commit' };
      runResult.warnings.push({ code: 'broadcast_delivery_stopped', message: taskResult.error.message });
      break;
    }
    try {
      await eventEmit(broadcast.eventName, structuredClone(broadcast.payload));
      broadcast.result.status = 'delivered';
    } catch (error) {
      const message = `广播监听器执行失败，可能已部分送达，已送达内容无法撤回；未重试生成：${error instanceof Error ? error.message : String(error)}`;
      broadcast.result.status = 'delivery_failed'; broadcast.result.error = message;
      taskResult.status = 'failed'; taskResult.error = { code: 'broadcast_delivery_failed', message, phase: 'commit' };
      runResult.warnings.push({ code: 'broadcast_delivery_failed', message, target: broadcast.result.target });
    }
  }
}
export function releaseJournal(journal: Journal) {
  for (const edit of journal.edits) {
    if (edit.kind === 'mvu') trackedMvuEdits.delete(edit);
    if (edit.kind === 'text') {
      trackedTextEdits.delete(edit);
      if (![...trackedTextEdits].some(other => other.key === edit.key)) trustedTargetContent.delete(edit.key);
    }
  }
}
