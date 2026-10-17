// Manual variable editing/version preview safety. One deterministic primary responsibility.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { createPinia, setActivePinia } = require('pinia');
global._ = require('lodash');
const root = path.resolve(__dirname, '../src/MVU助手');
const { captureEditTarget, saveEditTarget } = require(path.join(root, 'utils/MvuEditTarget.ts'));
const { UseVersionControlStore } = require(path.join(root, 'stores/UseVersionControlStore.ts'));
const { commitTask, releaseJournal } = require(path.join(root, 'AsyncAnalyze/TaskCommit.ts'));
let chatId, chat, data, writes, events, rules, failure, waitHook, eventHook, setterHook, sourceHook;
const clone = structuredClone;
global.window = { parent: { SillyTavern: { getContext: () => ({ chat, characters: [{ avatar: 'test' }], characterId: 0, getCurrentChatId: () => chatId }) } } };
global.getLastMessageId = () => chat.length - 1;
global.getChatMessages = () => [{ message: chat[0].mes ?? '' }];
global.setChatMessages = async messages => { chat[0].mes = messages[0].message; };
global.waitGlobalInitialized = async () => { if (waitHook) { const hook = waitHook; waitHook = null; await hook(); } };
global.eventEmit = async (...args) => { events.push(args); if (eventHook) await eventHook(); };
global.Mvu = { getMvuData: options => clone(data[options.message_id]), replaceMvuData: async (next, options) => {
  if (failure) throw Error('setter failed');
  writes.push({ next: clone(next), options }); data[options.message_id] = clone(next); if (setterHook) await setterHook();
} };
global.getWorldbook = async () => { if (sourceHook) await sourceHook(); return [{ name: '更新', content: rules }]; };
global.getScriptId = () => 'test'; global.getVariables = () => ({}); global.toastr = { info() {}, error() {} };
function reset() { chatId = 'chat-A'; chat = [{ swipe_id: 0 }]; data = [{ stat_data: { system: { 当前版本: 1.04 }, hero: { hp: 10, drop: true }, list: [1] }, unrelated: { keep: true } }]; writes = []; events = []; failure = false; waitHook = eventHook = setterHook = sourceHook = null; rules = '<edit|v="1.05">{"hero":{"hp":12},"new":"yes","list":[2,3]}</edit><del|v="1.05">{"hero":{"drop":null}}</del>'; setActivePinia(createPinia()); }
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
const changes = {
  'new floor': () => { chat.push({ swipe_id: 0 }); data.push({ stat_data: {} }); },
  'chat changed': () => { chatId = 'chat-B'; },
  'swipe changed': () => { chat[0].swipe_id = 1; },
  'message replaced': () => { chat[0] = { swipe_id: 0 }; },
  'baseline changed': () => { data[0].stat_data.hero.hp = 99; },
};
async function preview() { const store = UseVersionControlStore(); await store.fetchCurrentVersion(); await store.parseUpdateRules('book', '更新'); await store.calculateUpdate(); return store; }
async function main() {
  for (const [name, change] of Object.entries(changes)) {
    reset(); const target = await captureEditTarget(); change(); await assert.rejects(saveEditTarget(target, { user: 'draft' }), /变化|外部更新/, name); assert.equal(writes.length, 0, name);
    reset(); const store = await preview(); const retained = store.previewDiff; change(); await assert.rejects(store.executeFullUpdate(), /变化|外部更新/, name); assert.equal(writes.length, 0, name); assert.strictEqual(store.previewDiff, retained, name);
  }
  reset(); const target = await captureEditTarget(); waitHook = changes['new floor']; await assert.rejects(saveEditTarget(target, { x: 1 }), /变化/); assert.equal(writes.length, 0, 'recheck after init wait');
  reset(); const store = await preview(); sourceHook = changes['baseline changed']; await assert.rejects(store.executeFullUpdate(), /外部更新/); assert.equal(writes.length, 0, 'recheck after source read');
  reset(); const captured = await captureEditTarget(); const next = await saveEditTarget(captured, { edited: true }); assert.deepEqual(writes[0].options, { type: 'message', message_id: 0 }); assert.deepEqual(data[0].unrelated, { keep: true }); assert.deepEqual(next.baseline, { edited: true }); assert.deepEqual(events[0][2].stat_data.hero.hp, 10, 'notification before snapshot is not mutated');
  reset(); const s = await preview(); assert.equal(s.currentVersion, 1.04); assert.equal(s.targetVersion, 1.05); assert(s.previewDiff.changes.some(c => c.path.join('.') === 'hero.hp' && c.before === 10 && c.after === 12)); assert(s.previewDiff.changes.some(c => c.kind === 'deleted' && c.path.join('.') === 'hero.drop')); assert.deepEqual(s.previewDiff.finalData.list, [2, 3]);
  failure = true; const retained = s.previewDiff; await assert.rejects(s.executeFullUpdate(), /保存未能确认/); assert.strictEqual(s.previewDiff, retained); assert.equal(s.currentVersion, 1.04); failure = false; await s.executeFullUpdate(); assert.equal(s.previewDiff, null); assert.equal(s.currentVersion, 1.05); assert.equal(data[0].stat_data.system.当前版本, 1.05);
  reset(); const staleSource = await preview(); rules += '\nchanged'; await assert.rejects(staleSource.executeFullUpdate(), /版本记录已变化/); assert(staleSource.previewDiff); assert.equal(writes.length, 0);
  for (const bad of ['<edit|v="1.05">{bad}</edit>', '<edit|v="wat">{}</edit>', '<edit|v="1.05">[]</edit>', '<edit|v="1.05">{}', 'no update blocks']) {
    reset(); rules = bad; const invalid = UseVersionControlStore(); await assert.rejects(invalid.parseUpdateRules('book', '更新')); assert(invalid.checkError); await assert.rejects(invalid.calculateUpdate(), /成功检查/); assert.equal(invalid.previewDiff, null); assert.equal(writes.length, 0);
  }
  reset(); const afterWrite = await captureEditTarget(); eventHook = changes['chat changed']; await assert.rejects(saveEditTarget(afterWrite, { changed: true }), /写入已发出/); assert.equal(writes.length, 1, 'completion ambiguity is surfaced after host write');
  reset(); data[0].stat_data = []; await assert.rejects(captureEditTarget(), /不是 JSON 对象/);
  // Two manual editors with the same baseline cannot both pass while the host setter awaits.
  reset(); const first = await captureEditTarget(), second = await captureEditTarget();
  const gate = deferred(), entered = deferred(); setterHook = async () => { entered.resolve(); await gate.promise; };
  const firstSave = saveEditTarget(first, { winner: 1 }); await entered.promise;
  const secondSave = saveEditTarget(second, { winner: 2 }); const secondRejected = assert.rejects(secondSave, /外部更新/);
  await Promise.resolve(); assert.equal(writes.length, 1); gate.resolve(); await firstSave; await secondRejected; assert.deepEqual(data[0].stat_data, { winner: 1 });
  // Real task commits and manual edits acquire the same message lock.
  reset(); const manualTarget = await captureEditTarget(); const parsing = deferred(), continueParse = deferred();
  Mvu.parseMessage = async (_, before) => { parsing.resolve(); await continueParse.promise; return { ...before, stat_data: { ...before.stat_data, taskWrite: true } }; };
  const taskIdentity = { chatKey: manualTarget.chatKey, chatId, messageId: 0, swipeId: 0, raw: chat[0] };
  const journal = { runId: 'shared-lock', edits: [] };
  const committing = commitTask({ output: { mode: 'write', writes: [{ id: 'write', target: { kind: 'message' }, extract: [], operation: { kind: 'append' } }] } }, 'task text', taskIdentity, journal, { writes: [] }, { warnings: [] }, new AbortController().signal);
  await parsing.promise; const waitingManual = assert.rejects(saveEditTarget(manualTarget, { unsafe: true }), /外部更新/);
  await Promise.resolve(); assert.equal(writes.length, 0, 'manual waits while task parse owns target lock'); continueParse.resolve(); await committing; await waitingManual; assert(data[0].stat_data.taskWrite); assert.equal(data[0].stat_data.unsafe, undefined); releaseJournal(journal);
  reset(); const leadingManual = await captureEditTarget(), manualEntered = deferred(), releaseManual = deferred(); let parsed = false;
  setterHook = async () => { setterHook = null; manualEntered.resolve(); await releaseManual.promise; };
  Mvu.parseMessage = async (_, before) => { parsed = true; return { ...before, stat_data: { ...before.stat_data, taskAfterManual: true } }; };
  const manualSaving = saveEditTarget(leadingManual, { manualFirst: true }); await manualEntered.promise;
  const waitingJournal = { runId: 'manual-before-task', edits: [] };
  const waitingTask = commitTask({ output: { mode: 'write', writes: [{ id: 'write', target: { kind: 'message' }, extract: [], operation: { kind: 'append' } }] } }, 'task text', { chatKey: leadingManual.chatKey, chatId, messageId: 0, swipeId: 0, raw: chat[0] }, waitingJournal, { writes: [] }, { warnings: [] }, new AbortController().signal);
  await Promise.resolve(); await Promise.resolve(); assert.equal(parsed, false, 'task waits while manual setter owns target lock');
  const manualSettled = Promise.allSettled([manualSaving]); releaseManual.resolve(); await waitingTask; const [manualOutcome] = await manualSettled;
  if (manualOutcome.status === 'rejected') assert.match(manualOutcome.reason.message, /写入已发出/);
  assert.deepEqual(data[0].stat_data, { manualFirst: true, taskAfterManual: true }); releaseJournal(waitingJournal);
  // Notification listeners may start another save: release before notifying and surface changed result.
  reset(); const outer = await captureEditTarget(); eventHook = async () => { eventHook = null; const inner = await captureEditTarget(); await saveEditTarget(inner, { listener: true }); };
  await assert.rejects(saveEditTarget(outer, { outer: true }), /保存通知期间目标变量已变化/); assert.equal(writes.length, 2); assert.deepEqual(data[0].stat_data, { listener: true });
  console.log('PASS manual MVU identity/baseline barriers, async races, exact-target writes, version diffs/precision, corrupt sources, preserved failed preview; concurrent manual/task locking and nested notification saves');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
