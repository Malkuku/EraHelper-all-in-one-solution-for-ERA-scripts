import { applyTaskRegex, TaskFailure } from '../TaskSchema';
import { GenerationContext, RawEntry, readNativeBook, TextMessage } from './GenerationHost';
import { substituteTaskMacros } from './TaskMacros';

type EjsApi = {
  prepareContext(env: Record<string, any>, end: number): Promise<Record<string, any>>;
  evalTemplate(code: string, context: Record<string, any>, options?: Record<string, any>): Promise<string>;
};
type Decorated = { entry: RawEntry; decorators: { name: string; argument: string }[] };
type LocalRegex = { pattern: string | RegExp; replace: any; options: Record<string, any> };
const known = new Set(['@@activate', '@@dont_activate', '@@message_formatting', '@@generate_before', '@@generate_after', '@@render_before', '@@render_after', '@@dont_preload', '@@initial_variables', '@@always_enabled', '@@only_preload', '@@iframe', '@@preprocessing', '@@if', '@@private']);
export function parseDecorators(entry: RawEntry): Decorated {
  const decorators: Decorated['decorators'] = [];
  const lines = entry.content.split('\n');
  let count = 0;
  for (const line of lines) {
    const match = line.match(/^(@@\w+)(?:\s+(.*))?$/);
    if (!match || !known.has(match[1])) break;
    decorators.push({ name: match[1], argument: match[2] ?? '' }); count++;
  }
  entry.content = lines.slice(count).join('\n');
  entry.decorators = decorators.map(item => item.argument ? `${item.name} ${item.argument}` : item.name);
  return { entry, decorators };
}
export class TaskTemplate {
  private env: Record<string, any> = {};
  private api?: EjsApi;
  private decorated: Decorated[];
  private activated = new Map<string, RawEntry>();
  private injected = new Map<string, Map<string, { prompt: string; order: number }>>();
  private regexes: LocalRegex[] = [];
  private generateBefore = '';
  setAuthorNotePartitions(before: string[], after: string[]) {
    this.env.authorNoteWorldInfo = { before: [...before], after: [...after] };
  }
  constructor(private context: GenerationContext) {
    this.decorated = context.candidates.map(parseDecorators);
    this.api = (window.parent as any).EjsTemplate;
  }
  async initialize() {
    const env = { runID: this.context.runId, runType: 'generate', generateType: 'normal', isDryRun: false,
      message_id: undefined, swipe_id: undefined, generateData: this.context.messages, model: this.context.link.model };
    this.env = this.api ? await this.api.prepareContext(env, this.context.identity.messageId) : env;
    const getPreset = async (name: string | RegExp, data: Record<string, any> = {}) => {
      const prompt = this.context.preset.prompts.find(item => item.name === name || item.name.match(name));
      return prompt?.content ? this.render(prompt.content, { ...data, prompt_name: name }) : '';
    };
    const getwi = async (worldOrEntry: string, entryOrData: string | number | RegExp | Record<string, any> = {}, data: Record<string, any> = {}) => {
      const explicit = typeof entryOrData !== 'object' || entryOrData instanceof RegExp;
      const world = explicit ? worldOrEntry : this.env.world_info?.world || this.context.ctx.characters[this.context.ctx.characterId as any]?.data?.extensions?.world || this.context.ctx.chatMetadata.world_info;
      const selector = explicit ? entryOrData : worldOrEntry;
      const entries = await readNativeBook(world);
      const entry = entries.find(item => item.comment === selector || item.uid === selector || (typeof selector !== 'number' && item.comment.match(selector as string | RegExp)));
      if (!entry) return '';
      return this.render(entry.content, { ...(explicit ? data : entryOrData), world_info: entry });
    };
    Object.assign(this.env, {
      getprp: getPreset, getpreset: getPreset, getPresetPrompt: getPreset, getPreset,
      getPresets: () => structuredClone(this.context.preset),
      getwi, getWorldInfo: getwi,
      getEnabledWorldInfoEntries: async () => this.context.candidates,
      getEnabledLoreBooks: () => [...new Set(this.context.candidates.map(entry => entry.world))],
      getWorldInfoActivatedData: () => [...this.activated.values()],
      activateWorldInfo: this.activate.bind(this), activewi: this.activate.bind(this),
      activateWorldInfoByKeywords: (text: string) => this.context.candidates.filter(entry => this.matches(entry, text)).forEach(entry => this.activated.set(`${entry.world}.${entry.uid}`, entry)),
      selectActivatedEntries: (entries: RawEntry[], text: string | string[], condition: { constant?: boolean; disabled?: boolean; vectorized?: boolean } = {}) => this.select(entries, Array.isArray(text) ? text.join('\n\n') : text, condition),
      injectPrompt: (key: string, prompt: string, order = 100, _sticky = 0, uid = prompt) => {
        if (!this.injected.has(key)) this.injected.set(key, new Map());
        this.injected.get(key)!.set(uid, { prompt, order });
      },
      getPromptsInjected: (key: string, postprocess: { search: string | RegExp; replace: string }[] = []) => {
        let text = [...(this.injected.get(key)?.values() ?? [])].sort((a, b) => a.order - b.order).map(item => item.prompt).join('\n');
        for (const rule of postprocess) text = text.replace(rule.search, rule.replace);
        return text;
      },
      hasPromptsInjected: (key: string) => this.injected.has(key),
      activateRegex: (pattern: string | RegExp, replace: any, options: Record<string, any> = {}) => {
        const rule = { pattern, replace, options };
        if (options.uuid) this.regexes = this.regexes.filter(item => item.options.uuid !== options.uuid);
        this.regexes.push(rule);
      },
    });
    this.generateBefore = await this.special('[GENERATE:BEFORE]', '@@generate_before', '', '');
  }
  async render(text: string, data: Record<string, any> = {}): Promise<string> {
    this.context.controller.signal.throwIfAborted();
    const input = substituteTaskMacros(this.context.ctx, text);
    if (!input.includes('<%')) return input;
    if (!this.api) throw new TaskFailure('unsupported_host', 'EJS 模板需要 ST-Prompt-Template 的公开渲染接口', 'template');
    const previous = Object.keys(data).map(key => [key, Object.prototype.hasOwnProperty.call(this.env, key), this.env[key]] as const);
    Object.assign(this.env, data);
    try {
      const output = await this.api.evalTemplate(input, this.env, { cache: false, filename: `kat-task/${this.context.runId}/${this.context.task.id}` });
      this.context.controller.signal.throwIfAborted();
      return substituteTaskMacros(this.context.ctx, String(output));
    } finally {
      for (const [key, existed, value] of previous) { if (existed) this.env[key] = value; else delete this.env[key]; }
    }
  }
  private keyMatch(haystack: string, key: string, entry: RawEntry): boolean {
    const needle = substituteTaskMacros(this.context.ctx, key).trim();
    if (!needle) return false;
    if (needle.startsWith('/')) {
      const last = needle.lastIndexOf('/');
      if (last > 0) { try { return new RegExp(needle.slice(1, last), needle.slice(last + 1)).test(haystack); } catch { /* Treat non-regex keys as literal, as upstream. */ } }
    }
    const caseSensitive = entry.caseSensitive ?? this.context.task.scan.caseSensitive;
    const value = caseSensitive ? needle : needle.toLowerCase();
    const text = caseSensitive ? haystack : haystack.toLowerCase();
    return (entry.matchWholeWords ?? this.context.task.scan.matchWholeWords) && !/\s/.test(value)
      ? new RegExp(`(?:^|\\W)(${_.escapeRegExp(value)})(?:$|\\W)`).test(text) : text.includes(value);
  }
  private matches(entry: RawEntry, text: string): boolean {
    if (entry.constant) return true;
    if (entry.decorators.includes('@@activate')) return true;
    if (entry.decorators.includes('@@dont_activate') || entry.decorators.includes('@@only_preload')) return false;
    if (!entry.key.some(key => this.keyMatch(text, key, entry))) return false;
    if (!entry.selective || !entry.keysecondary.length) return true;
    const hits = entry.keysecondary.map(key => this.keyMatch(text, key, entry));
    switch (entry.selectiveLogic ?? 0) { case 0: return hits.some(Boolean); case 1: return !hits.every(Boolean); case 2: return !hits.some(Boolean); case 3: return hits.every(Boolean); default: return false; }
  }
  private select(entries: RawEntry[], text: string, condition: { constant?: boolean; disabled?: boolean; vectorized?: boolean } = {}): RawEntry[] {
    const eligible = entries.filter(entry => (condition.constant === undefined || entry.constant === condition.constant)
      && (condition.disabled === undefined || entry.disable === condition.disabled)
      && (condition.vectorized === undefined || (entry.vectorized ?? false) === condition.vectorized)
      && (!entry.useProbability || Math.floor(Math.random() * 100) + 1 <= entry.probability) && this.matches(entry, text));
    const groups = new Map<string, RawEntry[]>();
    for (const entry of eligible) if (entry.group) { const group = groups.get(entry.group) ?? []; group.push(entry); groups.set(entry.group, group); }
    const selected = eligible.filter(entry => !entry.group);
    for (const group of groups.values()) {
      if (group.some(entry => entry.groupOverride)) {
        const top = Math.min(...group.map(entry => entry.order));
        if (top) { selected.push(group.find(entry => entry.order <= top)!); continue; }
      }
      if (group.some(entry => entry.useGroupScoring ?? this.context.task.scan.useGroupScoring)) {
        const scores = group.map(entry => this.score(entry, text));
        const top = Math.max(...scores);
        if (top) { selected.push(group[scores.findIndex(score => score >= top)]); continue; }
      }
      if (group.some(entry => !entry.groupOverride && !entry.useGroupScoring)) {
        let roll = Math.floor(Math.random() * group.reduce((sum, entry) => sum + (entry.groupWeight ?? 100), 0)) + 1;
        const winner = group.find(entry => (roll -= entry.groupWeight ?? 100) <= 0);
        if (winner) selected.push(winner);
      }
    }
    const top = Math.max(...selected.map(entry => entry.position === 4 ? entry.depth : 0));
    // No automatic author's-note metadata exists in a task. Upstream falls through
    // to relative-to-history offsets when note_position is undefined.
    const offsets: Record<number, number> = { 0: 4, 1: 3, 5: 2, 6: 1, 2: 1, 3: -1 };
    const depth = (entry: RawEntry) => offsets[entry.position] === undefined ? entry.depth ?? 4 : top + offsets[entry.position];
    return selected.sort((a, b) => depth(b) - depth(a) || a.order - b.order || b.uid - a.uid);
  }
  private score(entry: RawEntry, text: string) {
    if (!entry.key.length) return 0;
    const primary = entry.key.filter(key => this.keyMatch(text, key, entry)).length;
    const secondary = entry.keysecondary.filter(key => this.keyMatch(text, key, entry)).length;
    if (entry.keysecondary.length && (entry.selectiveLogic === 0 || (entry.selectiveLogic === 3 && secondary === entry.keysecondary.length))) return primary + secondary;
    return primary;
  }
  private async activate(worldOrEntry: string | number | RegExp, selector?: string | number | RegExp | boolean, force = false) {
    const entries = typeof selector === 'boolean' || selector === undefined ? this.context.candidates : this.context.candidates.filter(entry => entry.world === worldOrEntry);
    const key = typeof selector === 'boolean' || selector === undefined ? worldOrEntry : selector;
    const entry = entries.find(item => item.uid === key || item.comment === key || (typeof key !== 'number' && item.comment.match(key)));
    if (!entry) return null;
    const copy = structuredClone(entry);
    if (force || selector === true) Object.assign(copy, { constant: true, cooldown: 0, delay: 0, ignoreBudget: true, group: '', delayUntilRecursion: false, vectorized: false, triggers: [] });
    this.activated.set(`${copy.world}.${copy.uid}`, copy);
    return copy;
  }
  private async condition(item: Decorated) {
    const condition = item.decorators.find(decorator => decorator.name === '@@if');
    return !condition || (await this.render(`<%- !!(${condition.argument}) %>`, { world_info: item.entry })) !== 'false';
  }
  private isSpecial(item: Decorated) {
    return /\[GENERATE:|\[RENDER:|@INJECT|\[InitialVariables\]/.test(item.entry.comment)
      || item.decorators.some(decorator => ['@@generate_before', '@@generate_after', '@@render_before', '@@render_after', '@@initial_variables', '@@only_preload'].includes(decorator.name));
  }
  async preprocess(): Promise<RawEntry[]> {
    const ordinary: RawEntry[] = [];
    for (const item of this.decorated) {
      if (this.isSpecial(item) || !(await this.condition(item))) continue;
      const entry = item.entry;
      if (item.decorators.some(decorator => decorator.name === '@@preprocessing') || entry.comment.includes('[Preprocessing]')) {
        entry.content = await this.render(entry.content, { world_info: entry });
        const keys: string[] = [];
        const secondary: string[] = [];
        for (const key of entry.key) keys.push(await this.render(key, { world_info: entry }));
        for (const key of entry.keysecondary) secondary.push(await this.render(key, { world_info: entry }));
        entry.key = keys; entry.keysecondary = secondary;
      } else if (item.decorators.some(decorator => decorator.name === '@@private')) entry.content = `<% (()=>{%>${entry.content}<%})(); %>`;
      if (item.decorators.some(decorator => decorator.name === '@@dont_activate')) entry.decorators = ['@@dont_activate'];
      else if (item.decorators.some(decorator => decorator.name === '@@activate')) entry.decorators = ['@@activate'];
      ordinary.push(entry);
    }
    for (const entry of this.activated.values()) {
      const index = ordinary.findIndex(item => item.uid === entry.uid && item.world === entry.world);
      if (index >= 0) ordinary[index] = entry; else ordinary.push(entry);
    }
    return ordinary;
  }
  private async special(comment: string, decorator: string, content: string, buffer: string) {
    const items = this.decorated.filter(item => item.entry.comment.startsWith(comment) || item.decorators.some(value => `${value.name}${value.argument ? ` ${value.argument}` : ''}` === decorator));
    let result = '';
    for (const entry of this.select(items.filter(item => !item.decorators.some(value => value.name === '@@only_preload')).map(item => item.entry), content, { vectorized: false })) {
      const item = items.find(value => value.entry === entry)!;
      if (await this.condition(item)) result += await this.render(this.applyLocalRegex(entry.content, 'system', true), { world_info: entry, generateBuffer: buffer });
    }
    return result;
  }
  private applyLocalRegex(text: string, role: TextMessage['role'], worldinfo = false) {
    for (const rule of [...this.regexes].sort((a, b) => (a.options.order ?? 100) - (b.options.order ?? 100))) {
      if (rule.options[role] === false || (worldinfo && rule.options.worldinfo === false)) continue;
      const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
      text = text.replace(pattern, rule.replace);
    }
    return text;
  }
  async finalize(messages: TextMessage[], outlets: Record<string, string[]>): Promise<TextMessage[]> {
    this.env.generateData = messages;
    this.env.outlets = outlets;
    this.env.outlet = (name: string) => (outlets[name] ?? []).join('\n');
    let buffer = this.generateBefore;
    for (const [index, message] of messages.entries()) {
      const before = await this.special(`[GENERATE:${index}:BEFORE]`, `@@generate_before ${index}`, '', buffer);
      const text = await this.render(this.applyLocalRegex(applyTaskRegex(message.content, this.context.task, 'prompt'), message.role));
      const after = await this.special(`[GENERATE:${index}:AFTER]`, `@@generate_after ${index}`, text, buffer + before + text);
      message.content = before + text + after;
      buffer += message.content;
    }
    const after = await this.special('[GENERATE:AFTER]', '@@generate_after', buffer, this.generateBefore + buffer);
    messages[0].content = this.generateBefore + messages[0].content;
    messages[messages.length - 1].content += after;
    return this.injectMessages(messages);
  }
  private async injectMessages(messages: TextMessage[]): Promise<TextMessage[]> {
    const instructions: { item: Decorated; position: number; message: TextMessage }[] = [];
    const regexInstructions: { item: Decorated; regex: RegExp; at: string; message: TextMessage }[] = [];
    for (const item of this.decorated.filter(value => value.entry.comment.startsWith('@INJECT'))) {
      if (item.decorators.some(value => value.name === '@@only_preload') || !(await this.condition(item))) continue;
      if (item.entry.useProbability && Math.floor(Math.random() * 100) + 1 > item.entry.probability) continue;
      const comment = item.entry.comment;
      const roleText = comment.match(/role=(\w+)/)?.[1] ?? 'system';
      const role = (['system', 'user', 'assistant'].includes(roleText) ? roleText : 'system') as TextMessage['role'];
      const content = await this.render(this.applyLocalRegex(item.entry.content, role, true), { world_info: item.entry });
      if (!content.trim()) continue;
      const message = { role, content };
      const pos = comment.match(/pos=(\d+)/);
      const target = comment.match(/target=(\w+)/);
      const regex = comment.match(/regex=(?:"([^"]*)"|'([^']*)'|(\S+))/);
      const at = comment.match(/at=(before|after)/)?.[1] ?? 'before';
      if (pos) instructions.push({ item, position: Math.max(0, Number(pos[1]) - 1), message });
      else if (target) {
        const matches = messages.map((value, index) => ({ value, index })).filter(value => value.value.role === target[1]);
        const occurrence = Number(comment.match(/index=(-?\d+)/)?.[1] ?? 1);
        const found = matches[occurrence < 0 ? matches.length + occurrence : occurrence - 1];
        if (found) instructions.push({ item, position: found.index + (at === 'after' ? 1 : 0), message });
      } else if (regex) regexInstructions.push({ item, regex: new RegExp(regex[1] || regex[2] || regex[3]), at, message });
      else throw new TaskFailure('invalid_inject', `无效 @INJECT 指令: ${comment}`, 'template');
    }
    instructions.sort((a, b) => b.position - a.position || b.item.entry.order - a.item.entry.order);
    for (const instruction of instructions) messages.splice(instruction.position, 0, instruction.message);
    const queue = regexInstructions.map(instruction => ({ ...instruction, position: messages.findIndex(message => instruction.regex.test(message.content)) }))
      .filter(instruction => instruction.position >= 0).map(instruction => ({ ...instruction, position: instruction.position + (instruction.at === 'after' ? 1 : 0) }))
      .sort((a, b) => b.position - a.position || b.item.entry.order - a.item.entry.order);
    for (const instruction of queue) messages.splice(instruction.position, 0, instruction.message);
    return messages;
  }
}
