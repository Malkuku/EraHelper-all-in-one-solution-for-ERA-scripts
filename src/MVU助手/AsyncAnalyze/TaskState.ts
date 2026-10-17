import { MessageIdentity, TimedEffect, TimedState, assertMessage } from './generation/GenerationHost';
import { withTargetLocks } from '../utils/TargetLocks';
import { TaskFailure } from './TaskSchema';

type EffectRecord = { value: TimedEffect | null; settledFloor: number; sequence: number; ownerRunId: string };
export type TaskHistory = { lastSuccessfulFloor?: number; ownerRunId?: string; sequence?: number; effects: Record<string, EffectRecord> };
type StateRoot = Record<string, TaskHistory>;
export type StateUndo = { taskId: string; before: TaskHistory | undefined; after: TaskHistory; runId: string };
export class StateSaveFailure extends TaskFailure {
  constructor(message: string, public undo: StateUndo) { super('state_save_failed', message, 'commit'); }
}
const stateKey = () => `kat_async_task_state:${getScriptId()}`;
function readRoot(): StateRoot { return getVariables({ type: 'chat' })[stateKey()] ?? {}; }
export function stateSequenceHighWater(identity: MessageIdentity): number {
  assertMessage(identity);
  let highest = 0;
  for (const state of Object.values(readRoot())) {
    highest = Math.max(highest, state.sequence ?? 0);
    for (const effect of Object.values(state.effects)) highest = Math.max(highest, effect.sequence);
  }
  return highest;
}
export function readTaskHistory(taskId: string, identity: MessageIdentity): TaskHistory {
  assertMessage(identity);
  const root = readRoot();
  return structuredClone(Object.hasOwn(root, taskId) ? root[taskId] : { effects: {} });
}
export function timedSnapshot(history: TaskHistory): TimedState {
  const result: TimedState = { sticky: {}, cooldown: {} };
  for (const [key, record] of Object.entries(history.effects)) {
    const separator = key.indexOf(':');
    const type = key.slice(0, separator) as keyof TimedState;
    if (record.value && result[type]) result[type][key.slice(separator + 1)] = structuredClone(record.value);
  }
  return result;
}
export async function settleTaskState(taskId: string, identity: MessageIdentity, beforeScan: TimedState, afterScan: TimedState, runId: string, sequence: number): Promise<StateUndo> {
  return withTargetLocks([`state:${identity.chatKey}:${taskId}`], async () => {
    assertMessage(identity);
    const root = readRoot();
    const before = Object.hasOwn(root, taskId) ? structuredClone(root[taskId]) : undefined;
    const state = structuredClone(before ?? { effects: {} });
    const floor = identity.messageId;
    if (state.lastSuccessfulFloor === undefined || floor > state.lastSuccessfulFloor || (floor === state.lastSuccessfulFloor && sequence > (state.sequence ?? -1))) {
      state.lastSuccessfulFloor = floor; state.ownerRunId = runId; state.sequence = sequence;
    }
    for (const type of ['sticky', 'cooldown'] as const) {
      for (const key of new Set([...Object.keys(beforeScan[type]), ...Object.keys(afterScan[type])])) {
        if (_.isEqual(beforeScan[type][key], afterScan[type][key])) continue;
        const effectKey = `${type}:${key}`;
        const latest = state.effects[effectKey];
        if (!latest || floor > latest.settledFloor || (floor === latest.settledFloor && sequence > latest.sequence)) {
          state.effects[effectKey] = { value: afterScan[type][key] ?? null, settledFloor: floor, sequence, ownerRunId: runId };
        }
      }
    }
    try {
      await updateVariablesWith(current => ({ ...current, [stateKey()]: { ...(current[stateKey()] ?? {}), [taskId]: state } }), { type: 'chat' });
      assertMessage(identity);
    } catch (error) {
      const failure = new StateSaveFailure(error instanceof Error ? error.message : String(error), { taskId, before, after: state, runId });
      try {
        assertMessage(identity);
        const currentRoot = readRoot();
        const persisted = Object.hasOwn(currentRoot, taskId) ? currentRoot[taskId] : undefined;
        if (_.isEqual(persisted, state)) {
          try {
            await updateVariablesWith(current => {
              assertMessage(identity);
              const rootCopy = { ...(current[stateKey()] ?? {}) };
              if (!_.isEqual(rootCopy[taskId], state)) throw new Error('状态补偿前所有权已经变化');
              if (before) rootCopy[taskId] = before; else delete rootCopy[taskId];
              return { ...current, [stateKey()]: rootCopy };
            }, { type: 'chat' });
          } catch (compensationError) {
            const latestRoot = readRoot();
            const latest = Object.hasOwn(latestRoot, taskId) ? latestRoot[taskId] : undefined;
            if (!_.isEqual(latest, before)) failure.rollbackErrors.push(`任务状态补偿失败：${String(compensationError)}`);
          }
        } else if (!_.isEqual(persisted, before)) failure.rollbackErrors.push('任务状态写入确认失败且当前所有权不明确，未覆盖其他运行状态');
      } catch (compensationError) { failure.rollbackErrors.push(`任务状态无法补偿：${String(compensationError)}`); }
      throw failure;
    }
    return { taskId, before, after: state, runId };
  });
}
export async function rollbackTaskState(undo: StateUndo, identity: MessageIdentity) {
  await withTargetLocks([`state:${identity.chatKey}:${undo.taskId}`], async () => {
    assertMessage(identity);
    const root = readRoot();
    const state = structuredClone(Object.hasOwn(root, undo.taskId) ? root[undo.taskId] : { effects: {} });
    if (state.ownerRunId === undo.runId && state.sequence === undo.after.sequence) {
      state.lastSuccessfulFloor = undo.before?.lastSuccessfulFloor;
      state.ownerRunId = undo.before?.ownerRunId;
      state.sequence = undo.before?.sequence;
    }
    for (const [key, value] of Object.entries(undo.after.effects)) {
      if (value.ownerRunId !== undo.runId || !_.isEqual(state.effects[key], value)) continue;
      if (undo.before?.effects[key]) state.effects[key] = undo.before.effects[key]; else delete state.effects[key];
    }
    await updateVariablesWith(current => ({ ...current, [stateKey()]: { ...(current[stateKey()] ?? {}), [undo.taskId]: state } }), { type: 'chat' });
    assertMessage(identity);
  });
}
