// Deterministic generation boundary checks. Real host/EJS behavior remains a separate environment gate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const jsLoader = require.extensions['.js'];
function compile(module, filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
}
require.extensions['.ts'] = compile;
require.extensions['.js'] = (module, filename) => filename.endsWith('NativeWorldInfo.js') ? compile(module, filename) : jsLoader(module, filename);
global._ = require('lodash');
const root = path.resolve(__dirname, '../../src/MVU助手/AsyncAnalyze');
const { TaskSchema, ConfigSchema, emptySettings } = require(path.join(root, 'TaskSchema.ts'));
const { createGenerationContext } = require(path.join(root, 'generation/GenerationHost.ts'));
const { generateTask } = require(path.join(root, 'generation/TaskGeneration.ts'));
const { scanWorldInfo } = require(path.join(root, 'generation/WorldInfoScanner.ts'));
const { TaskTemplate } = require(path.join(root, 'generation/TaskTemplate.ts'));
const { parseNativePreset } = require(path.join(root, 'generation/NativePreset.ts'));

function preset(label) { return { openai_max_context: 10000, openai_max_tokens: 300, temp_openai: label === 'A' ? 0.2 : 0.8,
  prompts: [{ identifier: 'main', name: 'main', role: 'system', content: `PRESET_${label}` },
    { identifier: 'worldInfoBefore', name: 'WI', role: 'system', marker: true }, { identifier: 'chatHistory', name: 'history', role: 'system', marker: true },
    { identifier: 'charDescription', name: 'character', role: 'system', marker: true }],
  prompt_order: [{ character_id: 100001, order: ['main', 'worldInfoBefore', 'charDescription', 'chatHistory'].map(identifier => ({ identifier, enabled: true })) }],
  extensions: { preserved: { anything: true } } }; }
function task(label) { return TaskSchema.parse({ id: label, name: label, enabled: true, eventName: '', historyDepth: 2, prompt: `TASK_${label}`, connectionId: label,
  candidateBooks: [{ bookName: label, entryUids: [1], nameRegexes: [] }], scan: {}, regexRules: [], output: { mode: 'return' } }); }
function entry(label, override = {}) { return { uid: 1, world: label, comment: label, content: `WORLD_${label}`, key: [], keysecondary: [], disable: true,
  constant: true, selective: true, selectiveLogic: 0, order: 100, position: 0, decorators: [], group: '', probability: 100, useProbability: true,
  hash: 1, ...override }; }
const host = { chat: [{ mes: 'SHARED_HISTORY', name: 'Player', is_user: true }], characterId: '0', characters: [{ avatar: 'Char.png', data: { description: 'CARD_SECRET', extensions: { world: 'A' } } }],
  name1: 'Player', name2: 'Char', chatMetadata: {}, getCurrentChatId: () => 'chat-1', getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'fixture' }), substituteParams: text => text,
  loadWorldInfo: async label => ({ entries: { 1: entry(label) } }) };
global.window = { parent: { location: { origin: 'https://host.invalid' }, SillyTavern: { getContext: () => host } } };
const identity = { chatKey: JSON.stringify(['chat-1', '', 'Char.png']), chatId: 'chat-1', messageId: 0, swipeId: 0, raw: host.chat[0] };
const settings = emptySettings();
for (const label of ['A', 'B']) { settings.tasks.push(task(label)); settings.connections.push({ id: label, name: label, comment: '', baseUrl: `https://${label}.invalid/v1`, model: label, secretRef: label, presetId: label }); settings.presets.push({ id: label, name: label, raw: preset(label) }); }
const tokenFetch = async (url, init) => {
  const body = JSON.parse(init.body);
  return { ok: true, json: async () => url.pathname.endsWith('/encode') ? { ids: Array.from({ length: body.text.length }) } : { token_count: JSON.stringify(body).length + 2 } };
};
async function main() {
  assert.equal(TaskSchema.parse({ ...task('A'), historyDepth: 0, scan: { depth: 0 } }).historyDepth, 0);
  assert.equal(TaskSchema.parse({ ...task('A'), eventName: 'loop:result' }).eventName, 'loop:result', 'unfinished event is editable; execution owns validity');
  assert.equal(ConfigSchema.parse({ ...settings, connections: [{ ...settings.connections[0], baseUrl: 'https://user:password@host.invalid' }] }).connections[0].baseUrl, 'https://user:password@host.invalid');
  let pending = [];
  const sent = [];
  global.fetch = async (input, init) => {
    const url = new URL(input);
    if (!url.pathname.endsWith('/generate')) return tokenFetch(url, init);
    const body = JSON.parse(init.body); sent.push(body);
    return new Promise(resolve => { pending.push(() => resolve({ ok: true, json: async () => ({ choices: [{ message: { content: `RESULT_${body.model}` } }] }) })); if (pending.length === 2) { const requests = pending; pending = []; requests.forEach(finish => finish()); } });
  };
  const a = await createGenerationContext('run-A', settings.tasks[0], settings, identity, new AbortController(), 'secret-A', { sticky: {}, cooldown: {} });
  const b = await createGenerationContext('run-B', settings.tasks[1], settings, identity, new AbortController(), 'secret-B', { sticky: {}, cooldown: {} });
  const results = await Promise.all([generateTask(a), generateTask(b)]);
  assert.deepEqual(results, ['RESULT_A', 'RESULT_B']);
  for (const label of ['A', 'B']) {
    const body = sent.find(value => value.model === label);
    const text = JSON.stringify(body.messages);
    assert(text.includes(`PRESET_${label}`) && text.includes(`WORLD_${label}`) && text.includes(`TASK_${label}`));
    assert(!text.includes(`PRESET_${label === 'A' ? 'B' : 'A'}`) && !text.includes('CARD_SECRET'));
    assert.equal(JSON.parse(body.custom_include_headers).Authorization, `Bearer secret-${label}`);
    assert.equal(body.temperature, label === 'A' ? 0.2 : 0.8);
  }
  assert.equal(host.chat[0].mes, 'SHARED_HISTORY');
  assert.equal((await host.loadWorldInfo('A')).entries[1].disable, true);
  const rebound = structuredClone(settings);
  rebound.connections[0].presetId = 'B';
  const sharedTasks = [settings.tasks[0], TaskSchema.parse({ ...settings.tasks[0], id: 'same-api' })];
  for (const sharedTask of sharedTasks) {
    const context = await createGenerationContext('rebound', sharedTask, rebound, identity, new AbortController(), '', { sticky: {}, cooldown: {} });
    assert.equal(context.preset.temp_openai, 0.8, 'all API consumers use its changed preset binding');
    assert.equal(context.connection.model, 'A', 'changing preset preserves the selected API/model');
  }
  assert.equal(a.preset.temp_openai, 0.2, 'already prepared runs keep their captured preset');
  for (const presetId of [null, 'absent']) {
    const invalid = structuredClone(settings); invalid.connections[0].presetId = presetId;
    await assert.rejects(createGenerationContext('missing', settings.tasks[0], invalid, identity, new AbortController(), '', { sticky: {}, cooldown: {} }), error => error.code === 'missing_config' && error.phase === 'prepare');
  }
  global.fetch = (url, init) => tokenFetch(new URL(url), init);
  const c = await createGenerationContext('scan', settings.tasks[0], settings, identity, new AbortController(), '', { sticky: {}, cooldown: {} });
  const unmatched = entry('A', { disable: false, constant: false, key: ['NOT_IN_HISTORY'] });
  assert.equal((await scanWorldInfo(c, [unmatched])).allActivatedEntries.size, 0);
  c.task.scan.recursive = true;
  const recursion = await scanWorldInfo(c, [entry('A', { disable: false, content: 'KEY_SECOND' }), entry('A', { uid: 2, hash: 2, disable: false, constant: false, key: ['KEY_SECOND'], content: 'RECURSIVE_RESULT' })]);
  assert.equal(recursion.allActivatedEntries.size, 2);
  c.task.scan.depth = 0;
  assert.equal((await scanWorldInfo(c, [entry('A', { disable: false, constant: false, key: ['SHARED_HISTORY'] })])).allActivatedEntries.size, 0);
  c.task.scan.depth = 2;
  assert.equal((await scanWorldInfo(c, [entry('A', { disable: false, constant: false, key: ['SHARED_HISTORY'] })])).allActivatedEntries.size, 1);
  c.identity.messageId = 5;
  const timing = await scanWorldInfo(c, [entry('A', { disable: false, sticky: 2, cooldown: 4 })]);
  assert.equal(timing.timedState.sticky['A.1'].start, 6);
  assert.equal(timing.timedState.sticky['A.1'].end, 8);
  // The adapter must replace the host's default preset reader after prepareContext returns.
  window.parent.EjsTemplate = { prepareContext: async env => ({ ...env, getpreset: () => 'WRONG_HOST_PRESET' }), evalTemplate: async (code, env) => code.includes('getpreset') ? await env.getpreset('main') : code };
  const renderer = new TaskTemplate(c); await renderer.initialize();
  assert.equal(await renderer.render('<%= getpreset("main") %>'), 'PRESET_A');
  await independentGenerationChecks();
  await editableConfigurationChecks();
  await generationErrorChecks();
  console.log('PASS: generation boundary and independent isolation, cancellation, positions, template phases, budgets and native preservation checks');
}

async function editableConfigurationChecks() {
  const priorFetch = global.fetch;
  const currentIdentity = { chatKey: JSON.stringify(['chat-1', '', 'Char.png']), chatId: 'chat-1', messageId: 0, swipeId: 0, raw: host.chat[0] };
  let httpCalls = 0;
  global.fetch = async () => { httpCalls++; throw new Error('unfinished configuration must fail before HTTP'); };
  const cases = [
    ['missing API', value => { value.tasks[0].connectionId = ''; }],
    ['dangling API', value => { value.tasks[0].connectionId = 'absent'; }],
    ['empty model', value => { value.connections[0].model = ''; }],
    ['empty address', value => { value.connections[0].baseUrl = ''; }],
    ['invalid address', value => { value.connections[0].baseUrl = 'bad-address'; }],
    ['embedded URL credentials', value => { value.connections[0].baseUrl = 'https://user:password@host.invalid'; }],
    ['missing preset', value => { value.connections[0].presetId = null; }],
    ['dangling preset', value => { value.connections[0].presetId = 'absent'; }],
    ['unfinished preset budget', value => { value.presets[0].raw.openai_max_context = 0; }],
    ['invalid task regex', value => { value.tasks[0].regexRules = [{ id: 'bad', stage: 'response', pattern: '[', flags: '', replacement: '', enabled: true }]; }],
    ['invalid regex flags', value => { value.tasks[0].regexRules = [{ id: 'bad', stage: 'prompt', pattern: 'x', flags: 'gg', replacement: '', enabled: true }]; }],
    ['invalid candidate regex', value => { value.tasks[0].candidateBooks[0].nameRegexes = [{ pattern: '[', flags: '' }]; }],
    ['invalid extraction regex', value => { value.tasks[0].output = { mode: 'write', writes: [{ id: 'write', target: { kind: 'message' }, extract: [{ pattern: '[', flags: '' }], operation: { kind: 'append' } }] }; }],
    ['unfinished output', value => { value.tasks[0].output = { mode: 'write', writes: [] }; }],
  ];
  try {
    for (const [label, mutate] of cases) {
      const value = structuredClone(settings); mutate(value);
      const editable = ConfigSchema.parse(value);
      await assert.rejects(() => createGenerationContext(label, editable.tasks[0], editable, currentIdentity, new AbortController(), '', { sticky: {}, cooldown: {} }), error => error.phase === 'prepare' && typeof error.code === 'string' && error.message.length > 0, label);
      assert.equal(httpCalls, 0, `${label}: zero HTTP includes tokenizer requests`);
    }
    const value = structuredClone(settings);
    value.tasks.push(TaskSchema.parse({ ...task('unused'), connectionId: '', regexRules: [{ id: 'bad', stage: 'response', pattern: '[', flags: 'gg', replacement: '', enabled: true }] }));
    value.connections.push({ id: 'unused', name: '', comment: '', baseUrl: '', model: '', presetId: null, secretRef: 'unused' });
    value.presets.push({ id: 'unused', name: '', raw: {} });
    const context = await createGenerationContext('unrelated', value.tasks[0], ConfigSchema.parse(value), currentIdentity, new AbortController(), '', { sticky: {}, cooldown: {} });
    assert.equal(context.connection.model, 'A', 'idle unfinished resources cannot block a healthy task');
    console.log('PASS: 14 unfinished configuration cases save structurally but fail prepare before any HTTP; idle broken resources do not block healthy preparation');
  } finally { global.fetch = priorFetch; }
}

// Independently derived from A1-A5: reuse the canonical runner and add missing failure/position assertions.
async function independentGenerationChecks() {
  const originalChat = host.chat;
  const originalLoader = host.loadWorldInfo;
  const originalEjs = window.parent.EjsTemplate;
  const originalRandom = Math.random;
  const localIdentity = () => ({ chatKey: JSON.stringify(['chat-1', '', 'Char.png']), chatId: 'chat-1', messageId: host.chat.length - 1,
    swipeId: 0, raw: host.chat[host.chat.length - 1] });
  const makeContext = async (options = {}) => {
    const selectedTask = TaskSchema.parse({ ...task('A'), ...options });
    return createGenerationContext('independent', selectedTask, settings, localIdentity(), new AbortController(), 'isolated-secret', { sticky: {}, cooldown: {} });
  };
  const captured = [];
  const immediateFetch = async (input, init) => {
    const url = new URL(input);
    if (!url.pathname.endsWith('/generate')) return tokenFetch(url, init);
    captured.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'MODEL_TEXT' } }] }) };
  };
  try {
    delete window.parent.EjsTemplate;
    global.fetch = immediateFetch;
    const sourceBook = { entries: { 1: entry('A', { sticky: 2 }) } };
    const sourceBefore = structuredClone(sourceBook);
    host.loadWorldInfo = async () => sourceBook;
    const sourceTimed = { sticky: {}, cooldown: {} };
    const first = await createGenerationContext('first', task('A'), settings, localIdentity(), new AbortController(), '', sourceTimed);
    const second = await makeContext();
    await generateTask(first);
    assert.deepEqual(sourceBook, sourceBefore, 'normalizing/scanning must not change cached host entries');
    assert.deepEqual(sourceTimed, { sticky: {}, cooldown: {} }, 'scan effects must not persist before successful settlement');
    assert.deepEqual(second.timedState, { sticky: {}, cooldown: {} }, 'same-task runs must own separate timed state');
    assert.equal(second.candidates[0].disable, false);
    assert.notEqual(first.candidates[0], second.candidates[0]);

    // Native raw and unsupported fields survive parse/serialization without being executed.
    const raw = preset('A'); raw.future_extension = { nested: ['unchanged'] };
    raw.prompts[0].future_prompt_field = { enabled: false };
    const rawBefore = structuredClone(raw);
    const parsed = parseNativePreset(raw);
    assert.deepEqual(raw, rawBefore);
    assert.deepEqual(parseNativePreset(JSON.parse(JSON.stringify(parsed))).future_extension, rawBefore.future_extension);
    assert.deepEqual(parsed.prompts[0].future_prompt_field, rawBefore.prompts[0].future_prompt_field);

    // Assert actual roles and anchors, rather than merely searching the complete payload string.
    host.chat = [{ mes: 'H_OLD', name: 'Player', is_user: true }, { mes: 'H_NEW', name: 'Char', is_user: false }];
    const fixtures = [
      entry('A', { uid: 1, content: 'WI_BEFORE', position: 0 }),
      entry('A', { uid: 2, content: 'WI_AFTER', position: 1 }),
      entry('A', { uid: 3, content: 'WI_DEPTH', position: 4, depth: 1, role: 2 }),
      entry('A', { uid: 4, content: 'WI_NOTE_BEFORE', position: 2 }),
      entry('A', { uid: 5, content: 'WI_NOTE_AFTER', position: 3 }),
      entry('A', { uid: 6, content: 'WI_EXAMPLE', position: 5 }),
      entry('A', { uid: 7, content: 'WI_OUTLET', position: 7, outletName: 'local' }),
    ];
    host.loadWorldInfo = async () => ({ entries: Object.fromEntries(fixtures.map(value => [value.uid, value])) });
    const positioned = await makeContext({ historyDepth: 2, candidateBooks: [{ bookName: 'A', entryUids: fixtures.map(value => value.uid), nameRegexes: [] }] });
    positioned.preset.prompts.push({ identifier: 'worldInfoAfter', name: 'after', role: 'system', marker: true },
      { identifier: 'dialogueExamples', name: 'examples', role: 'assistant', marker: true },
      { identifier: 'personaDescription', name: 'persona', role: 'system', content: 'AUTOMATIC_PERSONA_MUST_NOT_APPEAR', marker: true });
    positioned.preset.prompt_order[0].order = ['main', 'worldInfoBefore', 'dialogueExamples', 'personaDescription', 'chatHistory', 'worldInfoAfter'].map(identifier => ({ identifier, enabled: true }));
    await generateTask(positioned);
    assert.deepEqual(positioned.messages, [
      { role: 'system', content: 'PRESET_A' }, { role: 'system', content: 'WI_BEFORE' },
      { role: 'assistant', content: 'WI_EXAMPLE' }, { role: 'user', content: 'H_OLD' },
      { role: 'assistant', content: 'H_NEW' }, { role: 'assistant', content: 'WI_DEPTH' },
      { role: 'user', content: 'TASK_A' }, { role: 'system', content: 'WI_AFTER' },
    ], 'depth/role/examples/history/after anchors and excluded automatic sources');
    assert(!JSON.stringify(positioned.messages).includes('WI_NOTE'), 'no invented author-note injection anchor');
    assert(!JSON.stringify(positioned.messages).includes('WI_OUTLET'), 'outlets are task-local lookup data, not automatic prompt injection');

    // Fixed upstream openai.js populationInjectionPrompts (06bde939, lines 810-874)
    // groups same-depth messages by order and role, then reverses the reverse-chronological pool.
    const orderedDepth = await makeContext({ candidateBooks: [] });
    for (const [identifier, role, injection_order] of [['D_HIGH', 'system', 200], ['D_SYS', 'system', 100], ['D_SYS_TWO', 'system', 100], ['D_USER', 'user', 100], ['D_ASSIST', 'assistant', 100]]) {
      orderedDepth.preset.prompts.push({ identifier, name: identifier, role, content: identifier, injection_position: 1, injection_depth: 1, injection_order });
      orderedDepth.preset.prompt_order[0].order.push({ identifier, enabled: true });
    }
    await generateTask(orderedDepth);
    assert.deepEqual(orderedDepth.messages.filter(value => value.content.startsWith('D_')), [
      { role: 'assistant', content: 'D_ASSIST' }, { role: 'user', content: 'D_USER' },
      { role: 'system', content: 'D_SYS\nD_SYS_TWO' }, { role: 'system', content: 'D_HIGH' },
    ], 'same-depth order buckets and role priorities must match the native reverse-pool algorithm');

    // Group override, probability, and budget rejection each need adjacent counterexamples.
    const scan = await makeContext();
    Math.random = () => 0.5;
    const grouped = await scanWorldInfo(scan, [entry('A', { disable: false, uid: 1, hash: 1, group: 'one', groupOverride: true, order: 200 }),
      entry('A', { disable: false, uid: 2, hash: 2, group: 'one', order: 100 }),
      entry('A', { disable: false, uid: 3, hash: 3, probability: 0 }),
      entry('A', { disable: false, uid: 4, hash: 4, probability: 100 })]);
    assert.deepEqual([...grouped.allActivatedEntries].map(value => value.uid).sort(), [1, 4]);
    scan.task.scan.budgetCap = 5;
    const budget = await scanWorldInfo(scan, [entry('A', { disable: false, content: 'OVER_BUDGET' }),
      entry('A', { disable: false, uid: 2, hash: 2, content: 'IGNORE_BUDGET', ignoreBudget: true })]);
    assert.deepEqual([...budget.allActivatedEntries].map(value => value.uid), [2]);
    Math.random = originalRandom;

    const temporal = await makeContext({ candidateBooks: [] });
    temporal.timedState.sticky['A.1'] = { hash: 1, start: 1, end: 3, protected: false };
    const effectEntry = entry('A', { disable: false, constant: false, key: ['NOT_PRESENT'], sticky: 2, cooldown: 2 });
    assert.equal((await scanWorldInfo(temporal, [effectEntry])).allActivatedEntries.size, 1, 'sticky applies before its end floor even without a keyword');
    temporal.identity.messageId = 2; // floor 3: sticky ends and protected cooldown starts.
    effectEntry.key = ['H_NEW'];
    assert.equal((await scanWorldInfo(temporal, [effectEntry])).allActivatedEntries.size, 0);
    assert.equal(temporal.timedState.cooldown['A.1'].end, 5);
    temporal.identity.messageId = 4;
    assert.equal((await scanWorldInfo(temporal, [effectEntry])).allActivatedEntries.size, 1, 'cooldown expires at its end floor');
    const delayed = await makeContext({ candidateBooks: [] });
    assert.equal((await scanWorldInfo(delayed, [entry('A', { disable: false, delay: 3 })])).allActivatedEntries.size, 0);
    delayed.identity.messageId = 2;
    assert.equal((await scanWorldInfo(delayed, [entry('A', { disable: false, delay: 3 })])).allActivatedEntries.size, 1, 'delay checks actual floor rather than historyDepth');

    // BEFORE/AFTER are pre-request stages and automatic special entries cannot escape the pool.
    const phaseEntries = [entry('A', { uid: 1, comment: '[GENERATE:BEFORE]', content: 'BEFORE|' }),
      entry('A', { uid: 2, comment: '[GENERATE:AFTER]', content: '|AFTER' }),
      entry('A', { uid: 3, comment: 'pool-excluded', content: 'OUTSIDE_AUTOMATIC' })];
    host.loadWorldInfo = async () => ({ entries: Object.fromEntries(phaseEntries.map(value => [value.uid, value])) });
    const phased = await makeContext({ candidateBooks: [{ bookName: 'A', entryUids: [1, 2], nameRegexes: [] }] });
    const phases = [];
    global.fetch = async (input, init) => { if (new URL(input).pathname.endsWith('/generate')) phases.push('HTTP'); return immediateFetch(input, init); };
    await generateTask(phased);
    assert.equal(phased.messages[0].content, 'BEFORE|PRESET_A');
    assert.equal(phased.messages[phased.messages.length - 1].content, 'TASK_A|AFTER');
    assert(!JSON.stringify(phased.messages).includes('OUTSIDE_AUTOMATIC'));
    assert.deepEqual(phases, ['HTTP']);

    // API adapters can be tested deterministically; actual extension execution remains an environment gate.
    window.parent.EjsTemplate = {
      prepareContext: async env => ({ ...env, getwi: () => 'WRONG_GLOBAL_REGEX_PATH', getpreset: () => 'WRONG_HOST_PRESET' }),
      evalTemplate: async (code, env) => {
        if (code === '<%= outside %>') return env.getwi('A', 3);
        if (code === '<%= taskpreset %>') return env.getpreset('main');
        if (code === '<%= player %>') return 'EXPLICIT_PERSONA';
        if (code === '<%= note %>') return 'EXPLICIT_AUTHOR_NOTE';
        if (code === '<%= outlet %>') return env.outlet('local');
        if (code === '<%= partitions %>') return [...env.authorNoteWorldInfo.before, ...env.authorNoteWorldInfo.after].join('|');
        return code;
      },
    };
    const explicitRead = await makeContext({ prompt: '<%= outside %>', candidateBooks: [] });
    await generateTask(explicitRead);
    assert.equal(explicitRead.messages.at(-1).content, 'OUTSIDE_AUTOMATIC', 'explicit getwi can read outside the automatic candidate pool');
    const explicitPreset = await makeContext({ prompt: '<%= taskpreset %>', candidateBooks: [] });
    await generateTask(explicitPreset);
    assert.equal(explicitPreset.messages.at(-1).content, 'PRESET_A');
    for (const [prompt, expected] of [['<%= player %>', 'EXPLICIT_PERSONA'], ['<%= note %>', 'EXPLICIT_AUTHOR_NOTE']]) {
      const explicit = await makeContext({ prompt, candidateBooks: [] });
      await generateTask(explicit);
      assert.equal(explicit.messages.at(-1).content, expected);
    }
    host.loadWorldInfo = async () => ({ entries: Object.fromEntries(fixtures.map(value => [value.uid, value])) });
    for (const [prompt, expected] of [['<%= outlet %>', 'WI_OUTLET'], ['<%= partitions %>', 'WI_NOTE_BEFORE|WI_NOTE_AFTER']]) {
      const explicit = await makeContext({ prompt, candidateBooks: [{ bookName: 'A', entryUids: [4, 5, 7], nameRegexes: [] }] });
      await generateTask(explicit);
      assert.equal(explicit.messages.at(-1).content, expected);
    }
    delete window.parent.EjsTemplate;

    // Missing EJS is explicit; budget overflow after template expansion cannot send a request.
    const missingEjs = await makeContext({ prompt: '<%= unavailable %>', candidateBooks: [] });
    await assert.rejects(() => generateTask(missingEjs), error => error.code === 'unsupported_host');
    window.parent.EjsTemplate = { prepareContext: async env => env, evalTemplate: async () => 'X'.repeat(2000) };
    const oversized = await makeContext({ prompt: '<%= large %>', candidateBooks: [] });
    oversized.preset.openai_max_context = 1000; oversized.preset.openai_max_tokens = 300;
    const countBefore = captured.length;
    await assert.rejects(() => generateTask(oversized), error => error.code === 'context_overflow');
    assert.equal(captured.length, countBefore);
    delete window.parent.EjsTemplate;

    const trimmed = await makeContext({ candidateBooks: [] });
    trimmed.history[0].content = 'OLDEST_LONG_MESSAGE'.repeat(30);
    trimmed.preset.openai_max_context = 500; trimmed.preset.openai_max_tokens = 300;
    await generateTask(trimmed);
    assert.deepEqual(trimmed.messages.map(value => value.content), ['PRESET_A', 'H_NEW', 'TASK_A'], 'budget removes complete oldest history while preserving fixed prompts and the task');

    // Late successful HTTP resolution after abort must not return text or affect an unrelated run.
    host.loadWorldInfo = originalLoader;
    const cancelled = await makeContext({ candidateBooks: [] });
    let release, entered;
    const reached = new Promise(resolve => { entered = resolve; });
    global.fetch = async (input, init) => {
      if (!new URL(input).pathname.endsWith('/generate')) return tokenFetch(new URL(input), init);
      entered();
      return new Promise(resolve => { release = () => resolve({ ok: true, json: async () => ({ choices: [{ message: { content: 'LATE' } }] }) }); });
    };
    const cancellation = generateTask(cancelled);
    await reached;
    cancelled.controller.abort(); release();
    await assert.rejects(() => cancellation, error => cancelled.controller.signal.aborted && (error.name === 'AbortError' || (error.code === 'host_error' && error.phase === 'request')));
    global.fetch = immediateFetch;
    assert.equal(await generateTask(await makeContext({ candidateBooks: [] })), 'MODEL_TEXT');

    // Native getTagKeyForEntity maps character identity to an avatar key, not the array index.
    const tagged = await makeContext({ candidateBooks: [] });
    const previousTags = host.tagMap;
    host.tagMap = { 'Char.png': ['tag-present'] };
    try {
      const filtered = await scanWorldInfo(tagged, [entry('A', { disable: false, characterFilter: { tags: ['tag-absent'], isExclude: false } })]);
      assert.equal(filtered.allActivatedEntries.size, 0, 'include-tags filter must exclude when the avatar has no selected tag');
    } finally { host.tagMap = previousTags; }

    window.parent.EjsTemplate = {
      prepareContext: async env => env,
      evalTemplate: async (code, env) => {
        if (code === '<%= first_key %>') return 'H_NEW';
        if (code === '<%= second_key %>') { await Promise.resolve(); await Promise.resolve(); return env.world_info.comment; }
        return code;
      },
    };
    host.loadWorldInfo = async () => ({ entries: { 1: entry('A', { comment: '[Preprocessing]', key: ['<%= first_key %>', '<%= second_key %>'] }) } });
    const preprocessing = await makeContext();
    const preprocessRenderer = new TaskTemplate(preprocessing);
    await preprocessRenderer.initialize();
    assert.deepEqual((await preprocessRenderer.preprocess())[0].key, ['H_NEW', '[Preprocessing]'], 'parallel keyword evaluation must retain its world_info context across awaits');
    delete window.parent.EjsTemplate;

    // ST-Prompt-Template selectActivatedEntries uses depth desc / order asc / uid desc.
    // A same-stage fixture distinguishes that rule from normal world-info output ordering.
    host.loadWorldInfo = async () => ({ entries: {
      1: entry('A', { uid: 1, comment: '[GENERATE:BEFORE] high', content: 'LATE|', order: 200 }),
      2: entry('A', { uid: 2, comment: '[GENERATE:BEFORE] low', content: 'EARLY|', order: 100 }),
    } });
    const specialOrder = await makeContext({ candidateBooks: [{ bookName: 'A', entryUids: [1, 2], nameRegexes: [] }] });
    await generateTask(specialOrder);
    assert.equal(specialOrder.messages[0].content, 'EARLY|LATE|PRESET_A', 'template special-entry order follows the extension sorter');

    host.loadWorldInfo = async () => ({ entries: {
      1: entry('A', { uid: 1, comment: '[GENERATE:BEFORE]', constant: false, content: '@@activate\nACTIVATED|' }),
      2: entry('A', { uid: 2, comment: '[GENERATE:AFTER]', constant: false, key: ['TASK_A'], content: '@@dont_activate\nSUPPRESSED' }),
      3: entry('A', { uid: 3, comment: '[GENERATE:BEFORE]', vectorized: true, content: 'VECTOR_EXCLUDED' }),
    } });
    const specialActivation = await makeContext({ candidateBooks: [{ bookName: 'A', entryUids: [1, 2, 3], nameRegexes: [] }] });
    await generateTask(specialActivation);
    assert.equal(specialActivation.messages[0].content, 'ACTIVATED|PRESET_A');
    assert.equal(specialActivation.messages.at(-1).content, 'TASK_A');
  } finally {
    host.chat = originalChat; host.loadWorldInfo = originalLoader;
    window.parent.EjsTemplate = originalEjs; Math.random = originalRandom;
  }
}
async function generationErrorChecks() {
  const priorFetch = global.fetch, priorEjs = window.parent.EjsTemplate;
  const ownIdentity = () => ({ chatKey: JSON.stringify(['chat-1', '', 'Char.png']), chatId: 'chat-1', messageId: 0, swipeId: 0, raw: host.chat[0] });
  const make = () => createGenerationContext('phase-test', TaskSchema.parse({ ...task('A'), candidateBooks: [] }), settings, ownIdentity(), new AbortController(), '', { sticky: {}, cooldown: {} });
  const ordinaryFetch = async (input, init) => new URL(input).pathname.endsWith('/generate')
    ? { ok: true, json: async () => ({ choices: [{ message: { content: 'PHASE_RESULT' } }] }) }
    : tokenFetch(new URL(input), init);
  const expectHostPhase = (phase, marker) => error => error.code === 'host_error' && error.phase === phase && error.message === marker;
  try {
    delete window.parent.EjsTemplate; global.fetch = ordinaryFetch;
    const prepare = await make();
    prepare.preset = new Proxy(prepare.preset, { get(target, key) { if (key === 'function_calling') throw new Error('PREPARE_GENERIC'); return Reflect.get(target, key); } });
    await assert.rejects(() => generateTask(prepare), expectHostPhase('prepare', 'PREPARE_GENERIC'));
    const scan = await make();
    scan.candidates = [entry('A', { disable: false })];
    scan.tokenCounter.count = async () => { throw new Error('SCAN_GENERIC'); };
    await assert.rejects(() => generateTask(scan), expectHostPhase('scan', 'SCAN_GENERIC'));
    window.parent.EjsTemplate = { prepareContext: async () => { throw new Error('TEMPLATE_GENERIC'); }, evalTemplate: async code => code };
    await assert.rejects(() => make().then(generateTask), expectHostPhase('template', 'TEMPLATE_GENERIC'));
    delete window.parent.EjsTemplate;
    global.fetch = async (input, init) => { if (new URL(input).pathname.endsWith('/generate')) throw new TypeError('REQUEST_GENERIC'); return ordinaryFetch(input, init); };
    await assert.rejects(() => make().then(generateTask), expectHostPhase('request', 'REQUEST_GENERIC'));
    global.fetch = ordinaryFetch;
    const specific = await make(); specific.preset.function_calling = true;
    await assert.rejects(() => generateTask(specific), error => error.code === 'unsupported_feature' && error.phase === 'prepare', 'typed failures keep their specific code and phase');

    let entered, release;
    const reached = new Promise(resolve => { entered = resolve; });
    global.fetch = async (input, init) => {
      if (!new URL(input).pathname.endsWith('/generate')) return ordinaryFetch(input, init);
      entered(); return new Promise(resolve => { release = () => resolve({ ok: true, json: async () => ({ choices: [{ message: { content: 'LATE_ERROR_CASE' } }] }) }); });
    };
    const cancelled = await make(); const pending = generateTask(cancelled); await reached;
    cancelled.controller.abort(); release();
    await assert.rejects(() => pending, error => cancelled.controller.signal.aborted && (error.name === 'AbortError' || (error.code === 'host_error' && error.phase === 'request')),
      'cancelled generation rejects late text; cancellation classification belongs to the runtime signal');
    console.log('PASS: generic prepare/scan/template/request phase mapping, typed failure preservation and cancelled late response rejection');
  } finally { global.fetch = priorFetch; window.parent.EjsTemplate = priorEjs; }
}
const selectedChecks = process.argv.includes('--errors-only') ? generationErrorChecks : main;
selectedChecks().catch(error => { console.error(error); process.exitCode = 1; });
