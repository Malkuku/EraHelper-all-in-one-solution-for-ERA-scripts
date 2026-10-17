<template>
  <section class="version-page" :class="{ 'dark-mode': uiStore.darkMode }" aria-labelledby="version-title">
    <header class="page-heading"><p class="eyebrow">消息变量</p><h2 id="version-title">变量版本更新</h2><p>读取角色卡世界书中的版本规则，比较本条消息的变量，审查后再写入。</p></header>
    <section class="source-panel" aria-label="更新来源">
      <div class="section-header"><h3>更新来源</h3><button :disabled="busy" @click="refreshSources">{{ sourceLoading ? '读取中…' : '刷新来源与目标' }}</button></div>
      <label class="toggle"><input v-model="versionStore.settings.enable" type="checkbox" :disabled="busy" @change="saveSettings" />启用版本更新检查</label>
      <p class="hint">设置自动保存。变量数据只有在审查并执行更新后才会改变。</p>
      <div class="source-grid">
        <div><span class="field-label">角色卡主世界书</span><strong>{{ currentBookName || '未绑定主世界书' }}</strong></div>
        <label>版本记录条目<select v-model="versionStore.settings.lore_name" :disabled="busy || !currentBookName || !versionStore.settings.enable" @change="saveSettings"><option value="">请选择包含版本规则的条目</option><option v-if="versionStore.settings.lore_name && !loreOptions.includes(versionStore.settings.lore_name)" :value="versionStore.settings.lore_name">{{ versionStore.settings.lore_name }}（当前不可用）</option><option v-for="lore in loreOptions" :key="lore" :value="lore">{{ lore }}</option></select></label>
      </div>
      <p>{{ currentTarget ? targetDescription(currentTarget) : '刷新后绑定当前消息目标' }}</p>
      <p v-if="!currentBookName && !sourceLoading" class="hint">请先为当前角色卡绑定主世界书，然后刷新来源。已有预览不会因读取失败而丢失。</p>
      <div class="section-actions"><button class="primary" :disabled="!canCheck || busy" @click="checkUpdates">{{ checking ? '检查中…' : versionStore.previewDiff ? '重新检查并生成预览' : '检查更新' }}</button><span role="status">{{ checkStatus }}</span></div>
    </section>
    <p v-if="sourceError" class="error notice" role="alert">{{ sourceError }}</p>
    <p v-if="versionStore.settingsError" class="error notice" role="alert">{{ versionStore.settingsError }}<button :disabled="busy" @click="retrySettings">{{ versionStore.settingsOperation === 'read' ? '重新读取设置' : '重试保存设置' }}</button></p>
    <p v-if="error || versionStore.checkError" class="error notice" role="alert">{{ error || versionStore.checkError }}</p>
    <p v-if="success" class="success notice" role="status">{{ success }}</p>
    <template v-if="versionStore.previewDiff">
      <section class="preview-panel" aria-label="变量更新预览">
        <div class="section-header"><div><p class="eyebrow">待审查预览 · 尚未写入</p><h3>v{{ versionStore.previewDiff.fromVersion }} → v{{ versionStore.previewDiff.toVersion }}</h3></div><button @click="exportPreview">导出预览与原始变量</button></div>
        <p class="target-description">{{ targetDescription(versionStore.previewDiff.target) }}</p>
        <p class="hint">来源：{{ versionStore.previewDiff.source.bookName }} / {{ versionStore.previewDiff.source.loreName }}。预览绑定检查时的数据，目标或来源变化会阻止执行。</p>
        <div class="counts"><span>新增 {{ countChanges('added') }}</span><span>修改 {{ countChanges('updated') }}</span><span>删除 {{ countChanges('deleted') }}</span></div>
        <label>搜索变更路径<input v-model="changeSearch" placeholder="例如：hero.hp 或背包" /></label>
        <div class="changes-list">
          <article v-for="change in visibleChanges" :key="JSON.stringify(change.path)" class="change-card" :class="change.kind">
            <div class="change-heading"><code>{{ change.path.map(part => JSON.stringify(part)).join(' / ') }}</code><span>{{ changeLabels[change.kind] }}</span></div>
            <div class="value-pair"><div><span class="field-label">原值</span><pre>{{ change.kind === 'added' ? '（原字段不存在）' : formatValue(change.before) }}</pre></div><div><span class="field-label">更新后</span><pre>{{ change.kind === 'deleted' ? '（字段将删除）' : formatValue(change.after) }}</pre></div></div>
          </article>
          <p v-if="!visibleChanges.length" class="hint">没有匹配的变更路径。</p>
        </div>
        <details class="final-preview"><summary>查看更新后的完整变量</summary><pre>{{ formatValue(versionStore.previewDiff.finalData) }}</pre></details>
        <div class="execute-panel"><p>执行会将上述更新后的完整变量写入绑定消息。请先核对删除、数组覆盖和关键数值；可导出原始变量作为备份。</p><button class="danger" :disabled="busy || !!versionStore.checkError || previewSourceChanged" @click="executeUpdate">{{ executing ? '更新中…' : '确认并执行变量更新' }}</button></div>
        <p v-if="previewSourceChanged" class="error">来源选择已变化，旧预览保留供比较。请重新检查后执行。</p>
      </section>
    </template>
    <section v-else class="empty-state"><h3>{{ checkState === 'current' ? '当前已是最新版本' : '先检查，再审查和执行' }}</h3><p>{{ checkState === 'current' ? `绑定消息当前为 v${versionStore.currentVersion}，本次检查没有更高版本的更新。` : '检查失败、来源不可用与没有更新会分别显示，不会跳过损坏的更新块。' }}</p></section>
    <details v-if="versionStore.updateLogs.length" class="logs"><summary>检查与更新记录</summary><ul><li v-for="(log, index) in versionStore.updateLogs" :key="index">{{ log }}</li></ul></details>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, shallowRef } from 'vue';
import { useUiStore } from '../../stores/UIStore';
import { UseVersionControlStore, type VersionChange } from '../../stores/UseVersionControlStore';
import { captureEditTarget, assertEditBaseline, targetDescription, type MvuEditTarget } from '../../utils/MvuEditTarget';
import { Modal } from '../../utils/modal';
const uiStore = useUiStore(), versionStore = UseVersionControlStore();
const currentBookName = ref(''), loreOptions = ref<string[]>([]);
const currentTarget = shallowRef<MvuEditTarget | null>(null);
const sourceLoading = ref(false), checking = ref(false), executing = ref(false), settingsSaving = ref(false);
const sourceError = ref(''), error = ref(''), success = ref(''), changeSearch = ref('');
const checkState = ref<'idle' | 'current' | 'preview' | 'error'>('idle');
const busy = computed(() => sourceLoading.value || checking.value || executing.value || settingsSaving.value);
const canCheck = computed(() => versionStore.settings.enable && !!currentBookName.value && !!versionStore.settings.lore_name && !sourceError.value);
const previewSourceChanged = computed(() => !!versionStore.previewDiff && (versionStore.previewDiff.source.bookName !== currentBookName.value || versionStore.previewDiff.source.loreName !== versionStore.settings.lore_name || !versionStore.settings.enable));
const checkStatus = computed(() => checking.value ? '正在读取并校验全部规则…' : checkState.value === 'current' ? '本次检查没有更新' : checkState.value === 'preview' ? '预览已生成，尚未写入' : checkState.value === 'error' ? '检查未完成，请查看原因并重试' : '尚未检查');
const changeLabels = { added: '新增', deleted: '删除', updated: '修改' };
const visibleChanges = computed(() => versionStore.previewDiff?.changes.filter(change => change.path.join('.').toLowerCase().includes(changeSearch.value.toLowerCase())) ?? []);
const describe = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);
const formatValue = (value: unknown) => JSON.stringify(value, null, 2);
const countChanges = (kind: VersionChange['kind']) => versionStore.previewDiff?.changes.filter(change => change.kind === kind).length ?? 0;
async function saveSettings() {
  settingsSaving.value = true; success.value = ''; checkState.value = 'idle';
  try { await versionStore.saveSettings(); } catch { /* Store owns the visible retryable settings error. */ }
  finally { settingsSaving.value = false; }
}
async function retrySettings() {
  if (versionStore.settingsOperation === 'save') return saveSettings();
  settingsSaving.value = true;
  try { await versionStore.loadSettings(); } finally { settingsSaving.value = false; }
}
async function refreshSources() {
  if (busy.value) return;
  sourceLoading.value = true; sourceError.value = ''; success.value = ''; checkState.value = 'idle';
  try {
    const target = await captureEditTarget();
    const book = getCharWorldbookNames('current').primary ?? '';
    const entries = book ? await getWorldbook(book) : [];
    assertEditBaseline(target);
    currentTarget.value = target; currentBookName.value = book;
    loreOptions.value = [...new Set(entries.map(entry => entry.name))];
  } catch (cause) { sourceError.value = `来源或目标读取失败：${describe(cause)}。已有选择与预览保留，请刷新重试。`; }
  finally { sourceLoading.value = false; }
}
async function checkUpdates() {
  if (busy.value || !canCheck.value) return;
  checking.value = true; error.value = ''; success.value = '';
  try {
    const target = await captureEditTarget();
    const book = getCharWorldbookNames('current').primary ?? '';
    if (book !== currentBookName.value) throw new Error('角色卡主世界书已变化，请先刷新来源。');
    await versionStore.parseUpdateRules(book, versionStore.settings.lore_name);
    assertEditBaseline(target);
    await versionStore.calculateUpdate(target);
    currentTarget.value = target;
    changeSearch.value = '';
    checkState.value = versionStore.previewDiff ? 'preview' : 'current';
  } catch (cause) { error.value = `${describe(cause)} 旧预览如有则保留，请核对后重新检查。`; checkState.value = 'error'; }
  finally { checking.value = false; }
}
async function executeUpdate() {
  const preview = versionStore.previewDiff;
  if (!preview || busy.value || previewSourceChanged.value) return;
  if (!(await Modal.confirm('执行变量更新', `将 ${targetDescription(preview.target)} 从 v${preview.fromVersion} 更新为 v${preview.toVersion}，涉及 ${preview.changes.length} 处变更。请确认已审查旧值与新值，必要时先导出备份。`))) return;
  executing.value = true; error.value = ''; success.value = '';
  try {
    currentTarget.value = await versionStore.executeFullUpdate();
    checkState.value = 'current'; success.value = `已成功更新绑定消息至 v${preview.toVersion}。`;
  } catch (cause) { error.value = `更新未完成：${describe(cause)} 预览保留，修正原因后可重新检查。`; }
  finally { executing.value = false; }
}
function exportPreview() {
  const preview = versionStore.previewDiff;
  if (!preview) return;
  const value = { target: targetDescription(preview.target), fromVersion: preview.fromVersion, toVersion: preview.toVersion, original: preview.target.baseline, changes: preview.changes, updated: preview.finalData };
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `mvu-变量更新-${preview.fromVersion}-${preview.toVersion}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
onMounted(async () => { await versionStore.loadSettings(); await refreshSources(); });
onActivated(() => {
  const target = versionStore.previewDiff?.target;
  if (!target) return;
  try { assertEditBaseline(target); } catch (cause) { success.value = ''; error.value = describe(cause); }
});
</script>

<style scoped lang="scss">
.version-page { display: grid; gap: 18px; min-width: 0; color: var(--mvu-text, #172338); padding: 4px; }
h2 { font-size: 23px; margin: 2px 0 8px; letter-spacing: -.03em; } h3 { font-size: 16px; margin: 0; }
p { margin: 0; line-height: 1.65; overflow-wrap: anywhere; }
.page-heading > p:last-child, .hint, .field-label { font-size: 13px; color: var(--mvu-muted, #53637b); }
.eyebrow { font-size: 12px; color: var(--mvu-accent, #4b4de0); font-weight: 600; }
.source-panel, .preview-panel { display: grid; gap: 16px; padding: 20px; border: 1px solid var(--mvu-line, #d7dfea); border-radius: 12px; background: var(--mvu-panel, #fff); min-width: 0; }
.section-header, .section-actions { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.section-actions { justify-content: flex-start; } .section-actions span { font-size: 13px; color: var(--mvu-muted, #53637b); }
.source-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr)); gap: 16px; align-items: start; }
.source-grid > div, label:not(.toggle) { display: grid; gap: 8px; font-size: 13px; }
.toggle { display: flex; gap: 9px; align-items: center; } .toggle input { width: 18px; height: 18px; }
button { border: 1px solid var(--mvu-control-line, #7c8ca3); color: var(--mvu-text, #172338); background: var(--mvu-panel, #fff); border-radius: 8px; padding: 10px 13px; min-height: 40px; font: inherit; font-size: 13px; cursor: pointer; }
button:disabled { opacity: .5; cursor: not-allowed; }
.primary { background: var(--mvu-accent, #4b4de0); color: var(--mvu-on-accent, white); border-color: transparent; } .danger { border-color: var(--mvu-danger, #b42336); color: var(--mvu-danger, #b42336); font-weight: 600; }
input:not([type=checkbox]), select { box-sizing: border-box; width: 100%; padding: 10px 12px; font: inherit; color: var(--mvu-text, #172338); border: 1px solid var(--mvu-control-line, #7c8ca3); border-radius: 8px; background: var(--mvu-panel, white); }
.notice { padding: 12px 16px; background: var(--mvu-soft, #f6f8fb); border-radius: 8px; font-size: 13px; white-space: pre-wrap; }
.error { color: var(--mvu-danger, #b42336); } .success { color: var(--mvu-success, #14734d); }
.counts { display: flex; flex-wrap: wrap; gap: 8px; } .counts span { padding: 4px 10px; border: 1px solid var(--mvu-line, #d7dfea); border-radius: 20px; font-size: 12px; }
.changes-list { display: grid; gap: 12px; } .change-card { border: 1px solid var(--mvu-line, #d7dfea); border-radius: 10px; overflow: hidden; }
.change-heading { padding: 10px 14px; background: var(--mvu-soft, #f6f8fb); display: flex; gap: 12px; justify-content: space-between; align-items: start; } .change-heading code { overflow-wrap: anywhere; } .change-heading span { font-size: 12px; white-space: nowrap; }
.deleted .change-heading span { color: var(--mvu-danger, #b42336); } .added .change-heading span { color: var(--mvu-success, #14734d); }
.value-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: var(--mvu-line, #d7dfea); } .value-pair > div { padding: 12px 14px; background: var(--mvu-panel, white); min-width: 0; }
pre { margin: 8px 0 0; font: 12px/1.6 ui-monospace, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.execute-panel { border-top: 1px solid var(--mvu-line, #d7dfea); padding-top: 16px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; } .execute-panel p { flex: 1 1 280px; color: var(--mvu-muted, #53637b); font-size: 13px; }
.final-preview, .logs { border: 1px solid var(--mvu-line, #d7dfea); padding: 12px 16px; border-radius: 10px; min-width: 0; } summary { cursor: pointer; font-size: 13px; font-weight: 600; }
.empty-state { padding: 30px 20px; text-align: center; border: 1px dashed var(--mvu-line, #d7dfea); border-radius: 12px; } .empty-state p { margin-top: 10px; color: var(--mvu-muted, #53637b); font-size: 13px; }
@media (max-width: 600px) { .source-panel, .preview-panel { padding: 14px; } .value-pair { grid-template-columns: 1fr; } .section-actions button, .execute-panel button { width: 100%; } }
</style>
