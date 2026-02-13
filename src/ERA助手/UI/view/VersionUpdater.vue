<template>
  <div class="version-updater-container" :class="{ 'dark-mode': uiStore.darkMode }">

    <!-- ==================== 第一页：配置与检查 ==================== -->
    <template v-if="step === 1">
      <!-- 顶部控制栏 -->
      <div class="control-panel">
        <!-- 功能开关 -->
        <div class="input-group checkbox-group">
          <label class="toggle-switch">
            <input type="checkbox" v-model="versionStore.settings.enable" @change="handleSettingChange">
            <span class="slider"></span>
          </label>
          <span class="toggle-label">启用版本控制</span>
        </div>

        <!-- 自动显示当前世界书 -->
        <div class="input-group info-only">
          <label>当前世界书:</label>
          <div class="static-value" :title="currentBookName || '未找到绑定世界书'">
            {{ currentBookName || '未找到(请绑定世界书)' }}
          </div>
        </div>

        <!-- 条目选择 -->
        <div class="input-group flex-grow">
          <label>版本记录条目:</label>
          <div class="select-wrapper">
            <SearchableSelect
              v-model="versionStore.settings.lore_name"
              :options="loreOptions"
              :disabled="!currentBookName || !versionStore.settings.enable"
              placeholder="请选择包含更新日志的条目..."
              @change="handleSettingChange"
            />
          </div>
        </div>

        <button
          @click="goToPreview"
          class="btn primary"
          :disabled="!canCheck"
        >
          检查更新
        </button>
      </div>

      <div class="main-content">
        <!-- 左侧：状态与日志 -->
        <div class="status-panel full-width-mobile">
          <div class="version-info">
            <div class="v-card">
              <span>当前版本</span>
              <strong>{{ versionStore.currentVersion > 0 ? versionStore.currentVersion.toFixed(1) : '未初始化' }}</strong>
            </div>
            <div class="arrow">➜</div>
            <div class="v-card">
              <span>最新版本</span>
              <strong :class="{ 'has-update': hasUpdate }">
                {{ versionStore.targetVersion > 0 ? versionStore.targetVersion.toFixed(1) : '-' }}
              </strong>
            </div>
          </div>

          <div class="logs custom-scrollbar">
            <h3>更新日志</h3>
            <ul v-if="versionStore.updateLogs.length > 0">
              <li v-for="(log, index) in versionStore.updateLogs" :key="index">{{ log }}</li>
            </ul>
            <div v-else class="empty-log">
              {{ versionStore.settings.enable ? '暂无日志' : '功能已关闭' }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== 第二页：差异预览与执行 ==================== -->
    <template v-else-if="step === 2">
      <div class="preview-header">
        <button class="btn secondary" @click="step = 1">
          <i class="fas fa-arrow-left"></i> 返回
        </button>
        <h3>更新预览 (v{{ versionStore.currentVersion }} ➜ v{{ versionStore.targetVersion }})</h3>
      </div>

      <div class="diff-content custom-scrollbar">
        <!-- 阶段 1: 删除的内容 -->
        <div class="diff-section deleted" v-show="reviewStage >= 1">
          <div class="section-title">
            <span class="icon">🗑️</span> 即将删除的字段 (Deleted)
          </div>
          <div class="tree-box">
            <JsonTree :data="diffData.deleted || {}" />
            <div v-if="isEmpty(diffData.deleted)" class="empty-tip">无删除内容</div>
          </div>
        </div>

        <!-- 阶段 2: 更新的内容 -->
        <div class="diff-section updated" v-show="reviewStage >= 2">
          <div class="section-title">
            <span class="icon">📝</span> 即将更新的字段 (Updated)
          </div>
          <div class="tree-box">
            <JsonTree :data="diffData.updated || {}" />
            <div v-if="isEmpty(diffData.updated)" class="empty-tip">无变更内容</div>
          </div>
        </div>

        <!-- 阶段 3: 新增的内容 -->
        <div class="diff-section added" v-show="reviewStage >= 3">
          <div class="section-title">
            <span class="icon">✨</span> 即将插入的字段 (Inserted)
          </div>
          <div class="tree-box">
            <JsonTree :data="diffData.added || {}" />
            <div v-if="isEmpty(diffData.added)" class="empty-tip">无新增内容</div>
          </div>
        </div>

        <!-- 最终预览 (可选，如果需要看合并后的样子) -->
        <div class="diff-section final" v-show="reviewStage >= 4">
          <div class="warning-box">
            ⚠️ 确认无误后，点击下方按钮执行更新。此操作将覆盖当前数据。
          </div>
        </div>
      </div>

      <div class="action-footer">
        <div class="progress-indicator">
          步骤: {{ reviewStage }}/4
        </div>
        <button
          class="btn"
          :class="reviewStage === 4 ? 'danger' : 'primary'"
          @click="advanceReview"
        >
          {{ nextActionLabel }}
        </button>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import SearchableSelect from '@/ERA助手/UI/components/Dialog/SearchableSelect.vue';
import { UseVersionControlStore } from '@/ERA助手/stores/UseVersionControlStore';
import JsonTree from '@/ERA助手/UI/components/JsonNode/JsonTree.vue';

const versionStore = UseVersionControlStore();
const uiStore = useUiStore();

const currentBookName = ref('');
const loreOptions = ref<string[]>([]);

// 页面流控制
const step = ref(1); // 1: Config, 2: Preview
const reviewStage = ref(0); // 0: Start, 1: Show Del, 2: Show Upd, 3: Show Add, 4: Ready

const hasUpdate = computed(() => versionStore.targetVersion > versionStore.currentVersion);
const canCheck = computed(() =>
  versionStore.settings.enable &&
  currentBookName.value &&
  versionStore.settings.lore_name
);

const diffData = computed(() => {
  if (!versionStore.previewDiff) return { deleted: {}, updated: {}, added: {} };
  return versionStore.previewDiff.diff || {
    deleted: { _note: "Store未提供详细Diff" },
    updated: {},
    added: {}
  };
});

const nextActionLabel = computed(() => {
  switch (reviewStage.value) {
    case 0: return '开始审查 (显示删除字段)';
    case 1: return '下一步 (显示更新字段)';
    case 2: return '下一步 (显示新增字段)';
    case 3: return '审查完毕 (准备执行)';
    case 4: return '确认并执行全量更新';
    default: return '未知状态';
  }
});

const isEmpty = (obj: any) => {
  return !obj || Object.keys(obj).length === 0;
};

// 初始化
onMounted(async () => {
  try {
    await versionStore.loadSettings();
    await versionStore.fetchCurrentVersion();
    currentBookName.value = getCharWorldbookNames('current').primary as string;
    if (currentBookName.value) {
      const lores = await WorldInfoUtil.getCurrentCharWorldBookLores();
      loreOptions.value = lores || [];
    }
  } catch (e) {
    console.error('初始化版本更新器失败', e);
  }
});

const handleSettingChange = async () => {
  await versionStore.saveSettings();
  if (!versionStore.settings.enable) {
    versionStore.previewDiff = null;
    versionStore.updateLogs = [];
  }
};

const goToPreview = async () => {
  if (!canCheck.value) return;

  // 1. 计算更新
  await versionStore.parseUpdateRules(currentBookName.value, versionStore.settings.lore_name);
  await versionStore.calculateUpdate();

  // 2. 如果有结果，进入第二页
  if (versionStore.previewDiff) {
    step.value = 2;
    reviewStage.value = 0;
  }
};

const advanceReview = async () => {
  if (reviewStage.value < 4) {
    reviewStage.value++;
    // 自动滚动到底部
    setTimeout(() => {
      const container = document.querySelector('.diff-content');
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  } else {
    await doUpdate();
  }
};

const doUpdate = async () => {
  if (!confirm(`确定要从 v${versionStore.currentVersion} 更新到 v${versionStore.targetVersion} 吗？\n此操作不可逆！`)) return;
  await versionStore.executeFullUpdate();
  step.value = 1; // 回到首页
  reviewStage.value = 0;
};

</script>

<style scoped lang="scss">
.version-updater-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #334155;
  font-size: 13px;
  position: relative;
  overflow: hidden; /* 防止整体滚动 */
}

/* ==================== 第一页：配置与检查 ==================== */
.control-panel {
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  align-items: flex-end;
  flex-wrap: wrap; /* 允许桌面端缩放时换行 */

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    label { font-size: 12px; font-weight: 600; color: #64748b; }
    .select-wrapper { width: 100%; }
    .static-value {
      padding: 0 12px; height: 36px; line-height: 36px;
      background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px;
      color: #475569; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
    }
    &.info-only { flex-shrink: 0; }
    &.flex-grow { flex: 1; min-width: 200px; max-width: 300px; }
    &.checkbox-group {
      flex-direction: row; align-items: center; height: 36px; margin-bottom: 2px;
      .toggle-label { font-weight: 600; color: #475569; }
    }
  }

  /* --- 移动端适配：控制栏 --- */
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch; /* 子元素拉伸填满 */
    gap: 12px;

    .input-group {
      width: 100%;
      &.flex-grow { max-width: 100%; }
      .static-value { max-width: 100%; }
    }

    /* 按钮在移动端全宽 */
    .btn { width: 100%; margin-top: 4px; }
  }
}

/* Toggle Switch */
.toggle-switch {
  position: relative; display: inline-block; width: 40px; height: 22px; margin-right: 8px; flex-shrink: 0;
  input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
    background-color: #cbd5e1; transition: .4s; border-radius: 22px;
    &:before {
      position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px;
      background-color: white; transition: .4s; border-radius: 50%;
    }
  }
  input:checked + .slider { background-color: #6366f1; }
  input:checked + .slider:before { transform: translateX(18px); }
}

.main-content {
  display: flex; flex: 1; gap: 16px; margin-top: 16px; overflow: hidden;
  flex-direction: column; /* 确保内容垂直排列 */
}

.status-panel {
  width: 100%;
  height: 100%; /* 占满剩余高度 */
  display: flex; flex-direction: column; gap: 16px;
  overflow: hidden; /* 防止自身滚动，让内部 logs 滚动 */
}

.version-info {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; padding: 16px; border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
  flex-shrink: 0; /* 防止被压缩 */

  .v-card {
    display: flex; flex-direction: column; align-items: center;
    span { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
    strong { font-size: 20px; color: #334155; font-family: monospace; }
    strong.has-update { color: #10b981; }
  }
  .arrow { color: #cbd5e1; font-size: 18px; }

  /* --- 移动端适配：版本信息卡片 --- */
  @media (max-width: 400px) {
    padding: 12px;
    .v-card strong { font-size: 16px; }
  }
}

.logs {
  flex: 1; background: #1e293b; color: #e2e8f0; padding: 12px;
  border-radius: 8px; font-family: monospace; font-size: 12px;
  overflow-y: auto; border: 1px solid #334155;
  h3 { margin: 0 0 8px 0; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #334155; padding-bottom: 4px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { margin-bottom: 4px; line-height: 1.4; word-break: break-all; }
  .empty-log { color: #64748b; font-style: italic; text-align: center; margin-top: 20px; }
}

/* ==================== 第二页：差异预览与执行 ==================== */
.preview-header {
  display: flex; align-items: center; gap: 16px;
  padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px;
  flex-shrink: 0;
  h3 { margin: 0; font-size: 16px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}

.diff-content {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;
  padding-right: 4px;
  min-height: 0; /* Firefox flexbox fix */
}

.diff-section {
  border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
  background: #fff;
  animation: fadeIn 0.3s ease-in-out;
  flex-shrink: 0; /* 防止被压缩 */

  .section-title {
    padding: 8px 12px; font-weight: 600; font-size: 13px;
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid #f1f5f9;
  }

  .tree-box {
    padding: 12px;
    max-height: 300px; overflow: auto;
    /* 移动端优化：允许横向滚动查看长JSON */
    -webkit-overflow-scrolling: touch;
  }

  .empty-tip { color: #94a3b8; font-style: italic; font-size: 12px; }

  /* 颜色主题 */
  &.deleted {
    border-color: #fecaca;
    .section-title { background: #fef2f2; color: #dc2626; }
  }
  &.updated {
    border-color: #bfdbfe;
    .section-title { background: #eff6ff; color: #2563eb; }
  }
  &.added {
    border-color: #bbf7d0;
    .section-title { background: #f0fdf4; color: #16a34a; }
  }
  &.final {
    border-color: #e2e8f0;
    .section-title { background: #f8fafc; color: #475569; }
  }
}

.action-footer {
  margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
  flex-shrink: 0;

  .progress-indicator { font-weight: 600; color: #64748b; }
  .btn { min-width: 200px; }

  /* --- 移动端适配：底部操作栏 --- */
  @media (max-width: 640px) {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;

    .progress-indicator { text-align: center; margin-bottom: 4px; }
    .btn { width: 100%; min-width: unset; height: 44px; /* 增加点击区域 */ }
  }
}

.warning-box {
  background-color: #fff7ed; color: #c2410c; padding: 12px;
  font-size: 12px; border-top: 1px solid #ffedd5;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 通用按钮 */
.btn {
  padding: 0 16px; height: 36px; border: none; border-radius: 6px;
  cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 13px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  white-space: nowrap;

  &.primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
    &:hover { filter: brightness(1.1); }
    &:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }
  }
  &.secondary {
    background: #f1f5f9; color: #475569;
    &:hover { background: #e2e8f0; }
  }
  &.danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
    &:hover { filter: brightness(1.1); }
  }
}

.custom-scrollbar {
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; &:hover { background: #94a3b8; } }
}

/* ---------- 黑夜模式适配 ---------- */
.dark-mode {
  color: #e2e8f0;

  .control-panel {
    border-bottom-color: #4a5568;
    .input-group {
      label { color: #a0aec0; }
      .static-value { background-color: #2d3748; border-color: #4a5568; color: #e2e8f0; }
      &.checkbox-group .toggle-label { color: #cbd5e0; }
    }
  }

  .toggle-switch {
    .slider { background-color: #4a5568; }
    input:checked + .slider { background-color: #6366f1; }
  }

  .version-info {
    background: #2d3748; border-color: #4a5568;
    .v-card { span { color: #a0aec0; } strong { color: #e2e8f0; } strong.has-update { color: #34d399; } }
    .arrow { color: #4a5568; }
  }

  .logs { background: #1a202c; border-color: #4a5568; h3 { color: #a0aec0; border-bottom-color: #4a5568; } }

  /* 第二页黑夜模式 */
  .preview-header {
    border-bottom-color: #4a5568;
    h3 { color: #e2e8f0; }
  }

  .btn.secondary { background: #4a5568; color: #e2e8f0; &:hover { background: #2d3748; } }
  .action-footer { border-top-color: #4a5568; .progress-indicator { color: #a0aec0; } }

  .diff-section {
    background: #2d3748; border-color: #4a5568;
    .tree-box { color: #e2e8f0; }

    &.deleted {
      border-color: #7f1d1d;
      .section-title { background: #450a0a; color: #fca5a5; border-bottom-color: #7f1d1d; }
    }
    &.updated {
      border-color: #1e3a8a;
      .section-title { background: #172554; color: #93c5fd; border-bottom-color: #1e3a8a; }
    }
    &.added {
      border-color: #14532d;
      .section-title { background: #052e16; color: #86efac; border-bottom-color: #14532d; }
    }
    &.final {
      border-color: #4a5568;
      .section-title { background: #1a202c; color: #cbd5e0; border-bottom-color: #4a5568; }
    }
  }

  .warning-box {
    background-color: #431407; color: #fdba74; border-top-color: #7c2d12;
  }

  .custom-scrollbar {
    &::-webkit-scrollbar-thumb { background: #4a5568; &:hover { background: #718096; } }
  }
}
</style>

