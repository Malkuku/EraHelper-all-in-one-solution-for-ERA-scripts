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
const { emptySettings, ConfigSchema, parseRegexPresets, matchTaskRegex } = require(path.join(root, 'AsyncAnalyze/TaskSchema.ts'));

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
  config.connections = [{ id: 'connection', name: 'connection', comment: '', baseUrl: 'https://api.invalid/v1', model: 'model', secretRef: 'reference-A' }];
  config.presets = [{ id: 'preset', name: 'native', raw: { future: { preserved: ['raw'] }, prompts: [], prompt_order: [] } }];
  const beforeRegexLibrary = structuredClone(config);
  delete beforeRegexLibrary.regexPresets;
  assert.deepEqual(ConfigSchema.parse(beforeRegexLibrary).regexPresets, [], 'existing v1 configs load without reconfiguration');
  config.regexPresets = parseRegexPresets([{ id: 'saved', name: '命名表达式', regex: '/<result>(.*?)<\/result>/gs', replacement: '$1' }]);
  assert.deepEqual(config.regexPresets, [{ id: 'saved', name: '命名表达式', pattern: '<result>(.*?)</result>', flags: 'gs', replacement: '$1' }]);
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
  await assert.rejects(store.replaceSettings({ ...config, regexPresets: [{ ...config.regexPresets[0], pattern: '[' }] }));
  assert.throws(() => parseRegexPresets([{ name: '坏表达式', regex: '/[/g' }]));
  assert.deepEqual(variables, beforeInvalid, 'invalid configuration cannot partially save');

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
  local.set('kat.async-tasks.secrets.v1:config-owner', JSON.stringify({ secret: 123 }));
  assert.throws(() => store.getSecret('secret'), /损坏/);
  variables = { unrelated, async_task_config: { schemaVersion: 0 } };
  await store.load();
  assert(store.configurationError.includes('无效'));
  assert.deepEqual(variables.unrelated, unrelated);
  console.log('PASS: current-schema persistence, reusable regex import/match/reload and legacy data preservation, scoped plaintext cleanup, detached exports, secret references/namespaces and explicit corruption errors');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
