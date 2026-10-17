const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsLoader = require.extensions['.js'];
const compile = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
require.extensions['.ts'] = compile;
require.extensions['.js'] = (module, filename) => filename.endsWith('NativeWorldInfo.js') ? compile(module, filename) : jsLoader(module, filename);
global._ = require('lodash');
let chatId = 'runtime-0';
let scriptVariables = {};
let chatVariables = {};
const secrets = new Map();
const host = { chat: [], characterId: '0', characters: [{ avatar: 'Char.png', data: {} }], chatMetadata: {}, name1: 'Player', name2: 'Char',
  getCurrentChatId: () => chatId, getRequestHeaders: () => ({ 'Content-Type': 'application/json' }), substituteParams: text => text, loadWorldInfo: async () => ({ entries: {} }) };
global.window = { parent: { location: { origin: 'https://host.invalid' }, SillyTavern: { getContext: () => host }, localStorage: { getItem: key => secrets.get(key) ?? null, setItem: (key, value) => secrets.set(key, value) } } };
global.getScriptId = () => 'runtime-script';
global.getVariables = options => structuredClone(options.type === 'script' ? scriptVariables : chatVariables);
let onStateSaved = async () => {};
global.updateVariablesWith = async (update, options) => {
  if (options.type === 'script') scriptVariables = await update(structuredClone(scriptVariables));
  else { const previous = structuredClone(chatVariables); chatVariables = await update(structuredClone(chatVariables)); await onStateSaved(previous, chatVariables); }
};
global.getLastMessageId = () => host.chat.length - 1;
global.getChatMessages = index => [{ message: host.chat[index].mes }];
let onMessageSaved = async () => {};
global.setChatMessages = async messages => { for (const message of messages) if (message.message !== undefined) { host.chat[message.message_id].mes = message.message; await onMessageSaved(message); } };
global.waitGlobalInitialized = async () => {};
global.Mvu = { getMvuData: () => ({ stat_data: {} }), parseMessage: async () => undefined, replaceMvuData: async () => {} };
const events = [];
const notifications = [];
global.toastr = { error: () => { throw Error('task notifications must not use toastr'); } };
global.eventEmit = async (name, result) => { events.push({ name, result }); };
const { createPinia, setActivePinia } = require('pinia'); setActivePinia(createPinia());
const root = path.resolve(__dirname, '../../src/MVU助手');
const diagnostics = require(path.join(root, 'AsyncAnalyze/TaskDiagnostics.ts'));
const showNotice = diagnostics.showTaskNotice;
diagnostics.showTaskNotice = notice => { showNotice(notice); notifications.push(notice); };
const { useTaskStore } = require(path.join(root, 'stores/TaskStore.ts'));
const { emptySettings, TaskSchema } = require(path.join(root, 'AsyncAnalyze/TaskSchema.ts'));
const { runTaskChain, rerunCurrentTasks, cancelTaskRun, activeTaskRuns, initializeTaskRuntime, disposeTaskRuntime, taskRunResults, getUnrecoveredJournals } = require(path.join(root, 'AsyncAnalyze/TaskRuntime.ts'));
const store = useTaskStore();
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const success = text => ({ ok: true, json: async () => ({ choices: [{ message: { content: text } }] }) });
let model = async body => success(`RESULT_${body.model}`);
const calls = [];
global.fetch = async (input, init) => {
  const url = new URL(input); const body = JSON.parse(init.body);
  if (url.pathname.endsWith('/generate')) { calls.push(body); return model(body, init.signal); }
  return { ok: true, json: async () => url.pathname.endsWith('/encode') ? { ids: Array.from({ length: body.text.length }) } : { token_count: JSON.stringify(body).length + 2 } };
};
function resetChat(name, text = 'BODY') {
  chatId = name; chatVariables = {}; calls.length = 0; events.length = 0; notifications.length = 0;
  host.chat = [{ mes: 'USER', is_user: true, name: 'Player' }, { mes: text, is_user: false, name: 'Char' }];
  onStateSaved = async () => {}; onMessageSaved = async () => {};
}
function task(id, overrides = {}) { return TaskSchema.parse({ id, name: id, enabled: true, eventName: '', historyDepth: 0, prompt: id, connectionId: id, candidateBooks: [], scan: {}, regexRules: [], output: { mode: 'return' }, ...overrides }); }
async function configure(tasks, minimum = 0) {
  const settings = emptySettings(); settings.automatic.minReceivedChars = minimum;
  settings.groups = [{ id: 'group', name: 'group', comment: '', taskIds: tasks.map(value => value.id) }]; settings.activeGroupId = 'group'; settings.tasks = tasks;
  settings.connections = tasks.map(value => ({ id: value.id, name: value.id, comment: '', baseUrl: 'https://api.invalid/v1', model: value.id, secretRef: value.id, presetId: 'preset' }));
  settings.presets = [{ id: 'preset', name: 'preset', raw: { openai_max_context: 10000, openai_max_tokens: 300,
    prompts: [{ identifier: 'main', name: 'main', role: 'system', content: 'SYSTEM' }, { identifier: 'chatHistory', name: 'history', role: 'system', marker: true }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }, { identifier: 'chatHistory', enabled: true }] }] } }];
  await store.replaceSettings(settings);
}
async function until(predicate) { const deadline = Date.now() + 5000; while (!predicate()) { if (Date.now() > deadline) throw new Error('fixture progress deadline exceeded'); await new Promise(resolve => setImmediate(resolve)); } }
const eventRun = (name, requestId) => runTaskChain({ messageId: 1, trigger: { kind: 'event', eventName: name }, requestId });
const messageWrite = pattern => ({ mode: 'write', writes: [{ id: 'write', target: { kind: 'message' }, extract: [], operation: pattern ? { kind: 'replace', regex: { pattern, flags: '' } } : { kind: 'append' } }] });
async function main() {
  resetChat('busy'); await configure([task('A', { eventName: 'same' }), task('B', { eventName: 'other' })]);
  const gate = deferred(); model = async body => { await gate.promise; return success(body.model); };
  const first = eventRun('same', 'caller-1'); await until(() => calls.length === 1);
  assert.equal(notifications.length, 1, 'background event start must be visible without mounting the UI');
  assert.match(notifications[0].title, /任务处理中/);
  assert.match(notifications[0].message, /same.*A/);
  assert.equal(notifications[0].running, true);
  assert.equal(diagnostics.taskNotices.get(notifications[0].runId).running, true);
  const duplicate = await eventRun('same', 'caller-2'); assert.equal(duplicate.status, 'busy'); assert.equal(duplicate.requestId, 'caller-2'); assert(duplicate.activeRunId);
  const independent = eventRun('other', 'caller-3'); await until(() => calls.length === 2);
  gate.resolve(); assert.equal((await first).status, 'succeeded'); assert.equal((await independent).status, 'succeeded');
  assert.equal(notifications.filter(item => item.level === 'success').length, 2, 'each independent run must report completion exactly once');
  assert.equal(notifications.filter(item => item.running).length, 2, 'busy request must not report a new start');
  assert.equal(events.filter(value => value.result.requestId === 'caller-2').length, 1);

  resetChat('regular-event-name'); await configure([task('A', { eventName: 'regular' })]);
  const regularGate = deferred(); model = async body => { await regularGate.promise; return success(body.model); };
  const common = runTaskChain({ messageId: 1, trigger: { kind: 'received' } }); await until(() => calls.length === 1);
  const literalRegular = eventRun('regular', 'literal-event'); await until(() => calls.length === 2);
  regularGate.resolve(); assert.equal((await common).status, 'succeeded'); assert.equal((await literalRegular).status, 'succeeded');
  assert.deepEqual(calls.map(value => value.model), ['A', 'A'], 'enabled event task also participates in the regular chain as in the original behavior');

  resetChat('enabled-threshold'); await configure([task('A', { enabled: false, eventName: 'disabled' }), task('B', { eventName: 'manual-event' })], 300);
  assert.equal((await eventRun('disabled')).status, 'succeeded', 'event trigger bypasses the regular-chain enabled switch');
  const notificationCount = notifications.length;
  assert.equal((await runTaskChain({ messageId: 1, trigger: { kind: 'received' } })).status, 'skipped');
  assert.equal(notifications.length, notificationCount, 'routine automatic skips must not create notification noise');
  model = async body => success(body.model);
  assert.equal((await eventRun('manual-event')).status, 'succeeded');
  assert.equal((await eventRun('manual-event')).status, 'succeeded', 'explicit events bypass floor interval');

  resetChat('cancel'); await configure([task('A', { eventName: 'cancel-me' }), task('B', { eventName: 'continue' })]);
  const continueGate = deferred(); model = async (body, signal) => body.model === 'A'
    ? new Promise((resolve, reject) => { signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }); })
    : (await continueGate.promise, success('B'));
  const cancel = eventRun('cancel-me'); const keep = eventRun('continue'); await until(() => calls.length === 2);
  const cancelId = [...activeTaskRuns.values()].find(value => value.result.trigger.eventName === 'cancel-me').id;
  assert.equal(cancelTaskRun(cancelId), true); assert.equal((await cancel).status, 'cancelled'); continueGate.resolve(); assert.equal((await keep).status, 'succeeded');
  assert.equal(notifications.filter(item => item.title.includes('任务已取消')).length, 1);

  resetChat('commit-order', '<x>old</x>');
  await configure([task('A', { output: messageWrite('<x>.*?</x>') }), task('B', { output: messageWrite('<x>.*?</x>') }), task('FAIL', { order: 1 })]);
  const savedA = deferred(); const releaseA = deferred();
  onStateSaved = async (before, after) => {
    const key = 'kat_async_task_state:runtime-script';
    if (!before[key]?.A && after[key]?.A) { savedA.resolve(); await releaseA.promise; }
    if (!before[key]?.B && after[key]?.B) releaseA.resolve();
  };
  model = async body => body.model === 'FAIL' ? { ok: false, status: 500 } : success(`<x>${body.model}</x>`);
  const failed = await runTaskChain({ messageId: 1, trigger: { kind: 'received' } });
  assert.equal(failed.status, 'failed'); assert.equal(failed.rollback.status, 'completed');
  assert.equal(host.chat[1].mes, '<x>old</x>', 'rollback uses commit sequence despite reversed state-settlement completion');
  assert.deepEqual(failed.tasks.map(value => value.status), ['rolled_back', 'rolled_back', 'failed']);
  assert.equal(notifications.at(-1).level, 'error');
  assert.match(notifications.at(-1).message, /FAIL/);
  assert.match(notifications.at(-1).message, /本链提交已回滚/);
  assert(!notifications.some(item => item.level === 'success'), 'rolled back intermediate successes must never announce overall success');

  resetChat('rerun-reservation', 'ORIGINAL'); await configure([task('A', { output: messageWrite() })]); model = async () => success('APPENDED');
  assert.equal((await runTaskChain({ messageId: 1, trigger: { kind: 'received' } })).status, 'succeeded');
  const rollbackStarted = deferred(); const finishRollback = deferred();
  onMessageSaved = async message => { if (message.message === 'ORIGINAL') { rollbackStarted.resolve(); await finishRollback.promise; } };
  const rerun = rerunCurrentTasks(); await rollbackStarted.promise;
  const competing = await rerunCurrentTasks(); assert.equal(competing.status, 'busy');
  const received = await runTaskChain({ messageId: 1, trigger: { kind: 'received' } }); assert.equal(received.status, 'busy');
  finishRollback.resolve(); assert.equal((await rerun).status, 'succeeded');
  assert.equal(host.chat[1].mes, 'ORIGINAL\nAPPENDED');
  assert.equal(activeTaskRuns.size, 0);
  await independentRuntimeChecks();
  await unfinishedRuntimeChecks();
  await notificationChecks();
  await failureDiagnosticChecks();
  await eventContractChecks();
  console.log('PASS: explicit busy and independent event/regular runs, enable/threshold/interval, isolated cancellation, commit-order rollback and reserved rerun lifecycle');
}
async function failureDiagnosticChecks() {
  resetChat('screenshot-backend-error');
  await configure([task('微信主动聊天', { enabled: false, eventName: 'Chat_On_WeChat', retryCount: 1 })]);
  const logs = [], savedConsole = {};
  for (const level of ['info', 'debug', 'warn', 'error']) { savedConsole[level] = console[level]; console[level] = (...args) => logs.push([level, ...args]); }
  try {
    model = async () => new Response(JSON.stringify({ error: { message: 'Unknown model: wechat-test', code: 'model_not_found' } }), { status: 200 });
    const failed = await eventRun('Chat_On_WeChat', 'diagnostic-request');
    assert.equal(failed.status, 'failed');
    const error = failed.tasks[0].error;
    assert.equal(error.code, 'backend_error'); assert.match(error.message, /Unknown model/);
    assert.equal(error.details.backendCode, 'model_not_found'); assert.equal(error.details.httpStatus, 200);
    assert.equal(error.details.model, '微信主动聊天'); assert.match(error.details.response, /Unknown model/);
    assert.equal(failed.tasks[0].attempts, 2);
    assert.deepEqual(events.at(-1).result.tasks[0].error, error, 'broadcast, copy diagnostics and UI retain request details');
    const dump = JSON.stringify(logs);
    for (const text of ['运行准入', '开始执行任务', '生成尝试', '生成尝试未完成', 'retrying', '任务执行未完成', '运行结算', 'diagnostic-request']) assert(dump.includes(text), text);
    resetChat('diagnostic-success'); await configure([task('OK')]);
    model = async () => success('OUTPUT');
    assert.equal((await runTaskChain({ messageId: 1, trigger: { kind: 'manual' } })).status, 'succeeded');
    const finalDump = JSON.stringify(logs);
    for (const text of ['开始提交任务结果', '任务执行成功', '模型原始输出']) assert(finalDump.includes(text), text);
  } finally { Object.assign(console, savedConsole); }
}
async function eventContractChecks() {
  resetChat('event-listener-contract');
  await configure([
    task('REG'), task('NEG', { order: -1, triggerInterval: 20 }), task('REG_EVENT', { eventName: 'regular:also' }),
    task('EV', { enabled: false, eventName: 'frontend:event', output: { mode: 'event_result' } }),
    task('OFF', { enabled: false, eventName: 'frontend:off' }),
    task('PEER', { enabled: false, eventName: 'frontend:event', output: { mode: 'event_result' } }),
    task('OTHER', { enabled: false, eventName: 'frontend:other', output: { mode: 'event_result' } }),
  ]);
  const handlers = new Map();
  global.tavern_events = { MESSAGE_SENT: 'sent', MESSAGE_RECEIVED: 'received', CHAT_CHANGED: 'changed' };
  global.eventOn = (name, handler) => { handlers.set(name, handler); return { stop: () => handlers.delete(name) }; };
  global.initializeGlobal = () => {};
  model = async body => success(`FULL_RESPONSE_${body.model}`);
  initializeTaskRuntime();
  try {
    const api = window.KatTaskAPI;
    const fired = async (name, payload) => handlers.get(name)(payload);
    assert.deepEqual((await fired('sent', 1)).tasks.map(item => item.taskId), ['NEG']);
    const regular = await fired('received', 1);
    assert(regular.tasks.some(item => item.taskId === 'REG_EVENT' && item.status === 'succeeded'), 'enabled event tasks remain eligible in the regular chain');
    await api.run({ messageId: 1 });
    const beforeOff = calls.length;
    assert.equal((await fired('frontend:off', 'off-request')).status, 'succeeded');
    assert.equal(calls.length, beforeOff + 1, 'disabled regular-chain task still responds to its event');
    const stringResult = await fired('frontend:event', 'literal-request');
    assert.equal(stringResult.requestId, 'literal-request');
    assert.equal(events.filter(item => item.name === 'frontend:event:result' && item.result.requestId === 'literal-request').length, 1);
    assert.equal(stringResult.tasks.length, 2);
    assert.deepEqual(events.find(item => item.result.runId === stringResult.runId).result, stringResult, 'broadcast and Promise expose the same terminal result');
    for (const item of stringResult.tasks) { assert.equal(item.text, `FULL_RESPONSE_${item.taskId}`); assert.deepEqual(item.writes, []); }
    assert.equal(host.chat[1].mes, 'BODY', 'event broadcast never appends to the message');
    assert.deepEqual(Object.keys(chatVariables), ['kat_async_task_state:runtime-script'], 'broadcast creates only existing task history, no result storage');
    host.chat.push({ mes: 'SECOND_BODY', name: 'Char', is_user: false, swipe_id: 2 });
    const selected = await fired('frontend:event', { requestId: 'object-request', messageId: 2, taskId: 'EV' });
    assert.equal(selected.requestId, 'object-request'); assert.equal(selected.messageId, 2);
    assert.equal(selected.swipeId, 2, 'terminal broadcast must identify the actual swipe');
    assert.deepEqual(selected.tasks.map(item => item.taskId), ['EV']);
    assert.equal(selected.tasks[0].text, 'FULL_RESPONSE_EV');
    for (const bad of [[], 42, null, { requestId: {} }, { messageId: '1' }, { taskId: 7 }]) {
      const before = calls.length;
      const invalid = await fired('frontend:event', bad);
      assert.equal(invalid.status, 'failed', JSON.stringify(bad));
      assert.equal(calls.length, before, 'bad event payload must never fall back to a current-floor execution');
    }
    assert.equal((await fired('frontend:event', { requestId: 'wrong-event', taskId: 'OTHER' })).status, 'failed');
    assert.equal((await api.run({ messageId: 1, taskId: 'missing' })).status, 'failed');
    const unbound = store.snapshot(); unbound.tasks.push(task('UNBOUND')); await store.replaceSettings(unbound);
    assert.equal((await api.run({ messageId: 1, taskId: 'UNBOUND' })).status, 'failed');
    calls.length = 0;
    const negative = await api.run({ messageId: 1, taskId: 'NEG' });
    assert.equal(negative.status, 'succeeded'); assert.deepEqual(calls.map(item => item.model), ['NEG']);
    const singleEvent = await api.run({ messageId: 1, taskId: 'EV', requestId: 'single-event' });
    assert.equal(singleEvent.trigger.kind, 'event'); assert.equal(singleEvent.trigger.eventName, 'frontend:event');
    assert.deepEqual(singleEvent.tasks.map(item => item.taskId), ['EV']);
  } finally { disposeTaskRuntime(); }

  resetChat('event-result-concurrency');
  chatVariables.other_frontend = { retained: ['USER_DATA'] };
  await configure([task('A', { eventName: 'alpha', output: { mode: 'event_result' } }), task('B', { eventName: 'beta', output: { mode: 'event_result' } })]);
  const gate = deferred(); model = async body => { await gate.promise; return success(body.model); };
  const alpha = eventRun('alpha', 'alpha-req'), beta = eventRun('beta', 'beta-req');
  await until(() => calls.length === 2); gate.resolve();
  const both = await Promise.all([alpha, beta]);
  assert(both.every(value => value.status === 'succeeded'));
  for (const result of both) {
    const published = events.filter(item => item.result.runId === result.runId);
    assert.equal(published.length, 1); assert.deepEqual(published[0].result, result);
    assert.equal(result.tasks[0].text, result.tasks[0].taskId);
  }
  assert.deepEqual(Object.keys(chatVariables).sort(), ['kat_async_task_state:runtime-script', 'other_frontend']);
  assert.deepEqual(chatVariables.other_frontend, { retained: ['USER_DATA'] });

  resetChat('event-result-partial');
  await configure([task('A', { eventName: 'partial-result', output: { mode: 'event_result' } }), task('FAIL', { eventName: 'partial-result', output: { mode: 'event_result' } })]);
  model = async body => body.model === 'FAIL' ? { ok: false, status: 500 } : success('KEEP_SUCCESS');
  const partial = await eventRun('partial-result');
  assert.equal(partial.status, 'partial');
  assert.equal(partial.tasks.find(item => item.taskId === 'A').text, 'KEEP_SUCCESS');
  assert.equal(events.filter(item => item.result.runId === partial.runId).length, 1);

  resetChat('event-result-requires-event');
  await configure([task('A', { output: { mode: 'event_result' } })]);
  const invalidMode = await runTaskChain({ messageId: 1, trigger: { kind: 'manual' } });
  assert.equal(invalidMode.status, 'failed');
  assert.equal(calls.length, 0, 'regular task with an event-only output must fail before generation');

  resetChat('event-result-listener-failure');
  await configure([task('A', { eventName: 'listener-failure', output: { mode: 'event_result' } })]);
  const emitter = global.eventEmit;
  let broadcasts = 0;
  global.eventEmit = async () => { broadcasts++; throw Error('OTHER_FRONTEND_LISTENER_FAILURE'); };
  try {
    const result = await eventRun('listener-failure', 'listener-request');
    assert.equal(result.status, 'succeeded');
    assert.equal(broadcasts, 1, 'a failing listener must not cause duplicate broadcasts or paid retries');
    assert(result.warnings.some(item => item.code === 'result_listener_failed'));
    assert.equal(result.tasks[0].text, 'KEEP_SUCCESS');
    assert.equal(activeTaskRuns.size, 0);
  } finally { global.eventEmit = emitter; }

  await originalIntervalChecks();
  console.log('PASS: actual registered event payloads and original enabled semantics, single-task/negative-order/unbound rejection, broadcast metadata/concurrency and no result persistence');
}
async function originalIntervalChecks() {
  model = async body => success(body.model);
  resetChat('original-first-interval');
  await configure([task('A', { eventName: 'interval', triggerInterval: 3 })]);
  assert.equal((await eventRun('interval')).status, 'skipped', 'first interval starts from floor zero');
  assert.equal(calls.length, 0);
  host.chat.push({ mes: 'floor2', is_user: false, name: 'Char' }, { mes: 'floor3', is_user: false, name: 'Char' });
  const atBoundary = await runTaskChain({ messageId: 3, trigger: { kind: 'event', eventName: 'interval' } });
  assert.equal(atBoundary.status, 'succeeded');
  assert.equal((await runTaskChain({ messageId: 3, trigger: { kind: 'event', eventName: 'interval' } })).status, 'skipped', 'event obeys configured interval greater than one');
  const backwards = await runTaskChain({ messageId: 1, trigger: { kind: 'event', eventName: 'interval' } });
  assert.equal(backwards.status, 'skipped');
  assert.equal(backwards.tasks[0].reason.lastTriggerFloor, 3);
  assert.equal(chatVariables['kat_async_task_state:runtime-script'].A.lastSuccessfulFloor, 3, 'baseline reset must not invent a successful run');
  assert.equal(chatVariables['kat_async_task_state:runtime-script'].A.triggerBaseline.floor, 1);
  host.chat.push({ mes: 'floor4', is_user: false, name: 'Char' });
  assert.equal((await runTaskChain({ messageId: 4, trigger: { kind: 'event', eventName: 'interval' } })).status, 'succeeded', 'floor rollback resets the interval baseline to the current floor');
  resetChat('original-one-interval'); await configure([task('A', { eventName: 'one', triggerInterval: 1 })]);
  assert.equal((await eventRun('one')).status, 'succeeded');
  assert.equal((await eventRun('one')).status, 'succeeded', 'interval one allows repeated same-floor events');
  assert.equal((await runTaskChain({ messageId: 1, trigger: { kind: 'manual' } })).status, 'succeeded');
  assert.equal((await runTaskChain({ messageId: 1, trigger: { kind: 'manual' } })).status, 'succeeded', 'interval one also allows repeated regular runs');
}
async function notificationChecks() {
  resetChat('notification-partial');
  await configure([task('<b>A</b>', { eventName: 'notice' }), task('FAIL', { eventName: 'notice' })]);
  model = async body => body.model === 'FAIL' ? { ok: false, status: 500 } : success('OK');
  const partial = await eventRun('notice');
  assert.equal(partial.status, 'partial');
  assert.equal(notifications.at(-1).level, 'warning');
  assert.match(notifications.at(-1).title, /部分成功/);
  assert.match(notifications.at(-1).message, /成功 1 项，失败 1 项/);
  assert(notifications[0].message.includes('<b>A</b>'), 'names are passed as text for Vue interpolation');
  assert.equal(diagnostics.taskNotices.get(partial.runId).running, false, 'terminal notice replaces running state');
  const logs = diagnostics.taskRunLogs.get(partial.runId);
  for (const message of ['模型请求内容', '模型原始输出', '生成失败']) assert(logs.some(entry => entry.message === message));

  resetChat('notification-failure'); await configure([task('A', { eventName: 'notice' })]);
  model = async () => success('OK');
  const previousNotice = diagnostics.showTaskNotice, previousWarn = console.warn;
  const warnings = [];
  diagnostics.showTaskNotice = () => { throw Error('notice unavailable'); };
  console.warn = (...args) => warnings.push(args);
  try {
    const result = await eventRun('notice');
    assert.equal(result.status, 'succeeded');
    assert.equal(events.filter(item => item.result.runId === result.runId).length, 1, 'toast failure must preserve the result event');
    assert.equal(activeTaskRuns.size, 0);
    assert.equal(warnings.length, 2);
  } finally { diagnostics.showTaskNotice = previousNotice; console.warn = previousWarn; }
}
async function unfinishedRuntimeChecks() {
  const priorFetch = global.fetch;
  let allHttp = 0;
  global.fetch = async (...args) => { allHttp++; return priorFetch(...args); };
  try {
    for (const [label, mutate] of [
      ['API', config => { config.tasks[0].connectionId = ''; }],
      ['model', config => { config.connections[0].model = ''; }],
      ['baseUrl', config => { config.connections[0].baseUrl = ''; }],
      ['preset', config => { config.connections[0].presetId = null; }],
      ['regex', config => { config.tasks[0].regexRules = [{ id: 'bad', stage: 'response', pattern: '[', flags: '', replacement: '', enabled: true }]; }],
    ]) {
      resetChat(`unfinished-${label}`); await configure([task('broken', { eventName: 'bad' }), task('healthy', { eventName: 'good' })]);
      const config = store.snapshot(); mutate(config); await store.replaceSettings(config); await store.load();
      allHttp = 0;
      const failed = await eventRun('bad');
      assert.equal(failed.status, 'failed', label);
      assert.equal(failed.tasks[0].error.phase, 'prepare', label);
      assert(failed.tasks[0].error.message.length > 0);
      assert.equal(allHttp, 0, `${label}: invalid task must not call any HTTP endpoint`);
      assert.equal(calls.length, 0);
      model = async body => success(body.model);
      assert.equal((await eventRun('good')).status, 'succeeded', `${label}: unselected broken task must not poison a healthy selected task`);
      const repaired = store.snapshot();
      repaired.tasks[0].connectionId = 'healthy'; repaired.tasks[0].regexRules = [];
      await store.replaceSettings(repaired);
      assert.equal((await eventRun('bad')).status, 'succeeded', `${label}: rebinding and correcting task restores execution`);
    }
    resetChat('unfinished-idle'); await configure([task('healthy')]);
    const config = store.snapshot();
    config.connections.push({ id: 'idle', name: '', comment: '', baseUrl: '', model: '', secretRef: 'idle', presetId: null });
    config.presets.push({ id: 'idle', name: '', raw: {} });
    config.tasks.push(task('idle', { connectionId: '', enabled: false }));
    await store.replaceSettings(config);
    assert.equal((await runTaskChain({ messageId: 1, trigger: { kind: 'manual' } })).status, 'succeeded');
    console.log('PASS: API/model/address/preset/regex task failures produce prepare errors and zero HTTP; idle broken resources do not poison selected healthy tasks; rebinding restores execution');
  } finally { global.fetch = priorFetch; }
}
async function independentRuntimeChecks() {
  model = async body => success(body.model);
  for (const length of [299, 300, 301]) {
    resetChat(`threshold-${length}`, 'x'.repeat(length)); await configure([task('A')], 300);
    const result = await runTaskChain({ messageId: 1, trigger: { kind: 'received' } });
    assert.equal(result.status, length < 300 ? 'skipped' : 'succeeded');
    assert.equal(calls.length, length < 300 ? 0 : 1);
  }
  resetChat('threshold-zero', ''); await configure([task('A')], 0);
  assert.equal((await runTaskChain({ messageId: 1, trigger: { kind: 'received' } })).status, 'succeeded');

  resetChat('interval-boundary'); await configure([task('A', { triggerInterval: 2 })]);
  host.chat.push({ mes: 'BODY_2', is_user: false, name: 'Char' });
  assert.equal((await runTaskChain({ messageId: 2, trigger: { kind: 'manual' } })).status, 'succeeded');
  host.chat.push({ mes: 'BODY_3', is_user: false, name: 'Char' });
  const tooSoon = await runTaskChain({ messageId: 3, trigger: { kind: 'manual' } });
  assert.equal(tooSoon.tasks[0].reason.code, 'interval_not_reached');
  assert.equal(tooSoon.tasks[0].reason.currentFloor, 3);
  assert.equal(tooSoon.tasks[0].reason.lastSuccessfulFloor, 2);
  host.chat.push({ mes: 'BODY_4', is_user: false, name: 'Char' });
  assert.equal((await runTaskChain({ messageId: 4, trigger: { kind: 'manual' } })).status, 'succeeded');

  resetChat('negative-order'); await configure([task('NEG', { order: -1 }), task('ZERO'), task('POS', { order: 1 })]);
  const sent = await runTaskChain({ messageId: 1, trigger: { kind: 'sent' } });
  assert.deepEqual(sent.tasks.map(value => value.taskId), ['NEG']);
  const received = await runTaskChain({ messageId: 1, trigger: { kind: 'received' } });
  assert.deepEqual(received.tasks.map(value => value.taskId), ['ZERO', 'POS']);
  assert.equal(received.status, 'succeeded');

  resetChat('event-partial'); await configure([task('OK', { eventName: 'partial', output: messageWrite() }), task('FAIL', { eventName: 'partial' })]);
  model = async body => body.model === 'FAIL' ? { ok: false, status: 500 } : success('KEPT_EVENT_WRITE');
  const partial = await eventRun('partial', 'partial-request');
  assert.equal(partial.status, 'partial');
  assert.deepEqual(partial.tasks.map(value => value.status), ['succeeded', 'failed']);
  assert.equal(host.chat[1].mes, 'BODY\nKEPT_EVENT_WRITE');
  assert.equal(events.filter(value => value.result.requestId === 'partial-request').length, 1);

  resetChat('retry-then-return'); await configure([task('A', { eventName: 'retry', retryCount: 1 })]);
  let attempts = 0; model = async () => ++attempts === 1 ? { ok: false, status: 500 } : success('RETURN_ONLY');
  const returned = await eventRun('retry');
  assert.equal(returned.tasks[0].attempts, 2);
  assert.equal(returned.status, 'succeeded');
  assert.equal(host.chat[1].mes, 'BODY');
  assert.deepEqual(returned.tasks[0].writes, []);
  resetChat('commit-conflict-no-retry'); await configure([task('A', { eventName: 'conflict', retryCount: 2, output: messageWrite('ABSENT') })]);
  model = async () => success('UNMATCHED');
  const conflict = await eventRun('conflict');
  assert.equal(conflict.status, 'failed'); assert.equal(calls.length, 1, 'commit conflicts must not trigger paid generation retries');

  resetChat('mvu-error-phase'); await configure([task('A', { eventName: 'mvu-failure', output: messageWrite() })]);
  const parseBefore = Mvu.parseMessage;
  Mvu.parseMessage = async () => { throw new Error('MVU_PARSE_RUNTIME_FAILURE'); };
  try {
    const failedMvu = await eventRun('mvu-failure');
    assert.equal(failedMvu.status, 'failed');
    assert.equal(failedMvu.tasks[0].error.phase, 'commit', 'an MVU commit failure cannot be reported as a network/request error');
    assert.equal(host.chat[1].mes, 'BODY');
    assert(!getUnrecoveredJournals().some(record => record.runId === failedMvu.runId), 'a failed task with no remaining mutation must not create a recovery record');
  } finally { Mvu.parseMessage = parseBefore; }

  resetChat('failed-local-compensation'); await configure([task('A', { output: messageWrite() })]);
  const originalMvu = { get: Mvu.getMvuData, parse: Mvu.parseMessage, replace: Mvu.replaceMvuData };
  let partialMvu = { stat_data: { value: 0 } }, replacementCalls = 0;
  Mvu.getMvuData = () => structuredClone(partialMvu);
  Mvu.parseMessage = async () => ({ stat_data: { value: 1 } });
  Mvu.replaceMvuData = async value => {
    if (++replacementCalls === 1) { partialMvu = structuredClone(value); throw new Error('COMMIT_REPLACE_ACK_FAILED'); }
    throw new Error('ROLLBACK_REPLACE_FAILED');
  };
  try {
    const rollbackFailed = await runTaskChain({ messageId: 1, trigger: { kind: 'manual' } });
    assert.equal(rollbackFailed.status, 'failed');
    assert.equal(rollbackFailed.tasks[0].status, 'rollback_failed');
    assert.equal(rollbackFailed.rollback.status, 'failed', 'empty outer-chain compensation cannot erase the failed task local compensation');
    assert(rollbackFailed.rollback.errors.some(value => value.includes('ROLLBACK_REPLACE_FAILED')));
    assert.equal(partialMvu.stat_data.value, 1, 'the deliberately retained residual must be reported');
    const diagnostic = getUnrecoveredJournals().find(record => record.runId === rollbackFailed.runId);
    assert(diagnostic && diagnostic.taskId === 'A' && diagnostic.chatId === 'failed-local-compensation');
    assert(diagnostic.operations.some(operation => operation.kind === 'mvu' && operation.path.join('.') === 'stat_data.value'));
    assert(diagnostic.errors.some(error => error.includes('ROLLBACK_REPLACE_FAILED')));
    assert(diagnostic.operations.every(operation => !Object.hasOwn(operation.identity, 'raw')), 'read-only recovery evidence must not expose mutable host message objects');
    diagnostic.errors.push('CALLER_MUTATION'); diagnostic.operations[0].after = 'CALLER_MUTATION';
    const detached = getUnrecoveredJournals().find(record => record.runId === rollbackFailed.runId);
    assert(!detached.errors.includes('CALLER_MUTATION'));
    assert.notEqual(detached.operations[0].after, 'CALLER_MUTATION');
  } finally { Mvu.getMvuData = originalMvu.get; Mvu.parseMessage = originalMvu.parse; Mvu.replaceMvuData = originalMvu.replace; }

  resetChat('state-compensation-residual'); await configure([task('A', { eventName: 'state-save' })]);
  const realVariableSetter = global.updateVariablesWith;
  let stateSaves = 0;
  global.updateVariablesWith = async (...args) => {
    if (++stateSaves === 1) { await realVariableSetter(...args); throw new Error('STATE_ACK_AFTER_PERSIST'); }
    throw new Error('STATE_COMPENSATION_BEFORE_PERSIST');
  };
  try {
    const stateFailure = await eventRun('state-save');
    assert.equal(stateFailure.status, 'failed');
    assert.equal(stateFailure.tasks[0].status, 'rollback_failed');
    assert.equal(stateFailure.rollback.status, 'failed');
    const stateEvidence = getUnrecoveredJournals().find(record => record.runId === stateFailure.runId);
    assert(stateEvidence && stateEvidence.stateUndo?.taskId === 'A');
    assert.equal(stateEvidence.stateUndo.after.ownerRunId, stateFailure.runId);
    assert(stateEvidence.errors.some(error => error.includes('STATE_COMPENSATION_BEFORE_PERSIST')));
    assert.deepEqual(stateEvidence.operations, [], 'a state-only residual is represented by its StateUndo, not invented text edits');
  } finally { global.updateVariablesWith = realVariableSetter; }

  resetChat('state-saved-before-switch'); await configure([task('A', { eventName: 'state-switch' })]);
  let writesAcrossSwitch = 0;
  global.updateVariablesWith = async (...args) => {
    writesAcrossSwitch++; await realVariableSetter(...args);
    chatId = 'state-new-chat';
    host.chat = [{ mes: 'NEW_USER', name: 'Player', is_user: true }, { mes: 'NEW_BODY', name: 'Char', is_user: false }];
  };
  try {
    const switched = await eventRun('state-switch');
    assert.equal(switched.tasks[0].status, 'rollback_failed');
    assert.equal(writesAcrossSwitch, 1, 'identity loss after persisted state must forbid compensation against the new chat');
    const diagnostic = getUnrecoveredJournals().find(record => record.runId === switched.runId);
    assert(diagnostic?.stateUndo && diagnostic.chatId === 'state-saved-before-switch', 'the original state journal must remain diagnosable after identity loss');
    assert.equal(diagnostic.stateUndo.after.ownerRunId, switched.runId);
    assert.equal(host.chat[1].mes, 'NEW_BODY');
  } finally { global.updateVariablesWith = realVariableSetter; }

  resetChat('immutable-terminal'); await configure([task('A', { output: messageWrite() })]);
  model = async () => success('APPENDED');
  const terminal = await runTaskChain({ messageId: 1, trigger: { kind: 'manual' } });
  const terminalBefore = structuredClone(terminal);
  const publishedBefore = structuredClone(events.find(value => value.result.runId === terminal.runId).result);
  assert.equal((await rerunCurrentTasks()).status, 'succeeded');
  assert.deepEqual(terminal, terminalBefore, 'a later rerun cannot rewrite an already-returned terminal result');
  assert.deepEqual(events.find(value => value.result.runId === terminal.runId).result, publishedBefore);
  assert.deepEqual(JSON.parse(JSON.stringify(taskRunResults.value.find(value => value.runId === terminal.runId))), terminalBefore, 'cached history is also a terminal snapshot');

  resetChat('registered-lifecycle'); await configure([task('A', { eventName: 'scoped', output: messageWrite() })]);
  const handlers = new Map();
  global.tavern_events = { MESSAGE_SENT: 'sent', MESSAGE_RECEIVED: 'received', CHAT_CHANGED: 'chat-changed', WORLDINFO_ENTRIES_LOADED: 'old-world-filter' };
  global.eventOn = (name, handler) => { handlers.set(name, handler); return { stop: () => handlers.delete(name) }; };
  global.initializeGlobal = (name, value) => { assert.equal(name, 'KatTaskAPI'); assert.equal(value, window.KatTaskAPI); };
  initializeTaskRuntime();
  try {
    assert(!handlers.has('old-world-filter'), 'runtime must not register retired shared world-info filtering');
    assert(handlers.has('scoped') && handlers.has('sent') && handlers.has('received'));
    assert.deepEqual(window.KatTaskAPI.getUnrecoveredJournals(), getUnrecoveredJournals());
    const networkEntered = deferred(), lateNetwork = deferred();
    model = async () => { networkEntered.resolve(); await lateNetwork.promise; return success('MUST_NOT_WRITE_AFTER_SWITCH'); };
    const old = handlers.get('scoped')('chat-switch-request');
    await networkEntered.promise;
    const oldMessage = host.chat[1];
    chatId = 'new-chat'; host.chat = [{ mes: 'NEW_USER', name: 'Player', is_user: true }, { mes: 'NEW_BODY', name: 'Char', is_user: false }];
    await handlers.get('chat-changed')();
    lateNetwork.resolve();
    assert.equal((await old).status, 'cancelled');
    assert.equal(oldMessage.mes, 'BODY'); assert.equal(host.chat[1].mes, 'NEW_BODY');
    assert.equal(activeTaskRuns.size, 0);
    model = async () => success('NEW_CHAT_RESULT');
    assert.equal((await window.KatTaskAPI.run({ messageId: 1, eventName: 'scoped', requestId: 'new-chat' })).status, 'succeeded');
    const callCount = calls.length;
    const invalidEvent = await window.KatTaskAPI.run({ messageId: 1, eventName: '', requestId: 'invalid-empty-event' });
    assert.equal(invalidEvent.status, 'failed', 'an explicitly supplied empty eventName must not turn into a manual run');
    assert.equal(calls.length, callCount);
  } finally { disposeTaskRuntime(); }
  assert.equal(handlers.size, 0);

  resetChat('reload-high-water'); await configure([task('A', { eventName: 'reload' })]);
  const stateKey = 'kat_async_task_state:runtime-script';
  chatVariables[stateKey] = { A: { lastSuccessfulFloor: 1, sequence: 500, ownerRunId: 'persisted-old-runtime', effects: {
    'sticky:missing.1': { value: { hash: 1, start: 0, end: 1, protected: true }, settledFloor: 1, sequence: 500, ownerRunId: 'persisted-old-runtime' },
  } } };
  const runtimePath = path.join(root, 'AsyncAnalyze/TaskRuntime.ts');
  delete require.cache[require.resolve(runtimePath)];
  const freshRuntime = require(runtimePath);
  const afterReload = await freshRuntime.runTaskChain({ messageId: 1, trigger: { kind: 'event', eventName: 'reload' } });
  assert.equal(afterReload.status, 'succeeded');
  assert.equal(chatVariables[stateKey].A.ownerRunId, afterReload.runId, 'new runtime admission must inherit persisted sequence high water at the same floor');
  assert.equal(chatVariables[stateKey].A.effects['sticky:missing.1'].value, null, 'fresh successful cleanup must supersede a persisted effect, rather than be ignored as an old run');
  delete require.cache[require.resolve(runtimePath)];
  const withoutJournal = require(runtimePath);
  const beforeRecovery = host.chat[1].mes, beforeRecoveryCalls = calls.length;
  const unavailable = await withoutJournal.rerunCurrentTasks();
  assert.equal(unavailable.status, 'failed', 'dedicated recovery cannot pretend success/skipped when persisted success has no session journal');
  assert.match(unavailable.reason, /回滚|rollback/i);
  assert.equal(calls.length, beforeRecoveryCalls);
  assert.equal(host.chat[1].mes, beforeRecovery);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
