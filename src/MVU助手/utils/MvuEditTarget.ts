import { cloneDeep, isEqual, isPlainObject } from 'lodash';
import { markRaw } from 'vue';
import { withTargetLocks } from './TargetLocks';

/** Session-only identity and optimistic baseline shared by both manual MVU editors. */
export type MvuEditTarget = {
  chatKey: string;
  chatId: string;
  messageId: number;
  swipeId: number;
  message: object;
  baseline: Record<string, any>;
};

function context() {
  return (window.parent as any).SillyTavern.getContext();
}
function chatKey(ctx = context()): string {
  return JSON.stringify([ctx.getCurrentChatId(), ctx.groupId ?? '', ctx.characters[ctx.characterId]?.avatar ?? '']);
}
export function targetDescription(target: MvuEditTarget): string {
  return `聊天 ${target.chatId} · 楼层 ${target.messageId} · 消息页 ${target.swipeId + 1}`;
}
export function assertEditIdentity(target: MvuEditTarget) {
  const ctx = context();
  if (chatKey(ctx) !== target.chatKey || getLastMessageId() !== target.messageId ||
    ctx.chat[target.messageId] !== target.message || (ctx.chat[target.messageId]?.swipe_id ?? 0) !== target.swipeId) {
    throw new Error('聊天、最后楼层或消息页已变化，已停止操作。草稿 / 预览仍保留；请导出备份后重新加载目标。');
  }
}
export function assertEditBaseline(target: MvuEditTarget): Mvu.MvuData {
  assertEditIdentity(target);
  const data = Mvu.getMvuData({ type: 'message', message_id: target.messageId });
  if (!isEqual(data.stat_data ?? {}, target.baseline)) {
    throw new Error('目标变量已被外部更新，已禁止旧快照覆盖。草稿 / 预览仍保留；请导出备份并重新加载比较。');
  }
  return data;
}
export async function captureEditTarget(): Promise<MvuEditTarget> {
  const ctx = context();
  const messageId = getLastMessageId();
  const message = ctx.chat[messageId];
  if (!message) throw new Error('当前没有可编辑的消息，请先选择聊天并生成消息。');
  const target = markRaw({ chatKey: chatKey(ctx), chatId: String(ctx.getCurrentChatId()), messageId,
    swipeId: message.swipe_id ?? 0, message, baseline: {} as Record<string, any> });
  await waitGlobalInitialized('Mvu');
  assertEditIdentity(target);
  const data = Mvu.getMvuData({ type: 'message', message_id: messageId });
  if (data.stat_data !== undefined && !isPlainObject(data.stat_data)) throw new Error('目标 stat_data 不是 JSON 对象，无法安全编辑。');
  target.baseline = cloneDeep(data.stat_data ?? {});
  return target;
}

/** Checks again after every asynchronous boundary; never redirects to the new last message. */
export async function saveEditTarget(target: MvuEditTarget, value: Record<string, any>): Promise<MvuEditTarget> {
  if (!isPlainObject(value)) throw new Error('变量数据必须是 JSON 对象，不能是数组、null 或标量。');
  const draft = cloneDeep(value);
  assertEditIdentity(target);
  await waitGlobalInitialized('Mvu');
  const { previous, next } = await withTargetLocks([`message:${target.chatKey}:${target.messageId}:${target.swipeId}`], async () => {
    const previous = cloneDeep(assertEditBaseline(target));
    const next = { ...cloneDeep(previous), stat_data: draft };
    try {
      await Mvu.replaceMvuData(next, { type: 'message', message_id: target.messageId });
    } catch (cause) {
      throw new Error(`保存未能确认完成，可能已有部分写入。草稿 / 预览仍保留，请重新加载核对后再操作。${cause instanceof Error ? cause.message : String(cause)}`);
    }
    try {
      assertEditIdentity(target);
      if (!isEqual(Mvu.getMvuData({ type: 'message', message_id: target.messageId }).stat_data, next.stat_data)) {
        throw new Error('保存后的数据与提交内容不同');
      }
    } catch (cause) {
      throw new Error(`写入已发出，但完成确认失败。请核对原目标，禁止直接覆盖重试；草稿 / 预览仍保留。${cause instanceof Error ? cause.message : String(cause)}`);
    }
    return { previous, next };
  });
  // Notify outside the shared target lock: listeners may start their own target writes.
  try {
    assertEditIdentity(target);
    if (!isEqual(Mvu.getMvuData({ type: 'message', message_id: target.messageId }).stat_data, next.stat_data)) {
      throw new Error('保存后的数据与提交内容不同');
    }
    await eventEmit('mag_variable_update_ended', cloneDeep(next), previous);
    assertEditIdentity(target);
    if (!isEqual(Mvu.getMvuData({ type: 'message', message_id: target.messageId }).stat_data, next.stat_data)) {
      throw new Error('保存通知期间目标变量已变化');
    }
  } catch (cause) {
    throw new Error(`写入已发出，但完成确认失败。请核对原目标，禁止直接覆盖重试；草稿 / 预览仍保留。${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return markRaw({ ...target, baseline: cloneDeep(next.stat_data) });
}
