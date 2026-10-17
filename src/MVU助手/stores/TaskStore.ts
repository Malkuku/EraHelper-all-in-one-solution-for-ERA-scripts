import { defineStore } from 'pinia';
import { ref } from 'vue';
import { klona } from 'klona';
import { parseTaskSettings, emptySettings, TaskSettings } from '../AsyncAnalyze/TaskSchema';

const legacyKeys = ['async_analyze_setting', 'task_config_settings', 'api_config_settings', 'active_rule_name', 'saved_analyze_backup'];
export const useTaskStore = defineStore('KatTasks', () => {
  const settings = ref<TaskSettings>(emptySettings());
  const configurationError = ref('');
  const configurationWarning = ref('');
  const secretKey = () => `kat.async-tasks.secrets.v1:${getScriptId()}`;
  const storage = () => window.parent.localStorage;
  const readSecrets = (): Record<string, string> => {
    const text = storage().getItem(secretKey());
    if (!text) return Object.create(null);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new Error('本地密钥数据损坏，请重新填写'); }
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(secret => typeof secret !== 'string')) throw new Error('本地密钥数据损坏，请重新填写');
    return Object.assign(Object.create(null), value) as Record<string, string>;
  };
  function getSecret(reference: string) { const secrets = readSecrets(); return Object.hasOwn(secrets, reference) ? secrets[reference] : ''; }
  function setSecret(reference: string, secret: string) { const secrets = readSecrets(); secrets[reference] = secret; storage().setItem(secretKey(), JSON.stringify(secrets)); }
  function deleteSecret(reference: string) { const secrets = readSecrets(); delete secrets[reference]; storage().setItem(secretKey(), JSON.stringify(secrets)); }
  async function load() {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    const legacy = legacyKeys.some(key => variables[key] !== undefined);
    // Only redact this module's retired plaintext field, preserving all other user variables.
    if (variables.api_config_settings && typeof variables.api_config_settings === 'object') {
      await updateVariablesWith(current => {
        const old = klona(current.api_config_settings);
        for (const value of Object.values(old ?? {}) as any[]) if (value?.custom_model_settings) delete value.custom_model_settings.apiKey;
        return { ...current, api_config_settings: old };
      }, { type: 'script', script_id: getScriptId() });
    }
    if (variables.async_task_config === undefined) {
      settings.value = emptySettings();
      configurationError.value = legacy ? '旧版分步配置不受支持，请重新配置。旧连接明文密钥已清理。' : '';
      return;
    }
    try { settings.value = parseTaskSettings(variables.async_task_config); }
    catch (error) { configurationError.value = `分步配置无效，请修正或重新导入：${error instanceof Error ? error.message : String(error)}`; return; }
    configurationError.value = '';
  }
  async function replaceSettings(value: unknown) {
    const parsed = parseTaskSettings(value);
    await updateVariablesWith(current => {
      const result: Record<string, any> = { ...current, async_task_config: klona(parsed) };
      for (const key of legacyKeys) delete result[key];
      return result;
    }, { type: 'script', script_id: getScriptId() });
    settings.value = parsed;
    configurationError.value = '';
    configurationWarning.value = '';
    // Credential cleanup cannot undo or misreport a successful configuration save.
    try {
      const retainedReferences = new Set(parsed.connections.flatMap(connection => connection.links.map(link => link.secretRef)));
      const secrets = readSecrets();
      let changed = false;
      for (const reference of Object.keys(secrets)) if (!retainedReferences.has(reference)) {
        delete secrets[reference];
        changed = true;
      }
      if (changed) storage().setItem(secretKey(), JSON.stringify(secrets));
    } catch (error) {
      configurationWarning.value = `配置已保存，本地密钥清理未完成：${error instanceof Error ? error.message : String(error)}`;
    }
  }
  function snapshot(): TaskSettings { return klona(settings.value); }
  return { settings, configurationError, configurationWarning, load, replaceSettings, snapshot, getSecret, setSecret, deleteSecret };
});
