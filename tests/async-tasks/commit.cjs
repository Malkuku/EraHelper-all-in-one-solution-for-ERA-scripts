const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
global._ = require('lodash');
const root = path.resolve(__dirname, '../../src/MVU助手/AsyncAnalyze');
const { commitTask, rollbackJournal, releaseJournal } = require(path.join(root, 'TaskCommit.ts'));
const { settleTaskState, readTaskHistory, timedSnapshot, rollbackTaskState } = require(path.join(root, 'TaskState.ts'));
const host = { chat: [{ mes: '<a>old-A</a><b>old-B</b>', name: 'Char', is_user: false }], characterId: '0', characters: [{ avatar: 'Char.png' }], getCurrentChatId: () => 'chat-commit' };
global.window = { parent: { SillyTavern: { getContext: () => host } } };
let mvu = { stat_data: { a: 0, b: 0 } };
let chatVariables = {};
let books = { book: [] };
global.getScriptId = () => 'script';
global.getVariables = () => structuredClone(chatVariables);
global.updateVariablesWith = async update => { chatVariables = await update(structuredClone(chatVariables)); };
global.getChatMessages = () => [{ message: host.chat[0].mes }];
global.setChatMessages = async messages => { if (messages[0].message !== undefined) host.chat[0].mes = messages[0].message; };
global.getWorldbook = async name => structuredClone(books[name]);
global.updateWorldbookWith = async (name, update) => { books[name] = await update(structuredClone(books[name])); };
global.createWorldbookEntries = async (name, entries) => {
  const created = entries.map(entry => ({ uid: Math.max(0, ...books[name].map(item => item.uid)) + 1, ...entry }));
  books[name].push(...created);
  return { new_entries: structuredClone(created), worldbook: structuredClone(books[name]) };
};
global.deleteWorldbookEntries = async (name, filter) => { books[name] = books[name].filter(entry => !filter(entry)); };
global.waitGlobalInitialized = async () => {};
global.eventEmit = async () => {};
global.Mvu = { getMvuData: () => structuredClone(mvu), parseMessage: async () => undefined, replaceMvuData: async value => { mvu = structuredClone(value); } };
const identity = { chatKey: JSON.stringify(['chat-commit', '', 'Char.png']), chatId: 'chat-commit', messageId: 0, swipeId: 0, raw: host.chat[0] };
const runResult = () => ({ warnings: [] });
const taskResult = () => ({ taskId: 'task', taskName: 'task', status: 'failed', attempts: 1, writes: [] });
const write = (id, target, pattern) => ({ id, target, extract: [], operation: pattern ? { kind: 'replace', regex: { pattern, flags: '' } } : { kind: 'append' } });
const task = writes => ({ output: { mode: 'write', writes } });
const signal = new AbortController().signal;
async function main() {
  const a = { runId: 'regular-A', edits: [] }; const b = { runId: 'event-B', edits: [] };
  await commitTask(task([write('a', { kind: 'message' }, '<a>.*?</a>')]), '<a>new-A</a>', identity, a, taskResult(), runResult(), signal);
  await commitTask(task([write('b', { kind: 'message' }, '<b>.*?</b>')]), '<b>new-B</b>', identity, b, taskResult(), runResult(), signal);
  assert.deepEqual(await rollbackJournal(a, []), []);
  assert.equal(host.chat[0].mes, '<a>old-A</a><b>new-B</b>', 'rollback keeps the independent same-message event edit');
  releaseJournal(b);
  const conflict = { runId: 'conflict', edits: [] };
  await assert.rejects(commitTask(task([write('missing', { kind: 'message' }, 'DOES_NOT_EXIST')]), 'content', identity, conflict, taskResult(), runResult(), signal), error => error.code === 'conflict');
  assert.equal(conflict.edits.length, 0);

  const created = { runId: 'create-A', edits: [] }; const event = { runId: 'append-B', edits: [] };
  await commitTask(task([write('created', { kind: 'worldbook', bookName: 'book', entryName: 'summary' }, 'old regex')]), 'A_CONTENT', identity, created, taskResult(), runResult(), signal);
  assert.equal(books.book[0].enabled, true);
  await commitTask(task([write('event', { kind: 'worldbook', bookName: 'book', entryUid: books.book[0].uid, entryName: 'summary' })]), 'B_CONTENT', identity, event, taskResult(), runResult(), signal);
  const warnings = [];
  assert.deepEqual(await rollbackJournal(created, warnings), []);
  assert.equal(books.book.length, 1, 'creator rollback cannot delete the target after another run writes');
  assert(books.book[0].content.includes('B_CONTENT') && !books.book[0].content.includes('A_CONTENT'));
  assert(warnings.some(warning => warning.code === 'created_target_retained'));
  releaseJournal(event);

  const duplicate = { runId: 'duplicate-text', edits: [] };
  await commitTask(task([write('append', { kind: 'message' })]), 'DUPLICATE_TEXT', identity, duplicate, taskResult(), runResult(), signal);
  host.chat[0].mes = 'OTHER_OWNER: DUPLICATE_TEXT';
  const duplicateErrors = await rollbackJournal(duplicate, []);
  assert.equal(duplicateErrors.length, 1, 'untracked replacement cannot establish ownership using a unique equal string');
  assert.equal(host.chat[0].mes, 'OTHER_OWNER: DUPLICATE_TEXT');
  releaseJournal(duplicate);

  const initialEntry = { uid: 999, name: 'created-switch', content: '', enabled: true };
  books.book.push(structuredClone(initialEntry));
  const switched = { runId: 'switch-during-created-rollback', edits: [{ kind: 'created', identity, book: 'book', uid: 999, initial: initialEntry, result: { writeId: 'create', target: 'book:999', status: 'committed' } }] };
  const originalReader = global.getWorldbook;
  global.getWorldbook = async name => { const value = await originalReader(name); host.getCurrentChatId = () => 'other-chat'; return value; };
  assert.equal((await rollbackJournal(switched, [])).length, 1);
  assert(books.book.some(entry => entry.uid === 999), 'chat change after read forbids a later delete');
  global.getWorldbook = originalReader; host.getCurrentChatId = () => 'chat-commit';

  const failed = { runId: 'mvu-failed', edits: [] }; const original = host.chat[0].mes;
  Mvu.parseMessage = async () => { throw new Error('fixture MVU parse failed'); };
  await assert.rejects(commitTask(task([write('mvu', { kind: 'message' })]), '<UpdateVariable>FAIL</UpdateVariable>', identity, failed, taskResult(), runResult(), signal));
  assert.deepEqual(await rollbackJournal(failed, []), []);
  assert.equal(host.chat[0].mes, original);

  Mvu.parseMessage = async (text, before) => ({ ...before, stat_data: { ...before.stat_data, [text.includes('A_PATCH') ? 'a' : 'b']: 1 } });
  const mvuA = { runId: 'mvu-A', edits: [] }; const mvuB = { runId: 'mvu-B', edits: [] };
  await commitTask(task([write('A', { kind: 'message' })]), 'A_PATCH', identity, mvuA, taskResult(), runResult(), signal);
  await commitTask(task([write('B', { kind: 'message' })]), 'B_PATCH', identity, mvuB, taskResult(), runResult(), signal);
  assert.deepEqual(await rollbackJournal(mvuA, []), []);
  assert.deepEqual(mvu.stat_data, { a: 0, b: 1 }, 'MVU rollback owns paths and keeps the independent event path');
  releaseJournal(mvuB);

  const empty = { sticky: {}, cooldown: {} };
  const newer = await settleTaskState('same-task', identity, empty, { sticky: { 'book.1': { hash: 1, start: 1, end: 3, protected: false } }, cooldown: {} }, 'newer', 20);
  await settleTaskState('same-task', identity, empty, { sticky: { 'book.1': { hash: 1, start: 1, end: 8, protected: false } }, cooldown: {} }, 'late-old', 10);
  assert.equal(timedSnapshot(readTaskHistory('same-task', identity)).sticky['book.1'].end, 3);
  await rollbackTaskState(newer, identity);
  assert.equal(timedSnapshot(readTaskHistory('same-task', identity)).sticky['book.1'], undefined);
  await settleTaskState('__proto__', identity, empty, empty, 'safe-key', 30);
  assert.equal(readTaskHistory('__proto__', identity).ownerRunId, 'safe-key');
  await independentCommitChecks();
  console.log('PASS: same-message independent rollback, conflicts, create ownership, external equal-string/chat-switch guards, MVU failure/path ownership, late state settlement and safe task keys');
}
async function independentCommitChecks() {
  Mvu.parseMessage = async () => undefined;
  host.chat[0].mes = '<x>one</x> <x>two</x>';
  const literal = { runId: 'literal-global', edits: [] };
  const replacement = { id: 'replace-all', target: { kind: 'message' }, extract: [], operation: { kind: 'replace', regex: { pattern: '<x>.*?</x>', flags: 'g' } } };
  await commitTask(task([replacement]), '$&-$1', identity, literal, taskResult(), runResult(), signal);
  assert.equal(host.chat[0].mes, '$&-$1 $&-$1', 'model output is a literal replacement, never JavaScript replacement syntax');
  assert.deepEqual(await rollbackJournal(literal, []), []);
  assert.equal(host.chat[0].mes, '<x>one</x> <x>two</x>');

  const extraction = { runId: 'whole-match', edits: [] };
  const extracted = { ...write('extract', { kind: 'message' }), extract: [{ pattern: '<v>(.*?)</v>', flags: 'g' }] };
  await commitTask(task([extracted]), '<v>A</v><v>B</v>', identity, extraction, taskResult(), runResult(), signal);
  assert(host.chat[0].mes.endsWith('\n<v>A</v>\n<v>B</v>'), 'extract preserves match[0] and joins global matches');
  assert.deepEqual(await rollbackJournal(extraction, []), []);
  const firstExtraction = { runId: 'first-match', edits: [] };
  await commitTask(task([{ ...extracted, extract: [{ pattern: '<v>(.*?)</v>', flags: '' }] }]), '<v>A</v><v>B</v>', identity, firstExtraction, taskResult(), runResult(), signal);
  assert(host.chat[0].mes.endsWith('\n<v>A</v>'), 'non-global extraction uses the whole first match, consistent with the UI preview');
  assert.deepEqual(await rollbackJournal(firstExtraction, []), []);
  const unmatched = { runId: 'extract-none', edits: [] };
  await assert.rejects(commitTask(task([extracted]), 'NO_TAG', identity, unmatched, taskResult(), runResult(), signal), error => error.code === 'extraction_failed');
  assert.equal(unmatched.edits.length, 0);

  const beforeAck = host.chat[0].mes;
  const setterBeforeAck = global.setChatMessages;
  for (const persistedBeforeThrow of [false, true]) {
    let ackCalls = 0;
    global.setChatMessages = async (...args) => {
      if (++ackCalls === 1) { if (persistedBeforeThrow) await setterBeforeAck(...args); throw new Error('TEXT_PERSISTED_ACK_FAILED'); }
      return setterBeforeAck(...args);
    };
    try {
      const ackJournal = { runId: `text-rejection-${persistedBeforeThrow}`, edits: [] };
      await assert.rejects(commitTask(task([write('ack', { kind: 'message' })]), 'PERSISTED_WITH_FAILED_ACK', identity, ackJournal, taskResult(), runResult(), signal), /TEXT_PERSISTED_ACK_FAILED/);
      assert.deepEqual(await rollbackJournal(ackJournal, []), [], 'known before/after text states must distinguish a no-op from a compensatable write');
      assert.equal(host.chat[0].mes, beforeAck, 'a persisted text write must be owned and compensated even when its host Promise rejects');
      assert.equal(ackCalls, persistedBeforeThrow ? 2 : 1);
    } finally { global.setChatMessages = setterBeforeAck; }
  }

  books.independent = [];
  const createA = { runId: 'concurrent-create-A', edits: [] }, createB = { runId: 'concurrent-create-B', edits: [] };
  const newTarget = { kind: 'worldbook', bookName: 'independent', entryName: 'shared-name' };
  await Promise.all([
    commitTask(task([write('A', newTarget)]), 'A', identity, createA, taskResult(), runResult(), signal),
    commitTask(task([write('B', newTarget)]), 'B', identity, createB, taskResult(), runResult(), signal),
  ]);
  assert.equal(books.independent.length, 1, 'book lock must re-resolve the missing name instead of duplicate creation');
  assert.equal(books.independent[0].content, 'A\nB');
  assert.deepEqual(await rollbackJournal(createB, []), []);
  assert.deepEqual(await rollbackJournal(createA, []), []);
  assert.deepEqual(books.independent, []);
  books.independent = [{ uid: 1, name: 'duplicate', content: 'FIRST', enabled: false }, { uid: 2, name: 'duplicate', content: 'SECOND', enabled: true }];
  const beforeAmbiguous = structuredClone(books.independent);
  await assert.rejects(commitTask(task([write('ambiguous', { kind: 'worldbook', bookName: 'independent', entryName: 'duplicate' })]), 'MUST_NOT_WRITE', identity, { runId: 'ambiguous', edits: [] }, taskResult(), runResult(), signal), error => error.code === 'ambiguous_target');
  assert.deepEqual(books.independent, beforeAmbiguous);
  await assert.rejects(commitTask(task([write('missing-uid', { kind: 'worldbook', bookName: 'independent', entryUid: 999, entryName: 'duplicate' })]), 'MUST_NOT_REBIND', identity, { runId: 'missing-uid', edits: [] }, taskResult(), runResult(), signal), error => error.code === 'ambiguous_target');
  assert.deepEqual(books.independent, beforeAmbiguous);

  const realCreator = global.createWorldbookEntries;
  for (const persistedBeforeThrow of [false, true]) {
    books['create-ack'] = [];
    global.createWorldbookEntries = async (...args) => { if (persistedBeforeThrow) await realCreator(...args); throw new Error('CREATE_ACK_FAILED'); };
    try {
      const pending = { runId: `create-ack-${persistedBeforeThrow}`, edits: [] };
      await assert.rejects(commitTask(task([write('create-ack', { kind: 'worldbook', bookName: 'create-ack', entryName: 'unknown-owner' })]), 'TEXT', identity, pending, taskResult(), runResult(), signal), /CREATE_ACK_FAILED/);
      const pendingErrors = await rollbackJournal(pending, []);
      assert.equal(pendingErrors.length, persistedBeforeThrow ? 1 : 0, 'creation acknowledgement cannot silently lose an unowned new UID');
      assert.equal(books['create-ack'].length, persistedBeforeThrow ? 1 : 0, 'unknown created ownership is retained rather than guessed and deleted');
      assert.equal(pending.edits.some(edit => edit.kind === 'create_pending'), persistedBeforeThrow);
    } finally { global.createWorldbookEntries = realCreator; }
  }

  let persisted = 0;
  const realSetter = global.setChatMessages;
  global.setChatMessages = async (...args) => { persisted++; return realSetter(...args); };
  Mvu.parseMessage = async () => { throw new Error('parse-before-persist'); };
  try {
    await assert.rejects(commitTask(task([write('parse-first', { kind: 'message' })]), '<UpdateVariable>bad</UpdateVariable>', identity, { runId: 'parse-first', edits: [] }, taskResult(), runResult(), signal));
    assert.equal(persisted, 0, 'MVU pure parsing must fail before any text persistence, not compensate an avoidable write');
  } finally { global.setChatMessages = realSetter; Mvu.parseMessage = async () => undefined; }

  const empty = { sticky: {}, cooldown: {} };
  const value = { hash: 1, start: 1, end: 9, protected: false };
  const initial = { sticky: { 'book.1': value }, cooldown: {} };
  await settleTaskState('tombstone', identity, empty, initial, 'add', 100);
  await settleTaskState('tombstone', identity, initial, empty, 'remove-newer', 120);
  await settleTaskState('tombstone', identity, empty, initial, 'late-stale-add', 110);
  assert.equal(timedSnapshot(readTaskHistory('tombstone', identity)).sticky['book.1'], undefined, 'late snapshots cannot resurrect a newer tombstone');
  const own = await settleTaskState('owned-state', identity, empty, initial, 'owner-A', 200);
  const withOther = { sticky: { 'book.1': value, 'book.2': { ...value, hash: 2 } }, cooldown: {} };
  await settleTaskState('owned-state', identity, initial, withOther, 'owner-B', 210);
  await rollbackTaskState(own, identity);
  const remaining = readTaskHistory('owned-state', identity);
  assert.equal(remaining.ownerRunId, 'owner-B');
  assert.deepEqual(Object.keys(timedSnapshot(remaining).sticky), ['book.2']);

  const realStateSetter = global.updateVariablesWith;
  for (const persistedBeforeThrow of [false, true]) {
    const beforeState = structuredClone(chatVariables);
    let stateCalls = 0;
    global.updateVariablesWith = async (...args) => {
      if (++stateCalls === 1) { if (persistedBeforeThrow) await realStateSetter(...args); throw new Error('STATE_SAVE_ACK_FAILED'); }
      return realStateSetter(...args);
    };
    try {
      await assert.rejects(settleTaskState(`state-ack-${persistedBeforeThrow}`, identity, empty, empty, 'failed-state-owner', 900), error => {
        assert.equal(error.code, 'state_save_failed');
        assert.deepEqual(error.rollbackErrors, []);
        return true;
      });
      assert.deepEqual(chatVariables, beforeState, 'state save rejection cannot leave a false success interval/effect');
      assert.equal(stateCalls, persistedBeforeThrow ? 2 : 1);
    } finally { global.updateVariablesWith = realStateSetter; }
  }

  const normalMvuSetter = Mvu.replaceMvuData;
  for (const persistedBeforeThrow of [false, true]) {
    mvu = { stat_data: { original: 0 } };
    const originalText = host.chat[0].mes;
    const before = structuredClone(mvu);
    let calls = 0;
    Mvu.parseMessage = async (_text, value) => ({ ...value, stat_data: { original: 1 } });
    Mvu.replaceMvuData = async value => {
      calls++;
      if (calls === 1) { if (persistedBeforeThrow) mvu = structuredClone(value); throw new Error('ORIGINAL_MVU_REPLACE_FAILURE'); }
      mvu = structuredClone(value);
    };
    const journal = { runId: `replace-failure-${persistedBeforeThrow}`, edits: [] };
    await assert.rejects(commitTask(task([write('mvu-replace', { kind: 'message' })]), 'MVU_PATCH', identity, journal, taskResult(), runResult(), signal), /ORIGINAL_MVU_REPLACE_FAILURE/);
    assert.deepEqual(await rollbackJournal(journal, []), [], 'known before-state and compensated after-state both have no residual');
    assert.deepEqual(mvu, before);
    assert.equal(host.chat[0].mes, originalText);
    assert.equal(calls, persistedBeforeThrow ? 2 : 1, 'rollback writes MVU only when the failed call actually changed it');
  }
  Mvu.replaceMvuData = normalMvuSetter;

  mvu = { stat_data: { shared: 0 } };
  Mvu.parseMessage = async (text, before) => ({ ...before, stat_data: { shared: text.includes('FIRST') ? 1 : 2 } });
  const sameA = { runId: 'same-path-A', edits: [] }, sameB = { runId: 'same-path-B', edits: [] };
  const sameWarning = runResult();
  await commitTask(task([write('same-A', { kind: 'message' })]), 'FIRST', identity, sameA, taskResult(), runResult(), signal);
  await commitTask(task([write('same-B', { kind: 'message' })]), 'SECOND', identity, sameB, taskResult(), sameWarning, signal);
  assert(sameWarning.warnings.some(value => value.code === 'overlapping_write'), 'same MVU path overlap must warn when committed, not only fail at rollback');
  releaseJournal(sameA); releaseJournal(sameB);

  mvu = { stat_data: { parent: { child: 0 } } };
  Mvu.parseMessage = async (text, before) => ({ ...before, stat_data: { parent: text.includes('CHILD') ? { child: 1 } : 'PARENT_REPLACED' } });
  const child = { runId: 'child-path', edits: [] }, parent = { runId: 'parent-path', edits: [] }, parentWarning = runResult();
  await commitTask(task([write('child', { kind: 'message' })]), 'CHILD', identity, child, taskResult(), runResult(), signal);
  await commitTask(task([write('parent', { kind: 'message' })]), 'PARENT', identity, parent, taskResult(), parentWarning, signal);
  assert(parentWarning.warnings.some(value => value.code === 'overlapping_write'), 'ancestor/descendant MVU paths overlap');
  releaseJournal(child); releaseJournal(parent);

  mvu = { stat_data: { list: [0, 0] } };
  Mvu.parseMessage = async (text, before) => {
    const after = structuredClone(before);
    after.stat_data.list[text.includes('LIST_A') ? 0 : 1] = 1;
    return after;
  };
  const listA = { runId: 'list-A', edits: [] }, listB = { runId: 'list-B', edits: [] };
  await commitTask(task([write('list-A', { kind: 'message' })]), 'LIST_A', identity, listA, taskResult(), runResult(), signal);
  const independentWarning = runResult();
  await commitTask(task([write('list-B', { kind: 'message' })]), 'LIST_B', identity, listB, taskResult(), independentWarning, signal);
  assert(!independentWarning.warnings.some(value => value.code === 'overlapping_write'), 'independent existing array indices must not receive a false overlap warning');
  assert.deepEqual(await rollbackJournal(listA, []), [], 'fixed array indices are distinct MVU JSON paths');
  assert.deepEqual(mvu.stat_data.list, [0, 1], 'rollback index 0 must preserve the independent index 1 write');
  releaseJournal(listB);

  mvu = { stat_data: { list: [10, 20] } };
  Mvu.parseMessage = async (text, before) => {
    const after = structuredClone(before);
    if (text.includes('ARRAY_INDEX')) after.stat_data.list[0] = 11;
    else after.stat_data.list.unshift(11); // Equal value at a different owner/index must not establish ownership.
    return after;
  };
  const indexed = { runId: 'array-index', edits: [] }, shifted = { runId: 'array-shift', edits: [] };
  await commitTask(task([write('index', { kind: 'message' })]), 'ARRAY_INDEX', identity, indexed, taskResult(), runResult(), signal);
  await commitTask(task([write('shift', { kind: 'message' })]), 'ARRAY_SHIFT', identity, shifted, taskResult(), runResult(), signal);
  assert((await rollbackJournal(indexed, [])).length > 0, 'an array structural edit overlaps existing index ownership');
  assert.deepEqual(mvu.stat_data.list, [11, 11, 20], 'array rollback must not overwrite or shift another run data even when values happen to match');
  releaseJournal(indexed); releaseJournal(shifted);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
