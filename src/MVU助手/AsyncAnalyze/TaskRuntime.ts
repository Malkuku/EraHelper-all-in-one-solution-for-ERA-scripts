import { ref, shallowReactive, watch } from 'vue';
import { z } from 'zod';
import { taskLog, showTaskNotice } from './TaskDiagnostics';
import { useTaskStore } from '../stores/TaskStore';
import { bindMessage, currentChatKey, createGenerationContext, MessageIdentity, assertMessage } from './generation/GenerationHost';
import { generateTask } from './generation/TaskGeneration';
import { commitTask, discardBroadcasts, flushBroadcasts, Journal, releaseJournal, rollbackJournal, validateTaskOutput } from './TaskCommit';
import { eventNameIsValid, RunResult, TaskConfig, TaskFailure, TaskResult, Trigger, UnrecoveredJournal, KatTaskAPI } from './TaskSchema';
import { validateTaskReadiness } from './TaskConfiguration';
import { readTaskHistory, resetTaskTriggerBaseline, rollbackTaskState, settleTaskState, StateUndo, timedSnapshot, stateSequenceHighWater, StateSaveFailure } from './TaskState';

type Run = { id: string; key: string; identity: MessageIdentity; sequence: number; controller: AbortController; cancelled: boolean; failed: boolean; result: RunResult;
  completed: { journal: Journal; state: StateUndo; result: TaskResult }[]; runningTasks: Map<string, string> };
export const activeTaskRuns = shallowReactive(new Map<string, Run>());
export const taskRunResults = ref<RunResult[]>([]);
const latestChains = new Map<string, Run>();
const busy = new Map<string, string>();
const unrecovered = new Map<string, { run: Run; taskId: string; journal?: Journal; stateUndo?: StateUndo; errors: string[] }>();
function retainUnrecovered(run: Run, taskId: string, journal: Journal | undefined, stateUndo: StateUndo | undefined, errors: string[]) {
  const key = JSON.stringify([run.id, taskId]);
  const previous = unrecovered.get(key);
  unrecovered.set(key, { run, taskId, journal: journal?.edits.length ? journal : previous?.journal,
    stateUndo: stateUndo ?? previous?.stateUndo, errors: [...(previous?.errors ?? []), ...errors] });
}
export function getUnrecoveredJournals(): UnrecoveredJournal[] {
  return [...unrecovered.values()].map(record => ({
    runId: record.run.id, taskId: record.taskId, chatId: record.run.identity.chatId, messageId: record.run.identity.messageId, swipeId: record.run.identity.swipeId,
    operations: (record.journal?.edits ?? []).map(edit => {
      const { identity, ...operation } = edit;
      return structuredClone({ ...operation, identity: { chatKey: identity.chatKey, chatId: identity.chatId, messageId: identity.messageId, swipeId: identity.swipeId } });
    }),
    ...(record.stateUndo ? { stateUndo: structuredClone(record.stateUndo) } : {}), errors: [...record.errors],
  }));
}
let sequence = 0;
let cleanup: (() => void)[] = [];
let customCleanup: (() => void)[] = [];
const uid = () => crypto.randomUUID();
function errorOf(error: unknown, phase: TaskFailure['phase'] = 'prepare') {
  return error instanceof TaskFailure ? { code: error.code, message: error.message, phase: error.phase, ...(error.details ? { details: structuredClone(error.details) } : {}) } : { code: 'task_error', message: error instanceof Error ? error.message : String(error), phase };
}
function resultFor(requestId: string, runId: string, trigger: Trigger, messageId: number): RunResult {
  return { version: 1, requestId, runId, trigger, messageId, chatId: '', status: 'failed', tasks: [], warnings: [], rollback: { status: 'not_needed', errors: [] } };
}
function notifyRun(runId: string, level: 'info' | 'success' | 'warning' | 'error', title: string, message: string, running = false) {
  try {
    showTaskNotice({ runId, level, title: `MVU助手 · ${title}`, message, running });
  } catch (error) {
    // Notification failure must not change task settlement or prevent result delivery.
    console.warn('[MVU助手] 无法显示任务通知', error);
  }
}
function notifyResult(result: RunResult) {
  const automatic = result.trigger.kind === 'sent' || result.trigger.kind === 'received';
  if (automatic && (result.status === 'skipped' || result.status === 'busy')) return;
  const context = `楼层 ${result.messageId}${result.trigger.kind === 'event' ? ` · 事件 ${result.trigger.eventName}` : ''}`;
  const counts = new Map<string, number>();
  const labels: Record<TaskResult['status'], string> = {
    succeeded: '成功', failed: '失败', cancelled: '取消', skipped: '跳过', rolled_back: '已回滚', rollback_failed: '回滚失败',
  };
  for (const task of result.tasks) {
    const label = labels[task.status];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const summary = [...counts].map(([label, count]) => `${label} ${count} 项`).join('，');
  const failures = result.tasks.filter(task => task.error).map(task => `${task.taskName || '未命名任务'}：${task.error!.message}`);
  const skipped = result.status === 'skipped' ? result.tasks.map(task => `${task.taskName || '未命名任务'}：${task.reason?.message || '未执行'}`) : [];
  const residue = ['partial', 'failed'].includes(result.rollback.status) || result.tasks.some(task => task.status === 'rollback_failed' || task.writes.some(write => write.status === 'rollback_failed'));
  const detail = [context, summary,
    result.status === 'busy' ? '已有任务正在运行，本次未重复启动' : result.reason === 'no_matching_tasks' ? '没有符合条件的任务' : result.reason,
    ...failures, ...skipped,
    residue ? '存在未恢复的修改，请打开运行结果检查' : result.rollback.status === 'completed' ? '本链提交已回滚' : '',
    ...result.warnings.map(warning => warning.message),
  ].filter(Boolean).join('；');
  const titles = { succeeded: '任务完成', partial: '任务部分成功', failed: '任务失败', cancelled: '任务已取消', busy: '任务正在运行', skipped: '本次未执行' };
  const level = result.status === 'failed' || residue ? 'error'
    : result.status === 'succeeded' && !result.warnings.length ? 'success'
    : result.status === 'busy' || result.status === 'cancelled' ? 'info' : 'warning';
  const names = result.tasks.map(task => task.taskName || '未命名任务').join('、');
  notifyRun(result.runId, level, `${titles[result.status]}${names ? ' · ' + names : ''}`, detail);
}
function notifyRunningTasks(run: Run) {
  if (!run.runningTasks.size) return;
  const names = [...run.runningTasks.values()].join('、');
  const context = `楼层 ${run.identity.messageId}${run.result.trigger.kind === 'event' ? ' · 事件 ' + run.result.trigger.eventName : ''}`;
  notifyRun(run.id, 'info', `任务处理中 · ${names}`, `${context}：${names}`, true);
}
async function publish(result: RunResult) {
  const published = structuredClone(result);
  taskLog(published.status === 'failed' ? 'error' : published.status === 'partial' ? 'warn' : 'info', '运行结算', {
    ...published, tasks: published.tasks.map(({ text, ...task }) => ({ ...task, outputChars: text?.length ?? 0 })),
  });
  taskRunResults.value = [...taskRunResults.value.filter(item => item.runId !== published.runId), published];
  notifyResult(published);
  try { await eventEmit(published.trigger.kind === 'event' ? `${published.trigger.eventName}:result` : 'kat_task_chain:result', structuredClone(published)); }
  catch { published.warnings.push({ code: 'result_listener_failed', message: '结果已保留，但结果频道的监听器执行失败' }); taskLog('warn', '结果监听器执行失败', { runId: published.runId, requestId: published.requestId, trigger: published.trigger }); }
  return structuredClone(published);
}
export function cancelTaskRun(runId: string): boolean {
  const run = activeTaskRuns.get(runId);
  if (!run) return false;
  taskLog('info', '请求取消运行', { runId, requestId: run.result.requestId, trigger: run.result.trigger });
  run.cancelled = true; run.controller.abort('cancelled'); return true;
}
async function undoRun(run: Run) {
  taskLog('warn', '开始回滚常规链', { runId: run.id, tasks: run.completed.map(item => item.result.taskId) });
  const errors: string[] = [...run.result.rollback.errors];
  for (const completed of [...run.completed].sort((a, b) => (b.journal.commitOrder ?? 0) - (a.journal.commitOrder ?? 0))) {
    if (completed.journal.broadcasts?.some(item => ['delivered', 'delivery_failed'].includes(item.result.status))) {
      run.result.warnings.push({ code: 'broadcast_cannot_rollback', message: '已送达或可能部分送达的广播无法撤回，重新计算可能再次交付；接收方应使用载荷标识去重', target: completed.result.taskId });
    }
    const failures = await rollbackJournal(completed.journal, run.result.warnings);
    let stateFailure = false;
    try { await rollbackTaskState(completed.state, run.identity); } catch (error) { stateFailure = true; failures.push(String(error)); }
    if (failures.length) retainUnrecovered(run, completed.result.taskId, completed.journal, stateFailure ? completed.state : undefined, failures);
    completed.result.status = failures.length ? 'rollback_failed' : 'rolled_back';
    errors.push(...failures);
  }
  run.result.rollback = { status: errors.length ? (run.completed.some(item => item.result.status === 'rolled_back') ? 'partial' : 'failed') : 'completed', errors };
  taskLog(errors.length ? 'error' : 'info', '回滚结算', { runId: run.id, ...run.result.rollback });
}
async function executeTask(run: Run, task: TaskConfig, snapshot: ReturnType<ReturnType<typeof useTaskStore>['snapshot']>, result: TaskResult) {
  const started = Date.now();
  run.runningTasks.set(task.id, task.name || '未命名任务');
  notifyRunningTasks(run);
  const logIdentity = { runId: run.id, requestId: run.result.requestId, taskId: task.id, taskName: task.name, messageId: run.identity.messageId };
  taskLog('info', '开始执行任务', { ...logIdentity, order: task.order, targets: task.output.writes.map(write => write.target.kind), trigger: run.result.trigger });
  const journal: Journal = { runId: run.id, edits: [] };
  let phase: TaskFailure['phase'] = 'prepare';
  let savedState: StateUndo | undefined;
  try {
    const store = useTaskStore();
    const { link } = validateTaskReadiness(snapshot, task);
    const history = readTaskHistory(task.id, run.identity);
    const beforeState = timedSnapshot(history);
    let generated: Awaited<ReturnType<typeof createGenerationContext>> | undefined;
    let text = '';
    for (let attempt = 0; attempt <= task.retryCount; attempt++) {
      result.attempts = attempt + 1;
      taskLog('info', '生成尝试', { ...logIdentity, attempt: result.attempts, maxAttempts: task.retryCount + 1 });
      run.controller.signal.throwIfAborted();
      const controller = new AbortController();
      const abort = () => controller.abort(run.controller.signal.reason);
      run.controller.signal.addEventListener('abort', abort, { once: true });
      try {
        phase = 'prepare';
        generated = await createGenerationContext(run.id, task, snapshot, run.identity, controller, store.getSecret(link.secretRef), beforeState);
        phase = 'request';
        text = await generateTask(generated);
        phase = 'extract';
        validateTaskOutput(task, text);
        break;
      } catch (error) {
        taskLog('warn', '生成尝试未完成', { ...logIdentity, attempt: result.attempts, error: errorOf(error, phase),
          retrying: !run.controller.signal.aborted && attempt < task.retryCount });
        if (run.controller.signal.aborted || attempt === task.retryCount) throw error;
      } finally { run.controller.signal.removeEventListener('abort', abort); }
    }
    result.text = text;
    phase = 'commit';
    taskLog('info', '开始提交任务结果', { ...logIdentity, targets: task.output.writes.map(write => write.target.kind) });
    await commitTask(task, text, run.identity, journal, result, run.result, run.controller.signal);
    assertMessage(run.identity, run.controller.signal);
    savedState = await settleTaskState(task.id, run.identity, beforeState, generated!.timedState, run.id, run.sequence);
    assertMessage(run.identity, run.controller.signal);
    run.completed.push({ journal, state: savedState, result });
    result.status = 'succeeded';
    if (run.result.trigger.kind === 'event') await flushBroadcasts(journal, result, run.result, run.identity, run.controller.signal);
    taskLog('info', '任务执行成功', { ...logIdentity, elapsedMs: Date.now() - started, writes: result.writes });
  } catch (error) {
    discardBroadcasts(journal, '所属任务未提交成功，未广播');
    const cancelled = run.controller.signal.aborted;
    result.status = cancelled ? 'cancelled' : 'failed';
    result.error = cancelled ? { code: 'cancelled', message: '所属运行已取消或失败', phase } : errorOf(error, phase);
    taskLog(cancelled ? 'warn' : 'error', '任务执行未完成', { ...logIdentity, elapsedMs: Date.now() - started, error: result.error });
    if (error instanceof TaskFailure && error.rollbackErrors.length) {
      result.status = 'rollback_failed';
      run.result.rollback = { status: 'failed', errors: [...run.result.rollback.errors, ...error.rollbackErrors] };
      retainUnrecovered(run, task.id, undefined, error instanceof StateSaveFailure ? error.undo : undefined, error.rollbackErrors);
    }
    for (const write of result.writes) if (write.status === 'failed') write.error = result.error.message;
    if (!cancelled && run.result.trigger.kind !== 'event') { run.failed = true; run.controller.abort('task_failed'); }
    if (savedState) {
      try { await rollbackTaskState(savedState, run.identity); }
      catch (stateError) {
        const errors = [String(stateError)];
        result.status = 'rollback_failed';
        run.result.rollback = { status: 'failed', errors: [...run.result.rollback.errors, ...errors] };
        retainUnrecovered(run, task.id, undefined, savedState, errors);
      }
    }
    if (journal.edits.length) {
      const errors = await rollbackJournal(journal, run.result.warnings);
      if (errors.length) {
        result.status = 'rollback_failed'; run.result.rollback = { status: 'failed', errors: [...run.result.rollback.errors, ...errors] };
        retainUnrecovered(run, task.id, journal, undefined, errors);
      }
    }
  } finally {
    run.runningTasks.delete(task.id);
    notifyRunningTasks(run);
  }
}
export async function runTaskChain(options: { messageId: number; trigger: Trigger; requestId?: string; taskId?: string }, resetPrevious = false): Promise<RunResult> {
  options = { ...options, trigger: { ...options.trigger } };
  const requestId = typeof options.requestId === 'string' ? options.requestId : uid();
  const runId = uid();
  const result = resultFor(requestId, runId, options.trigger, options.messageId);
  let run: Run | undefined;
  try {
    if ((options.requestId !== undefined && typeof options.requestId !== 'string')
      || !Number.isInteger(options.messageId) || options.messageId < 0
      || !['event', 'sent', 'received', 'manual', 'task'].includes(options.trigger.kind)
      || (options.taskId !== undefined && (typeof options.taskId !== 'string' || !options.taskId))
      || (options.trigger.taskId !== undefined && (typeof options.trigger.taskId !== 'string' || !options.trigger.taskId))
      || (options.taskId !== undefined && options.trigger.taskId !== undefined && options.taskId !== options.trigger.taskId)
      || (options.trigger.kind === 'event' && (typeof options.trigger.eventName !== 'string' || !options.trigger.eventName || !eventNameIsValid(options.trigger.eventName)))) {
      throw new TaskFailure('invalid_request', '请求关联 ID、事件名或消息楼层无效', 'prepare');
    }
    const identity = bindMessage(options.messageId);
    result.chatId = identity.chatId;
    result.swipeId = identity.swipeId;
    const store = useTaskStore();
    if (store.configurationError) throw new TaskFailure('unsupported_config', store.configurationError, 'prepare');
    const snapshot = store.snapshot();
    const group = snapshot.groups.find(item => item.id === snapshot.activeGroupId);
    const taskId = options.taskId ?? options.trigger.taskId;
    if (options.trigger.kind === 'task' && !taskId) throw new TaskFailure('invalid_request', '单任务运行必须提供任务 ID', 'prepare');
    if (taskId !== undefined) {
      const task = snapshot.tasks.find(item => item.id === taskId);
      if (!task) throw new TaskFailure('missing_task', `任务不存在：${taskId}`, 'prepare');
      if (!group?.taskIds.includes(taskId)) throw new TaskFailure('task_not_in_active_group', '指定任务未关联当前活动组', 'prepare');
      if (['sent', 'received'].includes(options.trigger.kind)) throw new TaskFailure('invalid_request', '自动常规入口不接受单任务选择', 'prepare');
      if (options.trigger.kind === 'event' && task.eventName !== options.trigger.eventName)
        throw new TaskFailure('event_task_mismatch', '指定任务不属于请求的事件', 'prepare');
      options.trigger = task.eventName ? { kind: 'event', eventName: task.eventName, taskId } : { kind: 'task', taskId };
      result.trigger = options.trigger;
      if (task.eventName && !eventNameIsValid(task.eventName)) throw new TaskFailure('invalid_request', '任务事件名与内部频道冲突或含首尾空白', 'prepare');
    }
    const regular = options.trigger.kind !== 'event' && options.trigger.kind !== 'task';
    if (resetPrevious && !regular) throw new TaskFailure('invalid_request', '只有常规链支持回滚后重新计算', 'prepare');
    const key = JSON.stringify(options.trigger.kind === 'event'
      ? [getScriptId(), identity.chatKey, 'event', options.trigger.eventName]
      : options.trigger.kind === 'task' ? [getScriptId(), identity.chatKey, 'task', taskId]
      : [getScriptId(), identity.chatKey, 'regular']);
    const occupying = busy.get(key);
    if (occupying) { result.status = 'busy'; result.reason = 'already_running'; result.activeRunId = occupying; return await publish(result); }
    sequence = Math.max(sequence, stateSequenceHighWater(identity)) + 1;
    run = { id: runId, key, identity, sequence, controller: new AbortController(), cancelled: false, failed: false, result, completed: [], runningTasks: new Map() };
    busy.set(key, runId); activeTaskRuns.set(runId, run);
    taskLog('info', '运行准入', { runId, requestId, trigger: options.trigger, chatId: identity.chatId, messageId: identity.messageId, swipeId: identity.swipeId, groupId: group?.id, groupName: group?.name });
    if (resetPrevious) {
      const previous = latestChains.get(identity.chatKey);
      if (previous && previous.identity.raw === identity.raw && previous.identity.swipeId === identity.swipeId) {
        await undoRun(previous);
        result.warnings.push(...previous.result.warnings.filter(warning => warning.code === 'broadcast_cannot_rollback'));
        assertMessage(identity, run.controller.signal);
        if (previous.result.rollback.errors.length) {
          result.rollback = structuredClone(previous.result.rollback);
          throw new TaskFailure('rollback_failed', '重新计算前回滚失败，未启动新的生成', 'rollback');
        }
        latestChains.delete(identity.chatKey);
      } else if ((group?.taskIds ?? []).some(id => {
        const task = snapshot.tasks.find(item => item.id === id)!;
        return task.enabled && task.order >= 0 && readTaskHistory(id, identity).lastSuccessfulFloor === identity.messageId;
      })) {
        throw new TaskFailure('rollback_unavailable', '当前楼层已有成功历史，但本会话没有可用的回滚日志；未恢复原数据或重新生成。', 'rollback');
      }
    }
    const tasks = (group?.taskIds ?? []).map(id => snapshot.tasks.find(task => task.id === id)!);
    const selected = tasks.filter(task => taskId !== undefined ? task.id === taskId
      : options.trigger.kind === 'event' ? task.eventName === options.trigger.eventName
      : options.trigger.kind === 'sent' ? task.order < 0 : task.order >= 0);
    const ready: { task: TaskConfig; result: TaskResult }[] = [];
    for (const task of selected) {
      const taskResult: TaskResult = { taskId: task.id, taskName: task.name, status: 'skipped', attempts: 0, writes: [] };
      result.tasks.push(taskResult);
      const history = readTaskHistory(task.id, identity);
      let reason: TaskResult['reason'];
      if (!task.enabled && options.trigger.kind !== 'event') reason = { code: 'disabled', message: '任务已关闭常规链参与' };
      else if ((options.trigger.kind === 'sent' || options.trigger.kind === 'received') && options.messageId === 0) reason = { code: 'initial_floor', message: '自动常规入口不执行第 0 楼' };
      else if (options.trigger.kind === 'received' && identity.raw.mes.length < snapshot.automatic.minReceivedChars) reason = { code: 'short_message', message: `正文少于配置阈值 ${snapshot.automatic.minReceivedChars}` };
      else if (taskId === undefined && task.triggerInterval > 1) {
        const lastTrigger = history.triggerBaseline?.floor ?? history.lastSuccessfulFloor ?? 0;
        if (options.messageId - lastTrigger < task.triggerInterval) {
          reason = { code: 'interval_not_reached', message: '未达到楼层间隔', currentFloor: options.messageId,
            lastSuccessfulFloor: history.lastSuccessfulFloor, lastTriggerFloor: lastTrigger };
          if (lastTrigger > options.messageId) {
            await resetTaskTriggerBaseline(task.id, identity, runId, run.sequence);
            reason = { ...reason, code: 'trigger_baseline_reset', message: '楼层早于触发基线，本次跳过并重置间隔基线' };
          }
        }
      }
      if (reason) { taskResult.reason = reason; taskLog('info', '任务跳过', { runId, taskId: task.id, taskName: task.name, reason }); }
      else ready.push({ task, result: taskResult });
    }
    const orders = [...new Set(ready.map(item => item.task.order))].sort((a, b) => a - b);
    for (const order of orders) {
      if (run.controller.signal.aborted) break;
      await Promise.all(ready.filter(item => item.task.order === order).map(item => executeTask(run!, item.task, snapshot, item.result)));
    }
    for (const item of ready) if (item.result.attempts === 0) item.result.reason = { code: 'run_stopped', message: '所属运行已失败或取消，任务未开始' };
    if (run.cancelled || run.failed) {
      if (options.trigger.kind !== 'event') await undoRun(run);
      result.status = run.cancelled ? 'cancelled' : 'failed';
    } else {
      if (options.trigger.kind !== 'event') {
        // All text/MVU writes and task states are durable before any explicit result delivery.
        for (const completed of run.completed) await flushBroadcasts(completed.journal, completed.result, result, identity, run.controller.signal);
      }
      const succeeded = result.tasks.filter(task => task.status === 'succeeded').length;
      const failed = result.tasks.filter(task => ['failed', 'rollback_failed'].includes(task.status)).length;
      result.status = run.cancelled ? 'cancelled' : failed ? (succeeded ? 'partial' : 'failed') : succeeded ? 'succeeded' : 'skipped';
      if (run.cancelled && run.completed.some(item => item.journal.broadcasts?.some(broadcast => ['delivered', 'delivery_failed'].includes(broadcast.result.status))))
        result.warnings.push({ code: 'broadcast_cannot_rollback', message: '取消发生在提交后的广播交付阶段，写入和状态已保留；已送达或可能部分送达的广播无法撤回' });
      if (!result.tasks.length) result.reason = 'no_matching_tasks';
    }
    if (regular && run.completed.length && !run.failed && result.rollback.status === 'not_needed') {
      const previous = latestChains.get(identity.chatKey);
      previous?.completed.forEach(item => releaseJournal(item.journal));
      latestChains.set(identity.chatKey, run);
    } else if (!regular) run.completed.forEach(item => releaseJournal(item.journal));
  } catch (error) {
    result.status = run?.cancelled ? 'cancelled' : 'failed';
    result.reason = errorOf(error).message;
    if (run?.completed.length && options.trigger.kind !== 'event') await undoRun(run);
  } finally {
    if (run) { if (busy.get(run.key) === run.id) busy.delete(run.key); activeTaskRuns.delete(run.id); }
  }
  return publish(result);
}
export async function rerunCurrentTasks() {
  return runTaskChain({ messageId: getLastMessageId(), trigger: { kind: 'manual' } }, true);
}
const EventRequestSchema = z.union([z.string().transform(requestId => ({ requestId })), z.object({
  requestId: z.string().optional(), messageId: z.number().int().nonnegative().optional(), taskId: z.string().min(1).optional(),
}).strict()]).optional();
async function handleTaskEvent(eventName: string, payload: unknown) {
  const parsed = EventRequestSchema.safeParse(payload);
  const suppliedRequestId = payload && typeof payload === 'object' && typeof (payload as any).requestId === 'string'
    ? (payload as { requestId: string }).requestId : typeof payload === 'string' ? payload : undefined;
  try {
    if (!parsed.success) throw new TaskFailure('invalid_request', '事件请求应为 requestId 字符串或 { requestId?, messageId?, taskId? } 对象', 'prepare');
    const request: { requestId?: string; messageId?: number; taskId?: string } = parsed.data ?? {};
    return await runTaskChain({ messageId: request.messageId ?? getLastMessageId(), requestId: request.requestId,
      taskId: request.taskId, trigger: { kind: 'event', eventName } });
  } catch (error) {
    const result = resultFor(suppliedRequestId ?? uid(), uid(), { kind: 'event', eventName }, -1);
    result.reason = errorOf(error).message;
    return publish(result);
  }
}
export function initializeTaskRuntime() {
  const store = useTaskStore();
  const registerCustom = () => {
    customCleanup.forEach(stop => stop()); customCleanup = [];
    const group = store.settings.groups.find(item => item.id === store.settings.activeGroupId);
    const events = new Set((group?.taskIds ?? []).map(id => store.settings.tasks.find(task => task.id === id)?.eventName).filter((name): name is string => !!name && eventNameIsValid(name)));
    for (const eventName of events) {
      const handler = (request?: unknown) => handleTaskEvent(eventName, request);
      const listener = eventOn(eventName, handler); customCleanup.push(() => listener.stop());
    }
  };
  registerCustom();
  cleanup.push(watch(() => store.settings, registerCustom, { deep: true }));
  cleanup.push(eventOn(tavern_events.MESSAGE_SENT, messageId => runTaskChain({ messageId, trigger: { kind: 'sent' } })).stop);
  cleanup.push(eventOn(tavern_events.MESSAGE_RECEIVED, messageId => runTaskChain({ messageId, trigger: { kind: 'received' } })).stop);
  cleanup.push(eventOn('kat_task_chain:rerun', rerunCurrentTasks).stop);
  cleanup.push(eventOn('kat_task_run:cancel', cancelTaskRun).stop);
  cleanup.push(eventOn(tavern_events.CHAT_CHANGED, () => {
    const key = currentChatKey();
    for (const run of activeTaskRuns.values()) if (run.identity.chatKey !== key) cancelTaskRun(run.id);
  }).stop);
  const api: KatTaskAPI = { version: 1, getConfig: store.snapshot, setConfig: store.replaceSettings, setSecret: store.setSecret, deleteSecret: store.deleteSecret,
    run: options => runTaskChain({ messageId: options.messageId, requestId: options.requestId, taskId: options.taskId,
      trigger: options.eventName !== undefined ? { kind: 'event', eventName: options.eventName } : options.taskId !== undefined ? { kind: 'task', taskId: options.taskId } : { kind: 'manual' } }),
    cancel: cancelTaskRun, getActiveRuns: () => [...activeTaskRuns.values()].map(run => ({ runId: run.id, requestId: run.result.requestId, trigger: structuredClone(run.result.trigger), chatId: run.identity.chatId, messageId: run.identity.messageId })),
    getUnrecoveredJournals };
  (window as any).KatTaskAPI = api;
  initializeGlobal('KatTaskAPI', api);
}
export function disposeTaskRuntime() {
  for (const run of activeTaskRuns.values()) cancelTaskRun(run.id);
  customCleanup.forEach(stop => stop()); cleanup.forEach(stop => stop()); customCleanup = []; cleanup = [];
}
