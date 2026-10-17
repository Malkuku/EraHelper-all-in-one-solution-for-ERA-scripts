import { applyTaskRegex, TaskConfig, TaskFailure, TaskSettings } from '../TaskSchema';
import { NativePreset } from './NativePreset';
import { validateTaskReadiness } from '../TaskConfiguration';

export type RawEntry = {
  uid: number; world: string; comment: string; content: string; key: string[]; keysecondary: string[];
  disable: boolean; constant: boolean; selective: boolean; selectiveLogic: number; order: number; position: number;
  decorators: string[]; hash: number; [key: string]: any;
};
export type TextMessage = { role: 'system' | 'user' | 'assistant'; content: string; name?: string };
export type HostMessage = { mes: string; swipe_id?: number; name: string; is_user: boolean; is_system?: boolean; [key: string]: any };
export type HostContext = {
  chat: HostMessage[]; characters: any[]; characterId: string; groupId?: string; name1: string; name2: string;
  chatMetadata: Record<string, any>; tagMap?: Record<string, string[]>; tags?: { id: string; name: string }[];
  getCurrentChatId(): string; getRequestHeaders(): Record<string, string>; substituteParams(text: string): string;
  loadWorldInfo(name: string): Promise<{ entries: Record<string, RawEntry> } | null>;
};
export type TimedEffect = { hash: number; start: number; end: number; protected: boolean };
export type TimedState = { sticky: Record<string, TimedEffect>; cooldown: Record<string, TimedEffect> };
export type MessageIdentity = { chatKey: string; chatId: string; messageId: number; swipeId: number; raw: HostMessage };
export function hostContext(): HostContext {
  return (window.parent as any).SillyTavern.getContext();
}
export function currentChatKey(ctx = hostContext()): string {
  const avatar = ctx.characters[ctx.characterId as any]?.avatar ?? '';
  return JSON.stringify([ctx.getCurrentChatId(), ctx.groupId ?? '', avatar]);
}
export function bindMessage(messageId: number): MessageIdentity {
  const ctx = hostContext();
  const raw = ctx.chat[messageId];
  if (!raw) throw new TaskFailure('missing_message', `楼层不存在: ${messageId}`, 'prepare');
  return { chatKey: currentChatKey(ctx), chatId: ctx.getCurrentChatId(), messageId, swipeId: raw.swipe_id ?? 0, raw };
}
export function assertMessage(identity: MessageIdentity, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const ctx = hostContext();
  if (currentChatKey(ctx) !== identity.chatKey || ctx.chat[identity.messageId] !== identity.raw || (identity.raw.swipe_id ?? 0) !== identity.swipeId) {
    throw new TaskFailure('target_changed', '聊天、消息或消息页已经变化，已禁止写入', 'commit');
  }
}
export async function readNativeBook(name: string): Promise<RawEntry[]> {
  const book = await hostContext().loadWorldInfo(name);
  if (!book?.entries) throw new TaskFailure('missing_worldbook', `世界书不存在: ${name}`, 'prepare');
  return Object.values(book.entries).map((entry: any) => ({ ...structuredClone(entry), world: name }));
}
export function entryHash(entry: RawEntry): number {
  const text = JSON.stringify({ ...entry, hash: undefined });
  let hash = 0;
  for (let index = 0; index < text.length; index++) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  return hash;
}
export async function collectCandidates(task: TaskConfig): Promise<RawEntry[]> {
  const entries = new Map<string, RawEntry>();
  for (const selection of task.candidateBooks) {
    for (const raw of await readNativeBook(selection.bookName)) {
      if (!selection.entryUids.includes(raw.uid) && !selection.nameRegexes.some(regex => new RegExp(regex.pattern, regex.flags).test(raw.comment))) continue;
      const entry = { ...raw, disable: false, decorators: [] as string[], content: applyTaskRegex(raw.content, task, 'worldinfo') };
      entry.hash = entryHash(entry);
      entries.set(`${entry.world}.${entry.uid}`, entry);
    }
  }
  return [...entries.values()].sort((a, b) => b.order - a.order);
}
export class TokenCounter {
  private cache = new Map<string, Promise<number>>();
  constructor(private model: string, private signal: AbortSignal, private ctx: HostContext) {}
  count = (text: string): Promise<number> => {
    if (!text) return Promise.resolve(0);
    let result = this.cache.get(text);
    if (!result) {
      result = this.fetchCount(text);
      this.cache.set(text, result);
    }
    return result;
  };
  private async fetchCount(text: string): Promise<number> {
    const url = new URL('/api/tokenizers/openai/encode', window.parent.location.origin);
    url.searchParams.set('model', this.model);
    const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: this.ctx.getRequestHeaders(), body: JSON.stringify({ text }), signal: this.signal });
    if (!response.ok) throw new TaskFailure('tokenizer_error', `分词后端 HTTP ${response.status}`, 'prepare');
    const result = await response.json();
    if (!Array.isArray(result.ids)) throw new TaskFailure('tokenizer_error', '分词后端缺少 ids', 'prepare');
    return result.ids.length;
  }
  async messages(messages: TextMessage[]): Promise<number> {
    const url = new URL('/api/tokenizers/openai/count', window.parent.location.origin);
    url.searchParams.set('model', this.model);
    const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: this.ctx.getRequestHeaders(), body: JSON.stringify(messages), signal: this.signal });
    if (!response.ok) throw new TaskFailure('tokenizer_error', `消息分词后端 HTTP ${response.status}`, 'prepare');
    const result = await response.json();
    if (typeof result.token_count !== 'number') throw new TaskFailure('tokenizer_error', '分词后端缺少 token_count', 'prepare');
    return Math.max(0, result.token_count - 2);
  }
}
export type GenerationContext = {
  runId: string; task: TaskConfig; identity: MessageIdentity; controller: AbortController; ctx: HostContext;
  preset: NativePreset; connection: TaskSettings['connections'][number]; link: TaskSettings['connections'][number]['links'][number]; secret: string;
  candidates: RawEntry[]; history: TextMessage[]; scanHistory: string[]; timedState: TimedState;
  tokenCounter: TokenCounter; messages: TextMessage[];
};
export async function createGenerationContext(
  runId: string, task: TaskConfig, settings: TaskSettings, identity: MessageIdentity,
  controller: AbortController, secret: string, timedState: TimedState,
): Promise<GenerationContext> {
  const { connection, link, preset } = validateTaskReadiness(settings, task);
  const ctx = hostContext();
  assertMessage(identity, controller.signal);
  const historyStart = Math.max(0, identity.messageId - task.historyDepth + 1);
  const rawHistory = task.historyDepth === 0 ? [] : ctx.chat.slice(historyStart, identity.messageId + 1);
  const history: TextMessage[] = rawHistory.map((message, index) => {
    const input = task.useTavernRegex
      ? formatAsTavernRegexedString(message.mes, message.is_user ? 'user_input' : 'ai_output', 'prompt', {
        depth: ctx.chat.length - 1 - (historyStart + index),
      })
      : message.mes;
    let content = applyTaskRegex(input, task, 'history').replace(/\r/g, '');
    const role = message.is_system ? 'system' : message.is_user ? 'user' : 'assistant';
    const namesBehavior = preset.names_behavior ?? 0;
    if (namesBehavior === 2 || (namesBehavior === 0 && ((ctx.groupId && !message.is_user) || (message.force_avatar && !message.is_user)))) content = `${message.name}: ${content}`;
    if (preset.wrap_in_quotes === true && role === 'user') content = `"${content}"`;
    return { role, content, ...(namesBehavior === 1 ? { name: message.name.replace(/[^a-zA-Z0-9_]/g, '_') } : {}) };
  });
  const scanHistory = rawHistory.map((message, index) => (task.scan.includeNames ? `${message.name}: ` : '') + history[index].content).reverse();
  const candidates = await collectCandidates(task);
  assertMessage(identity, controller.signal);
  return { runId, task, identity, controller, ctx, preset, connection: structuredClone(connection), link: structuredClone(link), secret, candidates, history, scanHistory,
    timedState: structuredClone(timedState), tokenCounter: new TokenCounter(link.model, controller.signal, ctx), messages: [] };
}
