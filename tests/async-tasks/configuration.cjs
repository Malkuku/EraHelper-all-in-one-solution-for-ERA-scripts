// A9 configuration ownership and credential boundaries; no browser, network or model service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { createPinia, setActivePinia } = require('pinia');
setActivePinia(createPinia());
const root = path.resolve(__dirname, '../../src/MVU助手');
const local = new Map();
let scriptId = 'config-owner';
let variables = {};
global.window = { parent: { localStorage: { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) } } };
global.getScriptId = () => scriptId;
global.getVariables = () => structuredClone(variables);
global.updateVariablesWith = async update => { variables = await update(structuredClone(variables)); };
const { useTaskStore } = require(path.join(root, 'stores/TaskStore.ts'));
const { emptySettings, ConfigSchema, TaskSchema, parseTaskSettings, parseRegexPresets, matchTaskRegex, parseRegexInput, formatRegexInput } = require(path.join(root, 'AsyncAnalyze/TaskSchema.ts'));
const { removeTaskResource } = require(path.join(root, 'AsyncAnalyze/TaskConfiguration.ts'));

async function main() {
  const store = useTaskStore();
  const unrelated = { apiKey: 'OTHER_MODULE_SECRET', text: 'USER_CONTENT', nested: { keep: true } };
  const savedRegexLibrary = [{ id: 'user-expression', name: '用户已有正则', pattern: '<result>(.*?)</result>', flags: 's' }];
  variables = {
    unrelated: structuredClone(unrelated),
    saved_regex_configs: structuredClone(savedRegexLibrary),
    async_analyze_setting: { OLD_GROUP: { staged_setting: [{ name: 'retired-task' }] } },
    api_config_settings: { OLD: { model_source: 'external', custom_model_settings: { apiKey: 'RETIRED_SECRET', baseURL: 'https://old.invalid/v1' } } },
  };
  await store.load();
  assert(store.configurationError.includes('重新配置'));
  assert.deepEqual(store.settings.tasks, [], 'legacy tasks must not silently migrate or execute');
  assert.equal(variables.api_config_settings.OLD.custom_model_settings.apiKey, undefined);
  assert.equal(variables.api_config_settings.OLD.custom_model_settings.baseURL, 'https://old.invalid/v1');
  assert.deepEqual(variables.unrelated, unrelated, 'cleanup owns only this module plaintext fields');
  assert.deepEqual(variables.saved_regex_configs, savedRegexLibrary, 'loading must preserve user-owned regex library');

  store.setSecret('reference-A', 'PLUGIN_SECRET_A');
  store.setSecret('__proto__', 'PROTOTYPE_KEY_SECRET');
  store.setSecret('reference-B', 'PLUGIN_SECRET_B');
  assert.equal(store.getSecret('__proto__'), 'PROTOTYPE_KEY_SECRET');
  const config = emptySettings();
  config.automatic.minReceivedChars = 17;
  config.connections = [{ id: 'connection', name: 'connection', comment: '', baseUrl: 'https://api.invalid/v1', model: 'model', secretRef: 'reference-A', presetId: 'preset' }];
  config.presets = [{ id: 'preset', name: 'native', raw: { future: { preserved: ['raw'] }, prompts: [], prompt_order: [] } }];
  const beforeRegexLibrary = structuredClone(config);
  delete beforeRegexLibrary.regexPresets;
  assert.deepEqual(ConfigSchema.parse(beforeRegexLibrary).regexPresets, [], 'current configs may omit the optional reusable regex library');
  config.regexPresets = parseRegexPresets([{ id: 'saved', name: '命名表达式', regex: '/<result>(.*?)<\/result>/gs', replacement: '$1' }]);
  assert.deepEqual(config.regexPresets, [{ id: 'saved', name: '命名表达式', pattern: '<result>(.*?)</result>', flags: 'gs', replacement: '$1' }]);
  assert.deepEqual(parseRegexInput('<tag>(.*?)</tag>'), { pattern: '<tag>(.*?)</tag>', flags: '' });
  assert.deepEqual(parseRegexInput('/<tag>(.*?)<\\/tag>/gi'), { pattern: '<tag>(.*?)<\\/tag>', flags: 'gi' });
  for (const spec of [{ pattern: 'a/b', flags: 'gi' }, { pattern: 'tag', flags: '' }])
    assert.deepEqual(parseRegexInput(formatRegexInput(spec)), spec);
  assert.equal(matchTaskRegex('TAG tag', parseRegexInput('/tag/gi')).length, 2);
  assert.equal(matchTaskRegex('TAG tag', parseRegexInput('tag')).length, 1);
  const response = '<result>甲</result>\n<result>乙</result>';
  assert.deepEqual(matchTaskRegex(response, config.regexPresets[0]).map(match => match[0]), ['<result>甲</result>', '<result>乙</result>']);
  assert.deepEqual(matchTaskRegex(response, { ...config.regexPresets[0], flags: 's' }).map(match => match[0]), ['<result>甲</result>'], 'non-global tester preview must match runtime extraction');
  assert.equal(matchTaskRegex('乙', { pattern: '(?=乙)', flags: 'g' }).length, 1, 'zero-width global expressions must terminate');
  await store.replaceSettings(config);
  assert.equal(store.configurationError, '');
  assert.equal(variables.async_analyze_setting, undefined);
  assert.equal(variables.api_config_settings, undefined);
  assert.deepEqual(variables.unrelated, unrelated);
  assert.deepEqual(variables.saved_regex_configs, savedRegexLibrary, 'saving new tasks must not silently delete reusable legacy regex data');
  const exported = JSON.stringify(store.snapshot());
  assert(!exported.includes('PLUGIN_SECRET') && !exported.includes('PROTOTYPE_KEY_SECRET'));
  assert(!JSON.stringify(variables).includes('PLUGIN_SECRET'));
  assert.equal(store.snapshot().connections[0].secretRef, 'reference-A');
  const detached = store.snapshot(); detached.presets[0].raw.future.preserved.push('mutation');
  assert.deepEqual(store.settings.presets[0].raw.future.preserved, ['raw']);
  store.settings.automatic.minReceivedChars = 999;
  await store.load();
  assert.equal(store.settings.automatic.minReceivedChars, 17, 'reload uses persisted current schema');
  assert.deepEqual(store.settings.regexPresets, config.regexPresets, 'reusable regex library survives save/reload');
  assert.equal(store.getSecret('reference-A'), 'PLUGIN_SECRET_A');
  const beforeInvalid = structuredClone(variables);
  await assert.rejects(store.replaceSettings({ ...config, activeGroupId: 'missing' }));
  await assert.rejects(store.replaceSettings({ ...config, regexPresets: [...config.regexPresets, config.regexPresets[0]] }), /ID 重复/);
  assert.deepEqual(variables, beforeInvalid, 'invalid configuration cannot partially save');
  assert.equal(parseRegexPresets([{ name: '坏表达式', regex: '/[/g' }])[0].pattern, '[', 'an unfinished expression can be imported for editing');

  // v2 has one binding per API; incomplete referenced resources are editable too.
  const boundTask = TaskSchema.parse({ id: 'bound-task', name: 'bound-task', enabled: true, eventName: '', prompt: '', connectionId: 'connection', candidateBooks: [], scan: {}, regexRules: [], output: { mode: 'return' } });
  const sharedResultConfig = { ...config, tasks: [{ ...boundTask, eventName: 'frontend:event', output: { mode: 'event_result' } }] };
  await store.replaceSettings(sharedResultConfig); await store.load();
  assert.equal(store.snapshot().tasks[0].output.mode, 'event_result', 'shared event result mode survives saving and loading');
  assert.equal(JSON.parse(JSON.stringify(store.snapshot())).tasks[0].eventName, 'frontend:event');
  assert.equal(Object.hasOwn(boundTask, 'presetId'), false);
  assert.equal(ConfigSchema.parse({ ...config, connections: [{ ...config.connections[0], presetId: null }] }).connections[0].presetId, null);
  assert.equal(ConfigSchema.parse({ ...config, tasks: [boundTask], connections: [{ ...config.connections[0], presetId: null }] }).tasks.length, 1);
  assert.equal(ConfigSchema.parse({ ...config, connections: [{ ...config.connections[0], presetId: 'absent' }] }).connections[0].presetId, 'absent');
  assert.equal(ConfigSchema.parse({ ...config, tasks: [{ ...boundTask, connectionId: 'absent' }] }).tasks[0].connectionId, 'absent');
  const unfinished = structuredClone(config);
  unfinished.tasks = [{ ...boundTask, name: '', connectionId: '', eventName: 'loop:result', regexRules: [{ id: 'unfinished', stage: 'response', pattern: '[', flags: 'gg', replacement: '', enabled: true }], output: { mode: 'write', writes: [] } }];
  unfinished.connections = [{ ...config.connections[0], name: '', baseUrl: '', model: '', presetId: null }];
  unfinished.presets = [{ ...config.presets[0], name: '', raw: { openai_max_context: 0, openai_max_tokens: 0 } }];
  unfinished.regexPresets = [{ ...config.regexPresets[0], name: '', pattern: '[', flags: 'gg' }];
  await store.replaceSettings(unfinished); await store.load();
  assert.deepEqual(store.snapshot(), ConfigSchema.parse(unfinished), 'unfinished resources, bindings, outputs and expressions survive save/reload');
  await store.replaceSettings(JSON.parse(JSON.stringify(store.snapshot())));
  assert.deepEqual(store.snapshot(), ConfigSchema.parse(unfinished), 'export/import preserves unfinished state without fake API placeholders');

  const legacy = {
    ...config, schemaVersion: 1,
    presets: [...config.presets, { id: 'other-preset', name: '另一预设', raw: { temperature: 0.7 } }],
    connections: [config.connections[0], { ...config.connections[0], id: 'connection:preset:other-preset', name: '未使用 API' }].map(({ presetId, ...connection }) => connection),
    tasks: [
      { ...boundTask, id: 'original-a', presetId: 'preset' },
      { ...boundTask, id: 'original-b', presetId: 'other-preset' },
      { ...boundTask, id: 'same-pair', presetId: 'other-preset' },
    ],
    groups: [{ id: 'migrated-group', name: '迁移规则组', comment: '', taskIds: ['original-a', 'original-b', 'same-pair'] }], activeGroupId: 'migrated-group',
  };
  const original = structuredClone(legacy);
  variables.async_task_config = legacy;
  await store.load();
  assert.equal(store.configurationError, '');
  const migrated = store.snapshot();
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.connections.length, 3, 'one API used by two presets must split, retaining unused API');
  assert.equal(new Set(migrated.connections.map(connection => connection.id)).size, 3, 'split IDs cannot collide with existing APIs');
  assert.equal(migrated.connections.find(connection => connection.name === '未使用 API').presetId, null);
  for (const oldTask of original.tasks) {
    const currentTask = migrated.tasks.find(task => task.id === oldTask.id);
    const connection = migrated.connections.find(connection => connection.id === currentTask.connectionId);
    assert.equal(connection.presetId, oldTask.presetId, 'migration preserves the original API/preset pair');
    assert.equal(connection.secretRef, 'reference-A', 'split APIs share the existing secret reference');
    assert.equal(connection.baseUrl, original.connections[0].baseUrl);
    assert.equal(connection.model, original.connections[0].model);
    assert.equal(store.getSecret(connection.secretRef), 'PLUGIN_SECRET_A');
    assert.equal(Object.hasOwn(currentTask, 'presetId'), false);
  }
  assert.equal(migrated.tasks[1].connectionId, migrated.tasks[2].connectionId, 'equal old pairs reuse one split API');
  assert.deepEqual(legacy, original, 'loading migration cannot mutate its input');
  await store.replaceSettings(migrated); await store.load();
  assert.deepEqual(store.snapshot(), migrated, 'v2 binding and upgraded task routing survive persistence/reload');
  assert.equal(variables.async_task_config.schemaVersion, 2);
  assert.deepEqual(parseTaskSettings(original), migrated, 'repeated v1 imports preserve deterministic routing');
  assert.throws(() => parseTaskSettings({ ...original, tasks: [{ ...original.tasks[0], presetId: 'absent' }] }), /预设不存在/);
  assert.throws(() => parseTaskSettings({ ...original, tasks: [...original.tasks, { ...original.tasks[0], id: 'dangling', connectionId: 'connection:preset:other-preset:1' }] }), /API.*不存在|连接.*不存在/, 'a dangling v1 reference cannot be captured by a generated split ID');
  assert.throws(() => parseTaskSettings({ ...original, connections: [...original.connections, original.connections[0]] }), /重复/);
  assert.throws(() => parseTaskSettings({ ...original, presets: [...original.presets, original.presets[0]] }), /重复/);

  const six = structuredClone(config);
  six.tasks = Array.from({ length: 6 }, (_, index) => ({ ...boundTask, id: `consumer-${index}` }));
  six.groups = [{ id: 'six', name: '六任务组', comment: '', taskIds: six.tasks.map(task => task.id) }]; six.activeGroupId = 'six';
  six.connections.push({ ...six.connections[0], id: 'shared-secret-consumer' });
  await store.replaceSettings(six);
  const afterApi = removeTaskResource(six, 'connection', 'connection');
  assert.equal(six.connections.length, 2, 'draft resource removal cannot mutate its input');
  assert.equal(afterApi.tasks.length, 6); assert(afterApi.tasks.every(task => task.connectionId === ''));
  assert.deepEqual(afterApi.groups[0].taskIds, six.groups[0].taskIds);
  await store.replaceSettings(afterApi); await store.load();
  assert.deepEqual(store.snapshot(), afterApi);
  assert.equal(store.getSecret('reference-A'), 'PLUGIN_SECRET_A', 'deleting an API must preserve a secret still used by another API');
  const afterPreset = removeTaskResource(six, 'preset', 'preset');
  assert(afterPreset.connections.every(connection => connection.presetId === null));
  assert.equal(afterPreset.tasks.length, 6);
  await store.replaceSettings(JSON.parse(JSON.stringify(afterPreset))); await store.load();
  assert.deepEqual(store.snapshot(), afterPreset, 'deleted preset and empty binding survive export/import/save/reload');
  assert.equal(removeTaskResource(six, 'task', six.tasks[0].id).groups[0].taskIds.length, 5);
  const afterGroup = removeTaskResource(six, 'group', 'six');
  assert.equal(afterGroup.activeGroupId, null); assert.equal(afterGroup.tasks.length, 6);
  await store.replaceSettings(removeTaskResource(afterApi, 'connection', 'shared-secret-consumer'));
  assert.equal(store.getSecret('reference-A'), '', 'last API deletion clears its orphaned local secret after save');
  assert.deepEqual(variables.unrelated, unrelated, 'resource deletion preserves other module data');
  store.setSecret('reference-A', 'PLUGIN_SECRET_A');
  await store.replaceSettings(six);
  const originalUpdate = global.updateVariablesWith;
  global.updateVariablesWith = async () => { throw new Error('simulated persist failure'); };
  try {
    await assert.rejects(store.replaceSettings(emptySettings()), /simulated persist failure/);
    assert.equal(store.getSecret('reference-A'), 'PLUGIN_SECRET_A', 'failed persistence cannot clear a still-persisted consumer secret');
    assert.equal(store.snapshot().tasks.length, 6, 'failed save preserves the committed store snapshot');
  } finally { global.updateVariablesWith = originalUpdate; }
  store.setSecret('reference-A', 'PLUGIN_SECRET_A');
  store.setSecret('reference-B', 'PLUGIN_SECRET_B');
  store.setSecret('__proto__', 'PROTOTYPE_KEY_SECRET');

  scriptId = 'other-script';
  assert.equal(store.getSecret('reference-A'), '', 'secret namespaces must not cross script identity');
  store.setSecret('reference-A', 'OTHER_SCRIPT_SECRET');
  scriptId = 'config-owner';
  assert.equal(store.getSecret('reference-A'), 'PLUGIN_SECRET_A');
  store.deleteSecret('reference-A');
  assert.equal(store.getSecret('reference-A'), '');
  assert.equal(store.getSecret('reference-B'), 'PLUGIN_SECRET_B');
  assert.equal(store.getSecret('__proto__'), 'PROTOTYPE_KEY_SECRET');

  local.set('kat.async-tasks.secrets.v1:config-owner', '{broken');
  assert.throws(() => store.getSecret('reference-B'), /损坏/);
  await store.replaceSettings(emptySettings());
  assert.deepEqual(store.snapshot(), emptySettings(), 'broken local secret JSON cannot prevent saving/deleting configuration');
  assert.match(store.configurationWarning, /配置已保存.*密钥清理未完成/);
  assert.throws(() => store.getSecret('reference-B'), /损坏/, 'credential retrieval still reports corruption explicitly');
  local.set('kat.async-tasks.secrets.v1:config-owner', JSON.stringify({ orphan: 'ORPHAN_SECRET' }));
  const originalSetItem = window.parent.localStorage.setItem;
  window.parent.localStorage.setItem = () => { throw new Error('storage is full'); };
  try {
    await store.replaceSettings(emptySettings());
    assert.match(store.configurationWarning, /配置已保存.*密钥清理未完成/);
    assert.deepEqual(variables.async_task_config, emptySettings());
  } finally { window.parent.localStorage.setItem = originalSetItem; }
  await store.replaceSettings(emptySettings());
  assert.equal(store.configurationWarning, '', 'successful cleanup clears the prior cleanup warning');
  assert.equal(store.getSecret('orphan'), '');
  local.set('kat.async-tasks.secrets.v1:config-owner', JSON.stringify({ secret: 123 }));
  assert.throws(() => store.getSecret('secret'), /损坏/);
  variables = { unrelated, async_task_config: { schemaVersion: 0 } };
  await store.load();
  assert(store.configurationError.includes('无效'));
  assert.deepEqual(variables.unrelated, unrelated);
  console.log('PASS: v2 API/preset ownership, v1 pair-preserving split migration/reload and dangling/duplicate rejection, reusable regex library, scoped plaintext cleanup, secret references/namespaces and explicit corruption errors');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
