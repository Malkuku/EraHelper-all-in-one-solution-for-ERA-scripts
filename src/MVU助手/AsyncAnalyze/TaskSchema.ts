import { z } from 'zod';

const integer = z.number().int().nonnegative();
export const RegexSpecSchema = z.object({ pattern: z.string(), flags: z.string() });
export type RegexSpec = z.infer<typeof RegexSpecSchema>;
/** Accept a plain expression or a complete /expression/flags literal in one field. */
export function parseRegexInput(value: string): RegexSpec {
  const literal = value.match(/^\/(.*)\/([a-z]*)$/s);
  return { pattern: literal ? literal[1] : value, flags: literal ? literal[2] : '' };
}
export function formatRegexInput(spec: RegexSpec): string {
  return spec.flags ? `/${spec.pattern}/${spec.flags}` : spec.pattern;
}
export const RegexPresetSchema = RegexSpecSchema.safeExtend({
  id: z.string().min(1),
  name: z.string(),
  replacement: z.string().default(''),
});
export type RegexPreset = z.infer<typeof RegexPresetSchema>;
/** Flags control one/all matches, shared by the runtime and tester. */
export function matchTaskRegex(text: string, spec: RegexSpec): RegExpMatchArray[] {
  const regex = new RegExp(spec.pattern, spec.flags);
  return regex.global
    ? [...text.matchAll(regex)]
    : [text.match(regex)].filter((match): match is RegExpMatchArray => match !== null);
}
/** Import saved expressions only; retired task/API configuration is never converted. */
export function parseRegexPresets(value: unknown): RegexPreset[] {
  if (!Array.isArray(value)) throw new Error('正则库必须是数组');
  return value.map(item => {
    if (!item || typeof item !== 'object') throw new Error('正则配置格式无效');
    let { pattern, flags } = item;
    if (typeof item.regex === 'string') {
      ({ pattern, flags } = parseRegexInput(item.regex));
    }
    return RegexPresetSchema.parse({ ...item, id: item.id || crypto.randomUUID(), pattern, flags: flags ?? '' });
  });
}
export const ScanSchema = z.object({
  depth: integer.max(1000).default(2), minActivations: integer.default(0), minActivationDepthMax: integer.default(0),
  budgetPercent: z.number().min(0).max(100).default(25), budgetCap: integer.default(0),
  includeNames: z.boolean().default(true), recursive: z.boolean().default(false), caseSensitive: z.boolean().default(false),
  matchWholeWords: z.boolean().default(false), useGroupScoring: z.boolean().default(false), maxRecursionSteps: integer.default(0),
});
export type ScanSettings = z.infer<typeof ScanSchema>;
export const TextWriteSchema = z.object({
  id: z.string().min(1),
  target: z.discriminatedUnion('kind', [z.object({ kind: z.literal('message') }), z.object({
    kind: z.literal('worldbook'), bookName: z.string(), entryUid: integer.optional(), entryName: z.string(),
  })]),
  extract: z.array(RegexSpecSchema),
  operation: z.discriminatedUnion('kind', [z.object({ kind: z.literal('append') }), z.object({ kind: z.literal('replace'), regex: RegexSpecSchema })]),
});
export type TextWriteSpec = z.infer<typeof TextWriteSchema>;
export const EventWriteSchema = z.object({
  id: z.string().min(1), target: z.object({ kind: z.literal('event') }), extract: z.array(RegexSpecSchema),
});
export const eventOutputChannel = (eventName: string) => `${eventName}:output`;
export const WriteSchema = z.union([TextWriteSchema, EventWriteSchema]);
export type WriteSpec = z.infer<typeof WriteSchema>;
export type EventWritePayload = {
  version: 1; scriptId: string; runId: string; requestId: string; taskId: string; writeId: string;
  chatId: string; messageId: number; swipeId: number; text: string;
};
export const INTERNAL_EVENTS = new Set(['kat_task_chain:result', 'kat_task_chain:rerun', 'kat_task_run:cancel']);
export const eventNameIsValid = (name: string) => name === '' || (name === name.trim() && !name.endsWith(':result') && !INTERNAL_EVENTS.has(name)
  && !(typeof tavern_events !== 'undefined' && Object.values(tavern_events).includes(name as never))
  && !(typeof iframe_events !== 'undefined' && Object.values(iframe_events).includes(name as never))
  && !['mag_variable_update_started', 'mag_variable_update_ended'].includes(name));
export const TaskSchema = z.object({
  id: z.string().min(1), name: z.string(), comment: z.string().default(''), enabled: z.boolean(),
  eventName: z.string(), order: z.number().int().default(0),
  historyDepth: integer.default(2), triggerInterval: integer.min(1).default(1), retryCount: integer.default(0),
  useTavernRegex: z.boolean().default(true),
  prompt: z.string(), connectionId: z.string(),
  /** 扫描候选按条目名称选择；同名条目会一并进入候选池。 */
  candidateBooks: z.array(z.object({ bookName: z.string(), entryNames: z.array(z.string()).default([]), nameRegexes: z.array(RegexSpecSchema) })),
  scan: ScanSchema,
  regexRules: z.array(RegexSpecSchema.safeExtend({
    id: z.string().min(1), stage: z.enum(['history', 'worldinfo', 'prompt', 'response']), replacement: z.string(), enabled: z.boolean(),
  })),
  output: z.object({ writes: z.array(WriteSchema) }),
}).superRefine((task, ctx) => {
  for (const [field, list] of [['regexRules', task.regexRules], ['writes', task.output.writes]] as const) {
    const ids = list.map(item => item.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: field === 'writes' ? ['output', field] : [field], message: 'ID 重复' });
  }
});
export type TaskConfig = z.infer<typeof TaskSchema>;
export const ApiLinkSchema = z.object({ id: z.string().min(1), name: z.string(), baseUrl: z.string(), model: z.string(), secretRef: z.string().min(1) });
export type ApiLink = z.infer<typeof ApiLinkSchema>;
export const ConfigSchema = z.object({
  schemaVersion: z.literal(5), activeGroupId: z.string().nullable(), automatic: z.object({ minReceivedChars: integer.default(300) }),
  groups: z.array(z.object({ id: z.string().min(1), name: z.string(), comment: z.string(), taskIds: z.array(z.string()) })),
  tasks: z.array(TaskSchema),
  regexPresets: z.array(RegexPresetSchema).default([]),
  connections: z.array(z.object({ id: z.string().min(1), name: z.string(), comment: z.string(), presetId: z.string().min(1).nullable(), activeLinkId: z.string().nullable(), links: z.array(ApiLinkSchema) })),
  presets: z.array(z.object({ id: z.string().min(1), name: z.string(), raw: z.record(z.string(), z.unknown()).refine(raw => z.json().safeParse(raw).success, '预设必须为 JSON 对象') })),
}).superRefine((config, ctx) => {
  for (const field of ['groups', 'tasks', 'connections', 'presets', 'regexPresets'] as const) {
    const ids = new Set<string>();
    config[field].forEach((entity, index) => {
      if (ids.has(entity.id)) ctx.addIssue({ code: 'custom', path: [field, index, 'id'], message: 'ID 重复' });
      ids.add(entity.id);
    });
  }
  config.connections.forEach((connection, index) => {
    if (new Set(connection.links.map(link => link.id)).size !== connection.links.length)
      ctx.addIssue({ code: 'custom', path: ['connections', index, 'links'], message: '链接 ID 重复' });
  });
  const taskIds = new Set(config.tasks.map(task => task.id));
  config.groups.forEach((group, index) => {
    if (new Set(group.taskIds).size !== group.taskIds.length) ctx.addIssue({ code: 'custom', path: ['groups', index, 'taskIds'], message: '任务引用重复' });
    for (const id of group.taskIds) if (!taskIds.has(id)) ctx.addIssue({ code: 'custom', path: ['groups', index, 'taskIds'], message: `任务不存在: ${id}` });
  });
  if (config.activeGroupId !== null && !config.groups.some(group => group.id === config.activeGroupId)) {
    ctx.addIssue({ code: 'custom', path: ['activeGroupId'], message: '活动组不存在' });
  }
});
export type TaskSettings = z.infer<typeof ConfigSchema>;
export const emptySettings = (): TaskSettings => ({ schemaVersion: 5, activeGroupId: null, automatic: { minReceivedChars: 300 }, groups: [], tasks: [], connections: [], presets: [], regexPresets: [] });
/** Upgrade persisted v1–v4 at this sole boundary; v5 is the internal model. */
export function parseTaskSettings(value: unknown): TaskSettings {
  const version = value && typeof value === 'object' ? (value as { schemaVersion?: unknown }).schemaVersion : undefined;
  const upgradeOutputs = (config: Record<string, unknown>) => ConfigSchema.parse({ ...config, schemaVersion: 5,
    tasks: z.array(z.object({ output: z.discriminatedUnion('mode', [
      z.object({ mode: z.literal('return') }), z.object({ mode: z.literal('event_result') }),
      z.object({ mode: z.literal('write'), writes: z.array(WriteSchema) }),
    ]) }).passthrough()).parse(config.tasks).map(task => ({ ...task,
      output: { writes: task.output.mode === 'write' ? task.output.writes : [] },
    })),
  });
  if (version === 3) return upgradeOutputs(value as Record<string, unknown>);
  const upgradeLinks = (config: Record<string, unknown>) => {
    const connections = z.array(z.object({ id: z.string(), name: z.string(), baseUrl: z.string(), model: z.string(), secretRef: z.string().min(1) }).passthrough()).parse(config.connections);
    return upgradeOutputs({ ...config, connections: connections.map(({ baseUrl, model, secretRef, ...connection }) => ({
      ...connection, activeLinkId: connection.id + ':link', links: [{ id: connection.id + ':link', name: connection.name || '链接 1', baseUrl, model, secretRef }],
    })) });
  };
  if (version === 2) return upgradeLinks(value as Record<string, unknown>);
  // v4 的候选条目选择按 UID 保存，改按名称后不迁移，旧字段在解析时被丢弃。
  if (version === 4) return ConfigSchema.parse({ ...(value as Record<string, unknown>), schemaVersion: 5 });
  if (version !== 1) return ConfigSchema.parse(value);
  const old = z.object({
    schemaVersion: z.literal(1), tasks: z.array(z.object({ connectionId: z.string(), presetId: z.string().min(1) }).passthrough()),
    connections: z.array(z.object({ id: z.string(), name: z.string(), secretRef: z.string() }).passthrough()),
    presets: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  }).passthrough().parse(value);
  for (const list of [old.connections, old.presets])
    if (new Set(list.map(item => item.id)).size !== list.length) throw new Error('版本 1 配置 ID 重复');
  for (const task of old.tasks) {
    if (!old.connections.some(connection => connection.id === task.connectionId)) throw new Error(`旧任务引用的 API 不存在：${task.connectionId}`);
    if (!old.presets.some(preset => preset.id === task.presetId)) throw new Error(`旧任务引用的预设不存在：${task.presetId}`);
  }
  const usedIds = new Set(old.connections.map(item => item.id));
  const tasks = old.tasks.map(item => ({ ...item }));
  const connections = old.connections.flatMap((connection): (typeof connection & { presetId: string | null })[] => {
    const presetIds = [...new Set(old.tasks.filter(task => task.connectionId === connection.id).map(task => task.presetId))];
    if (!presetIds.length) return [{ ...connection, presetId: null }];
    return presetIds.map((presetId, index) => {
      let id = connection.id;
      if (index > 0) {
        const base = `${connection.id}:preset:${presetId}`;
        id = base;
        for (let suffix = 1; usedIds.has(id); suffix++) id = `${base}:${suffix}`;
        usedIds.add(id);
      }
      for (let i = 0; i < old.tasks.length; i++)
        if (old.tasks[i].connectionId === connection.id && old.tasks[i].presetId === presetId) tasks[i].connectionId = id;
      return { ...connection, id, presetId, name: index === 0 ? connection.name : `${connection.name} · ${old.presets.find(preset => preset.id === presetId)!.name}` };
    });
  });
  return upgradeLinks({ ...old, connections, tasks: tasks.map(({ presetId: _presetId, ...task }) => task) });
}
export type Trigger = { kind: 'event' | 'sent' | 'received' | 'manual' | 'task'; eventName?: string; taskId?: string };
export type RequestDiagnostic = {
  connectionName: string; model: string; endpoint: string; elapsedMs: number;
  httpStatus?: number; statusText?: string; backendCode?: string; backendType?: string; response?: string;
};
export type TaskError = { code: string; message: string; phase: 'prepare' | 'scan' | 'template' | 'request' | 'extract' | 'commit' | 'rollback'; details?: RequestDiagnostic };
export type WriteResult = { writeId: string; target: string; status: 'committed' | 'failed' | 'rolled_back' | 'rollback_failed' | 'pending' | 'delivered' | 'delivery_failed' | 'not_delivered'; error?: string };
export type TaskResult = {
  taskId: string; taskName: string; status: 'succeeded' | 'failed' | 'cancelled' | 'skipped' | 'rolled_back' | 'rollback_failed';
  attempts: number; text?: string; error?: TaskError; writes: WriteResult[];
  reason?: { code: string; message: string; currentFloor?: number; lastSuccessfulFloor?: number; lastTriggerFloor?: number };
};
export type RunResult = {
  version: 1; requestId: string; runId: string; activeRunId?: string; trigger: Trigger; chatId: string; messageId: number; swipeId?: number;
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
  run(options: { messageId: number; eventName?: string; requestId?: string; taskId?: string }): Promise<RunResult>;
  cancel(runId: string): boolean;
  getActiveRuns(): { runId: string; requestId: string; trigger: Trigger; chatId: string; messageId: number }[];
  getUnrecoveredJournals(): UnrecoveredJournal[];
}
export class TaskFailure extends Error {
  rollbackErrors: string[] = [];
  constructor(public code: string, message: string, public phase: TaskError['phase'], public details?: RequestDiagnostic) { super(message); this.name = 'TaskFailure'; }
}
export function applyTaskRegex(text: string, task: TaskConfig, stage: TaskConfig['regexRules'][number]['stage']): string {
  return task.regexRules.filter(rule => rule.enabled && rule.stage === stage)
    .reduce((value, rule) => value.replace(new RegExp(rule.pattern, rule.flags), rule.replacement), text);
}
