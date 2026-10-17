import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { cloneDeep, get, isEqual, isPlainObject } from 'lodash';
import { captureEditTarget, assertEditBaseline, saveEditTarget, type MvuEditTarget } from '../utils/MvuEditTarget';

interface UpdateBlock { version: number; type: 'del' | 'edit'; content: Record<string, any> }
export interface VersionChange { path: string[]; kind: 'added' | 'deleted' | 'updated'; before?: unknown; after?: unknown }
interface VersionDiff {
  finalData: Record<string, any>;
  changes: VersionChange[];
  target: MvuEditTarget;
  source: { bookName: string; loreName: string; content: string };
  fromVersion: number;
  toVersion: number;
}
const describe = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);

// eslint-disable-next-line pinia/prefer-use-store-naming-convention
export const UseVersionControlStore = defineStore('EraVersionControl', () => {
  const settings = ref({ enable: false, lore_name: '' });
  const settingsError = ref('');
  const settingsOperation = ref<'read' | 'save'>('read');
  const currentVersion = ref(0);
  const targetVersion = ref(0);
  const availableUpdates = ref<UpdateBlock[]>([]);
  const updateLogs = ref<string[]>([]);
  const checkError = ref('');
  const previewDiff = shallowRef<VersionDiff | null>(null);
  let source: VersionDiff['source'] | null = null;

  async function loadSettings() {
    settingsOperation.value = 'read';
    settingsError.value = '';
    try {
      const rule = getVariables({ type: 'script', script_id: getScriptId() }).era_data_rule?.version_control;
      settings.value = { enable: rule?.enable ?? false, lore_name: rule?.lore_name || '' };
    } catch (cause) {
      settingsError.value = `无法读取版本设置：${describe(cause)}。请重试。`;
    }
  }
  async function saveSettings() {
    settingsOperation.value = 'save';
    settingsError.value = '';
    try {
      const saved = cloneDeep(settings.value);
      await updateVariablesWith(vars => ({ ...vars, era_data_rule: { ...vars.era_data_rule, version_control: saved } }),
        { type: 'script', script_id: getScriptId() });
    } catch (cause) {
      settingsError.value = `版本设置保存失败：${describe(cause)}。请重试。`;
      throw new Error(settingsError.value);
    }
  }
  function versionOf(data: Record<string, any>) {
    const raw = get(data, 'system.当前版本');
    const version = raw === undefined || raw === null ? 0 : Number(raw);
    if (!Number.isFinite(version)) throw new Error('当前数据的 system.当前版本 不是有效数值，无法判断更新范围。');
    return version;
  }
  async function fetchCurrentVersion() {
    currentVersion.value = versionOf((await captureEditTarget()).baseline);
    return currentVersion.value;
  }
  async function readSource(bookName: string, loreName: string) {
    if (!bookName || !loreName) throw new Error('请选择包含版本记录的世界书条目。');
    const entries = (await getWorldbook(bookName)).filter(entry => entry.name === loreName);
    if (entries.length !== 1) throw new Error(entries.length ? '版本记录存在重名条目，请先在世界书中改为唯一名称。' : '找不到版本记录条目，请刷新来源后重新选择。');
    if (!entries[0].content.trim()) throw new Error('版本记录条目为空，无法检查更新。');
    return entries[0].content;
  }
  async function parseUpdateRules(bookName: string, loreName: string) {
    checkError.value = '';
    availableUpdates.value = [];
    source = null;
    try {
      const content = await readSource(bookName, loreName);
      const regex = /<(del|edit)\|v="([^"]+)">([\s\S]*?)<\/\1>/g;
      const matches = [...content.matchAll(regex)];
      if (!matches.length) throw new Error('条目中没有有效更新块，应使用 <edit|v="版本号">JSON</edit> 或 del 格式。');
      if (/<(?:del|edit)\|/.test(content.replace(regex, ''))) throw new Error('存在格式损坏或未闭合的更新块，请修正条目后重试。');
      const parsed = matches.map(match => {
        const version = Number(match[2]);
        if (!match[2].trim() || !Number.isFinite(version)) throw new Error(`版本号“${match[2]}”无效。`);
        let block: unknown;
        try { block = JSON.parse(match[3]); } catch (cause) { throw new Error(`版本 ${match[2]} 的 JSON 损坏：${describe(cause)}`); }
        if (!isPlainObject(block)) throw new Error(`版本 ${match[2]} 的更新内容必须是 JSON 对象。`);
        return { version, type: match[1] as 'del' | 'edit', content: block as Record<string, any> };
      }).sort((a, b) => a.version - b.version);
      availableUpdates.value = parsed;
      targetVersion.value = Math.max(currentVersion.value, ...parsed.map(block => block.version));
      source = { bookName, loreName, content };
    } catch (cause) {
      checkError.value = `检查失败：${describe(cause)}`;
      updateLogs.value = [checkError.value];
      throw new Error(checkError.value);
    }
  }
  async function checkAndNotify(bookName: string) {
    if (!settings.value.enable || !settings.value.lore_name || !bookName) return;
    try {
      await fetchCurrentVersion();
      await parseUpdateRules(bookName, settings.value.lore_name);
      if (targetVersion.value > currentVersion.value) toastr.info(`发现变量更新 v${targetVersion.value}，请前往 MVU 助手的变量更新页面查看。`);
    } catch (cause) {
      checkError.value = describe(cause);
      toastr.error(checkError.value, '变量更新检查失败');
    }
  }
  function applyDelete(target: any, rule: any) {
    if (!target || typeof target !== 'object' || !rule || typeof rule !== 'object') return;
    for (const key of Object.keys(rule)) {
      if (key === '$all') Object.keys(target).forEach(child => applyDelete(target[child], rule[key]));
      else if (rule[key] && Object.keys(rule[key]).length > 0) {
        if (Object.hasOwn(target, key) && target[key]) applyDelete(target[key], rule[key]);
      } else delete target[key];
    }
  }
  function applyEdit(target: any, rule: any) {
    if (!target || typeof target !== 'object' || !isPlainObject(rule)) return;
    for (const key of Object.keys(rule)) {
      // JSON may contain these names; defining them must not mutate an object's prototype.
      if (key === '$all') Object.keys(target).forEach(child => { if (target[child] && typeof target[child] === 'object') applyEdit(target[child], rule[key]); });
      else if (isPlainObject(rule[key])) {
        if (!Object.hasOwn(target, key) || !isPlainObject(target[key])) Object.defineProperty(target, key, { value: {}, enumerable: true, configurable: true, writable: true });
        applyEdit(target[key], rule[key]);
      } else Object.defineProperty(target, key, { value: cloneDeep(rule[key]), enumerable: true, configurable: true, writable: true });
    }
  }
  function changesOf(before: Record<string, any>, after: Record<string, any>, path: string[] = []): VersionChange[] {
    const changes: VersionChange[] = [];
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const nextPath = [...path, key];
      if (!Object.hasOwn(before, key)) changes.push({ path: nextPath, kind: 'added', after: cloneDeep(after[key]) });
      else if (!Object.hasOwn(after, key)) changes.push({ path: nextPath, kind: 'deleted', before: cloneDeep(before[key]) });
      else if (isPlainObject(before[key]) && isPlainObject(after[key])) changes.push(...changesOf(before[key], after[key], nextPath));
      else if (!isEqual(before[key], after[key])) changes.push({ path: nextPath, kind: 'updated', before: cloneDeep(before[key]), after: cloneDeep(after[key]) });
    }
    return changes;
  }
  async function calculateUpdate(boundTarget?: MvuEditTarget) {
    if (!source || checkError.value) throw new Error('请先成功检查版本记录。');
    const checkedSource = source;
    const blocks = cloneDeep(availableUpdates.value);
    const target = boundTarget ?? await captureEditTarget();
    assertEditBaseline(target);
    if (checkedSource !== source) throw new Error('检查来源已变化，请重新检查更新。');
    const fromVersion = versionOf(target.baseline);
    currentVersion.value = fromVersion;
    const pending = blocks.filter(block => block.version > fromVersion);
    updateLogs.value = [];
    if (!pending.length) {
      targetVersion.value = fromVersion;
      previewDiff.value = null;
      updateLogs.value = ['检查完成，当前已是最新版本。'];
      return;
    }
    const finalData = cloneDeep(target.baseline);
    for (const update of pending) {
      updateLogs.value.push(`应用 v${update.version} · ${update.type === 'del' ? '删除' : '合并'}`);
      if (update.type === 'del') applyDelete(finalData, update.content);
      else applyEdit(finalData, update.content);
    }
    const toVersion = pending[pending.length - 1].version;
    if (!isPlainObject(finalData.system)) finalData.system = {};
    finalData.system['当前版本'] = toVersion;
    targetVersion.value = toVersion;
    previewDiff.value = { finalData, changes: changesOf(target.baseline, finalData), target, source: { ...checkedSource }, fromVersion, toVersion };
  }
  async function executeFullUpdate() {
    const preview = previewDiff.value;
    if (!preview) throw new Error('没有可执行的预览，请先检查更新。');
    if (checkError.value) throw new Error('版本来源检查失败，请成功重新检查后再更新。');
    await waitGlobalInitialized('Mvu');
    assertEditBaseline(preview.target);
    const content = await readSource(preview.source.bookName, preview.source.loreName);
    assertEditBaseline(preview.target);
    if (content !== preview.source.content) throw new Error('版本记录已变化，旧预览已停止执行。请重新检查更新。');
    const savedTarget = await saveEditTarget(preview.target, preview.finalData);
    currentVersion.value = preview.toVersion;
    targetVersion.value = preview.toVersion;
    previewDiff.value = null;
    updateLogs.value = [`已成功更新至 v${preview.toVersion}。`];
    return savedTarget;
  }
  return { settings, settingsError, settingsOperation, currentVersion, targetVersion, updateLogs, checkError, previewDiff,
    loadSettings, saveSettings, fetchCurrentVersion, parseUpdateRules, calculateUpdate, executeFullUpdate, checkAndNotify };
});
