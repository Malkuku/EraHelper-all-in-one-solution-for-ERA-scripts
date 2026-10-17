import { z } from 'zod';

const integer = z.number().int().nonnegative();
export const RegexSpecSchema = z.object({ pattern: z.string(), flags: z.string() }).superRefine((value, ctx) => {
  try { new RegExp(value.pattern, value.flags); } catch (error) {
    ctx.addIssue({ code: 'custom', message: String(error) });
  }
});
export type RegexSpec = z.infer<typeof RegexSpecSchema>;
export const ScanSchema = z.object({
  depth: integer.max(1000).default(2), minActivations: integer.default(0), minActivationDepthMax: integer.default(0),
  budgetPercent: z.number().min(0).max(100).default(25), budgetCap: integer.default(0),
  includeNames: z.boolean().default(true), recursive: z.boolean().default(false), caseSensitive: z.boolean().default(false),
  matchWholeWords: z.boolean().default(false), useGroupScoring: z.boolean().default(false), maxRecursionSteps: integer.default(0),
});
export type ScanSettings = z.infer<typeof ScanSchema>;
export const WriteSchema = z.object({
  id: z.string().min(1),
  target: z.discriminatedUnion('kind', [z.object({ kind: z.literal('message') }), z.object({
    kind: z.literal('worldbook'), bookName: z.string().min(1), entryUid: integer.optional(), entryName: z.string().min(1),
  })]),
  extract: z.array(RegexSpecSchema),
  operation: z.discriminatedUnion('kind', [z.object({ kind: z.literal('append') }), z.object({ kind: z.literal('replace'), regex: RegexSpecSchema })]),
});
export type WriteSpec = z.infer<typeof WriteSchema>;
export const INTERNAL_EVENTS = new Set(['kat_task_chain:result', 'kat_task_chain:rerun', 'kat_task_run:cancel']);
export const eventNameIsValid = (name: string) => name === '' || (name === name.trim() && !name.endsWith(':result') && !INTERNAL_EVENTS.has(name));
export const TaskSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), comment: z.string().default(''), enabled: z.boolean(),
  eventName: z.string().refine(eventNameIsValid, '事件名与内部结果频道冲突'), order: z.number().int().default(0),
  historyDepth: integer.default(2), triggerInterval: integer.min(1).default(1), retryCount: integer.default(0),
  prompt: z.string(), connectionId: z.string().min(1), presetId: z.string().min(1),
  candidateBooks: z.array(z.object({ bookName: z.string().min(1), entryUids: z.array(integer), nameRegexes: z.array(RegexSpecSchema) })),
  scan: ScanSchema,
  regexRules: z.array(RegexSpecSchema.safeExtend({
    id: z.string().min(1), stage: z.enum(['history', 'worldinfo', 'prompt', 'response']), replacement: z.string(), enabled: z.boolean(),
  })),
  output: z.discriminatedUnion('mode', [z.object({ mode: z.literal('return') }), z.object({ mode: z.literal('write'), writes: z.array(WriteSchema).min(1) })]),
}).superRefine((task, ctx) => {
  for (const [field, list] of [['regexRules', task.regexRules], ['writes', task.output.mode === 'write' ? task.output.writes : []]] as const) {
    const ids = list.map(item => item.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: field === 'writes' ? ['output', field] : [field], message: 'ID 重复' });
  }
});
export type TaskConfig = z.infer<typeof TaskSchema>;
export const ConfigSchema = z.object({
  schemaVersion: z.literal(1), activeGroupId: z.string().nullable(), automatic: z.object({ minReceivedChars: integer.default(300) }),
  groups: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), comment: z.string(), taskIds: z.array(z.string()) })),
  tasks: z.array(TaskSchema),
  connections: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), comment: z.string(), baseUrl: z.url().refine(value => {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  }, '连接仅支持无内嵌凭据的 HTTP/HTTPS 地址'), model: z.string().min(1), secretRef: z.string().min(1) })),
  presets: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), raw: z.record(z.string(), z.unknown()) })),
}).superRefine((config, ctx) => {
  for (const field of ['groups', 'tasks', 'connections', 'presets'] as const) {
    const ids = new Set<string>();
    config[field].forEach((entity, index) => {
      if (ids.has(entity.id)) ctx.addIssue({ code: 'custom', path: [field, index, 'id'], message: 'ID 重复' });
      ids.add(entity.id);
    });
  }
  const taskIds = new Set(config.tasks.map(task => task.id));
  config.groups.forEach((group, index) => {
    if (new Set(group.taskIds).size !== group.taskIds.length) ctx.addIssue({ code: 'custom', path: ['groups', index, 'taskIds'], message: '任务引用重复' });
    for (const id of group.taskIds) if (!taskIds.has(id)) ctx.addIssue({ code: 'custom', path: ['groups', index, 'taskIds'], message: `任务不存在: ${id}` });
  });
  if (config.activeGroupId !== null && !config.groups.some(group => group.id === config.activeGroupId)) {
    ctx.addIssue({ code: 'custom', path: ['activeGroupId'], message: '活动组不存在' });
  }
  config.tasks.forEach((task, index) => {
    for (const [field, collection] of [['connectionId', config.connections], ['presetId', config.presets]] as const) {
      if (!collection.some(entity => entity.id === task[field])) ctx.addIssue({ code: 'custom', path: ['tasks', index, field], message: '引用不存在' });
    }
  });
});
export type TaskSettings = z.infer<typeof ConfigSchema>;
export const emptySettings = (): TaskSettings => ({ schemaVersion: 1, activeGroupId: null, automatic: { minReceivedChars: 300 }, groups: [], tasks: [], connections: [], presets: [] });
export type Trigger = { kind: 'event' | 'sent' | 'received' | 'manual'; eventName?: string };
export type TaskError = { code: string; message: string; phase: 'prepare' | 'scan' | 'template' | 'request' | 'extract' | 'commit' | 'rollback' };
export type WriteResult = { writeId: string; target: string; status: 'committed' | 'failed' | 'rolled_back' | 'rollback_failed'; error?: string };
export type TaskResult = {
  taskId: string; taskName: string; status: 'succeeded' | 'failed' | 'cancelled' | 'skipped' | 'rolled_back' | 'rollback_failed';
  attempts: number; text?: string; error?: TaskError; writes: WriteResult[];
  reason?: { code: string; message: string; currentFloor?: number; lastSuccessfulFloor?: number };
};
export type RunResult = {
  version: 1; requestId: string; runId: string; activeRunId?: string; trigger: Trigger; chatId: string; messageId: number;
  status: 'succeeded' | 'partial' | 'failed' | 'cancelled' | 'busy' | 'skipped'; reason?: string; tasks: TaskResult[];
  warnings: { code: string; message: string; target?: string }[];
  rollback: { status: 'not_needed' | 'completed' | 'partial' | 'failed'; errors: string[] };
};
export type UnrecoveredJournal = {
  runId: string; taskId: string; chatId: string; messageId: number; swipeId: number;
  operations: Record<string, unknown>[]; stateUndo?: unknown; errors: string[];
};
export interface KatTaskAPI {
  version: 1;
  getConfig(): TaskSettings;
  setConfig(settings: unknown): Promise<void>;
  setSecret(reference: string, value: string): void;
  deleteSecret(reference: string): void;
  run(options: { messageId: number; eventName?: string; requestId?: string }): Promise<RunResult>;
  cancel(runId: string): boolean;
  getActiveRuns(): { runId: string; requestId: string; trigger: Trigger; chatId: string; messageId: number }[];
  getUnrecoveredJournals(): UnrecoveredJournal[];
}
export class TaskFailure extends Error {
  rollbackErrors: string[] = [];
  constructor(public code: string, message: string, public phase: TaskError['phase']) { super(message); this.name = 'TaskFailure'; }
}
export function applyTaskRegex(text: string, task: TaskConfig, stage: TaskConfig['regexRules'][number]['stage']): string {
  return task.regexRules.filter(rule => rule.enabled && rule.stage === stage)
    .reduce((value, rule) => value.replace(new RegExp(rule.pattern, rule.flags), rule.replacement), text);
}
