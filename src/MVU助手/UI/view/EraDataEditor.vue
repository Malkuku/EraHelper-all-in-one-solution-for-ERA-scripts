<template>
  <section class="variable-editor" :class="{ 'dark-mode': uiStore.darkMode }" aria-labelledby="variable-title">
    <header class="page-heading">
      <div><p class="eyebrow">消息变量</p><h2 id="variable-title">编辑变量</h2><p>修改先保留为会话草稿，保存后写入下方绑定的消息。切页和关闭窗口会保留草稿。</p></div>
      <span class="state-badge">{{ hasChanges ? '草稿未保存' : target ? '与加载基线一致' : '尚未加载' }}</span>
    </header>
    <section class="target-panel" aria-label="编辑目标">
      <strong>{{ target ? targetDescription(target) : '尚未绑定消息目标' }}</strong>
      <p>仅修改此消息的 stat_data。出现新楼层、切换聊天 / 消息页或外部变量变化后，旧草稿会停止提交。</p>
    </section>
    <div class="toolbar">
      <button :disabled="loading || saving" @click="refreshData">{{ loading ? '正在加载…' : '重新加载目标' }}</button>
      <button class="primary" :disabled="loading || saving || !hasChanges || !target || !!jsonParseError" @click="saveData">{{ saving ? '保存中…' : '保存变量更改' }}</button>
      <button :disabled="!currentData || !!jsonParseError" @click="exportDraft">导出当前草稿</button>
      <button v-if="editMode === 'raw' && jsonParseError" @click="exportRawText">保留原始文本</button>
      <label class="file-button">导入完整数据<input type="file" accept=".json,application/json" :disabled="loading || saving" @change="importFile($event, false)" /></label>
      <label class="file-button">导入差分数据<input type="file" accept=".json,application/json" :disabled="loading || saving" @change="importFile($event, true)" /></label>
    </div>
    <p v-if="error" class="error notice" role="alert">{{ error }}</p>
    <p v-if="statusMessage" class="notice" role="status">{{ statusMessage }}</p>
    <p v-if="!target && !loading" class="empty-state">选择有消息的聊天后，点击“重新加载目标”。加载失败不会清除已有草稿。</p>
    <fieldset v-if="currentData" class="editing-fields" :disabled="saving || loading">
      <div class="editor-controls">
        <div class="segmented" aria-label="编辑方式">
          <button :class="{ selected: editMode === 'tree' }" :aria-pressed="editMode === 'tree'" @click="switchToTreeMode">树形编辑</button>
          <button :class="{ selected: editMode === 'raw' }" :aria-pressed="editMode === 'raw'" @click="switchToRawMode">原始 JSON</button>
        </div>
        <button v-if="editMode === 'raw'" :disabled="!!jsonParseError" @click="formatJson">格式化 JSON</button>
        <button v-else :aria-expanded="showAddField" @click="showAddField = !showAddField">{{ showAddField ? '收起添加字段' : '添加字段' }}</button>
      </div>
      <form v-if="showAddField && editMode === 'tree'" class="add-field" @submit.prevent="addField">
        <h3>添加字段</h3>
        <label>字段路径<input v-model="newField.path" placeholder="例如：user.info.name" required /></label>
        <p class="hint">用点分隔对象层级；已有路径将被覆盖，仍需保存才会生效。</p>
        <label>值类型<select v-model="newField.type"><option value="string">字符串</option><option value="number">数字</option><option value="boolean">布尔值</option><option value="null">null</option><option value="object">JSON 对象</option><option value="array">JSON 数组</option></select></label>
        <label v-if="newField.type !== 'null'">值<textarea v-model="newField.value" rows="2" :placeholder="newField.type === 'boolean' ? 'true 或 false' : newField.type === 'object' ? '{}' : newField.type === 'array' ? '[]' : ''" /></label>
        <button type="submit">添加到草稿</button>
      </form>
      <template v-if="editMode === 'tree'">
        <label class="search-field">搜索路径或值<input v-model="searchQuery" placeholder="输入角色名、变量路径或数值…" /></label>
        <div class="tree-surface"><JsonTreeEdit v-model:data="currentData" :search-query="searchQuery" /></div>
        <p v-if="!Object.keys(currentData).length" class="hint">当前是空对象，可添加字段或切到 JSON 编辑。</p>
      </template>
      <label v-else class="raw-field">当前草稿 JSON<textarea v-model="rawJsonString" class="raw-editor" spellcheck="false" @input="validateRawJson" /></label>
      <p v-if="jsonParseError" class="error" role="alert">{{ jsonParseError }}。修正后才能保存或导出 JSON；可先保留原始文本。</p>
    </fieldset>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, shallowRef, watch } from 'vue';
import { cloneDeep, isEqual, isPlainObject, merge, set } from 'lodash';
import { useEraEditStore } from '../../stores/EraEditStore';
import { useUiStore } from '../../stores/UIStore';
import { assertEditBaseline, targetDescription, type MvuEditTarget } from '../../utils/MvuEditTarget';
import { Modal } from '../../utils/modal';
import JsonTreeEdit from '../components/JsonNode/JsonTreeEdit.vue';

const store = useEraEditStore();
const uiStore = useUiStore();
const target = shallowRef<MvuEditTarget | null>(null);
const currentData = ref<Record<string, any> | null>(null);
const loading = ref(false), saving = ref(false);
const error = ref(''), statusMessage = ref('');
const editMode = ref<'tree' | 'raw'>('tree');
const rawJsonString = ref(''), jsonParseError = ref(''), searchQuery = ref('');
const showAddField = ref(false);
const newField = ref({ path: '', type: 'string', value: '' });
const describe = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);
function readDraft(): Record<string, any> {
  const draft = editMode.value === 'raw' ? JSON.parse(rawJsonString.value) : currentData.value;
  if (!isPlainObject(draft)) throw new Error('变量数据必须是 JSON 对象，不能是数组、null 或标量');
  return draft;
}
const hasChanges = computed(() => {
  if (!currentData.value || !target.value) return false;
  try { return !isEqual(readDraft(), target.value.baseline); } catch { return true; }
});
watch(hasChanges, changed => {
  if (changed && statusMessage.value === '变量更改已保存到绑定消息。') statusMessage.value = '';
});
function setDraft(data: Record<string, any>) {
  currentData.value = cloneDeep(data);
  rawJsonString.value = JSON.stringify(data, null, 2);
  jsonParseError.value = '';
}
function validateRawJson() {
  statusMessage.value = '';
  try { readDraft(); jsonParseError.value = ''; } catch (cause) { jsonParseError.value = describe(cause); }
}
function switchToTreeMode() {
  if (editMode.value === 'tree') return;
  try { currentData.value = cloneDeep(readDraft()); editMode.value = 'tree'; jsonParseError.value = ''; }
  catch (cause) { jsonParseError.value = describe(cause); }
}
function switchToRawMode() {
  if (editMode.value === 'raw') return;
  rawJsonString.value = JSON.stringify(currentData.value, null, 2);
  editMode.value = 'raw';
}
function formatJson() {
  try { rawJsonString.value = JSON.stringify(readDraft(), null, 2); jsonParseError.value = ''; }
  catch (cause) { jsonParseError.value = describe(cause); }
}
function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportDraft() {
  error.value = '';
  try {
    download('mvu-stat-data-草稿.json', JSON.stringify(readDraft(), null, 2), 'application/json;charset=utf-8');
    statusMessage.value = '已导出当前有效草稿；导出不会保存到消息。';
  } catch (cause) { error.value = `无法导出 JSON：${describe(cause)}。草稿保留，可导出原始文本。`; }
}
function exportRawText() {
  download('mvu-stat-data-未解析草稿.txt', rawJsonString.value, 'text/plain;charset=utf-8');
  statusMessage.value = '已保留原始编辑文本，该文件尚不是有效变量 JSON。';
}
async function importFile(event: Event, difference: boolean) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  error.value = ''; statusMessage.value = '';
  try {
    if (!target.value) throw new Error('请先加载消息目标，再导入变量草稿。');
    const imported = JSON.parse(await file.text());
    if (!isPlainObject(imported)) throw new Error('导入内容必须是 JSON 对象。');
    const base = difference ? cloneDeep(readDraft()) : null;
    if (!(await Modal.confirm(difference ? '合并差分到草稿' : '替换变量草稿', `${difference ? '合并文件中的字段，已有字段可能被覆盖。' : '文件将替换整个当前草稿。'}此操作尚未写入消息，之后仍需保存。`))) return;
    setDraft(difference ? merge({}, base, imported) : imported);
    statusMessage.value = '文件已导入草稿，尚未保存到消息。';
  } catch (cause) { error.value = `导入失败：${describe(cause)} 原草稿保留。`; }
}
async function refreshData() {
  if (loading.value || saving.value) return;
  if (hasChanges.value && !(await Modal.confirm('放弃草稿并重新加载？', '重新加载成功后会替换当前未保存草稿。可先取消并导出草稿备份；读取失败会保留草稿。'))) return;
  loading.value = true; error.value = ''; statusMessage.value = '';
  try {
    const loaded = await store.loadTarget();
    setDraft(loaded.baseline); target.value = loaded;
    statusMessage.value = '目标与变量已加载。';
  } catch (cause) { error.value = `加载失败：${describe(cause)} 已有草稿保留，可重试。`; }
  finally { loading.value = false; }
}
async function saveData() {
  if (!target.value || !hasChanges.value || saving.value) return;
  error.value = ''; statusMessage.value = '';
  try {
    const data = cloneDeep(readDraft());
    const bound = target.value;
    if (!(await Modal.confirm('保存变量更改', `将完整变量草稿写入 ${targetDescription(bound)}。其他入口已修改的变量不会被旧快照覆盖。`))) return;
    saving.value = true;
    const saved = await store.saveEraEdit(data, bound);
    target.value = saved; setDraft(data);
    statusMessage.value = '变量更改已保存到绑定消息。';
  } catch (cause) { error.value = `保存未完成：${describe(cause)}`; }
  finally { saving.value = false; }
}
function addField() {
  error.value = ''; statusMessage.value = '';
  try {
    const path = newField.value.path.trim();
    if (!path || path.split(/[.[\]]/).some(part => ['__proto__', 'prototype', 'constructor'].includes(part))) throw new Error('请输入有效且安全的字段路径。');
    const type = newField.value.type;
    const text = newField.value.value;
    const value: any = type === 'string' ? text : type === 'null' ? null : JSON.parse(text);
    if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('请输入有效数字。');
    if (type === 'boolean' && typeof value !== 'boolean') throw new Error('布尔值须填写 true 或 false。');
    if (type === 'object' && !isPlainObject(value)) throw new Error('请输入 JSON 对象。');
    if (type === 'array' && !Array.isArray(value)) throw new Error('请输入 JSON 数组。');
    const next = cloneDeep(readDraft());
    set(next, path, value); setDraft(next);
    showAddField.value = false; newField.value = { path: '', type: 'string', value: '' };
    statusMessage.value = '字段已添加到草稿，尚未保存。';
  } catch (cause) { error.value = `添加失败：${describe(cause)}`; }
}
onMounted(refreshData);
onActivated(() => {
  if (!target.value) return;
  try { assertEditBaseline(target.value); } catch (cause) { statusMessage.value = ''; error.value = describe(cause); }
});
</script>

<style scoped lang="scss">
.variable-editor { color: var(--mvu-text, #172033); display: grid; gap: 16px; min-width: 0; padding: 4px; }
.editing-fields { border: 0; padding: 0; margin: 0; min-width: 0; display: grid; gap: 16px; }
.page-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
h2 { margin: 2px 0 8px; font-size: 23px; letter-spacing: -.03em; }
h3 { font-size: 15px; margin: 0; }
p { margin: 0; line-height: 1.65; overflow-wrap: anywhere; }
.page-heading p:not(.eyebrow), .hint, .target-panel p { color: var(--mvu-muted, #64748b); font-size: 13px; }
.eyebrow { color: var(--mvu-accent, #4f46e5); font-size: 12px; font-weight: 600; }
.target-panel, .add-field { border: 1px solid var(--mvu-line, #dce3ef); background: var(--mvu-soft, #f5f7fb); border-radius: 12px; padding: 16px; display: grid; gap: 8px; overflow-wrap: anywhere; }
.state-badge { font-size: 12px; border: 1px solid var(--mvu-line, #dce3ef); padding: 5px 10px; border-radius: 20px; white-space: nowrap; }
.toolbar, .editor-controls, .segmented { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
button, .file-button { border: 1px solid var(--mvu-control-line, #7c8ca3); color: var(--mvu-text, #172033); background: var(--mvu-panel, white); border-radius: 8px; padding: 9px 12px; font: inherit; font-size: 13px; min-height: 40px; cursor: pointer; box-sizing: border-box; }
button:disabled { opacity: .5; cursor: not-allowed; }
button.primary, .segmented .selected { background: var(--mvu-accent, #4f46e5); border-color: transparent; color: var(--mvu-on-accent, white); }
.file-button { position: relative; display: inline-flex; align-items: center; }
.file-button input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }
.file-button:focus-within, button:focus-visible { outline: 3px solid var(--mvu-accent, #4f46e5); outline-offset: 2px; }
label { display: grid; gap: 7px; font-size: 13px; }
input, select, textarea { box-sizing: border-box; max-width: 100%; width: 100%; padding: 10px 12px; font: inherit; color: var(--mvu-text, #172033); border: 1px solid var(--mvu-control-line, #7c8ca3); background: var(--mvu-panel, white); border-radius: 8px; }
textarea { resize: vertical; }
.raw-editor { min-height: 340px; font: 13px/1.7 ui-monospace, monospace; tab-size: 2; }
.notice { padding: 12px; border-radius: 8px; background: var(--mvu-soft, #f5f7fb); font-size: 13px; }
.error { color: var(--mvu-danger, #b91c1c); white-space: pre-wrap; }
.tree-surface { border: 1px solid var(--mvu-line, #dce3ef); border-radius: 10px; padding: 8px; max-width: 100%; min-width: 0; overflow: auto; }
.empty-state { padding: 24px; color: var(--mvu-muted, #64748b); }
@media (max-width: 600px) { .toolbar button, .toolbar .file-button { flex: 1 1 140px; justify-content: center; } .raw-editor { min-height: 240px; } }
</style>
