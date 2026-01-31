<template>
  <!-- 采用参考文件的遮罩层结构 -->
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container" :class="{ 'dark-mode': uiStore.darkMode }">
      <div class="regex-tester-layout">

        <!-- 标题栏 -->
        <div class="task-header">
          <div class="task-title-edit">
            <span class="label">正则调试助手</span>
          </div>
          <div class="task-actions">
            <button class="btn icon-btn close-btn" @click="$emit('close')">×</button>
          </div>
        </div>

        <!-- 主体内容：采用 list-editor 左右/上下结构 -->
        <div class="list-editor">

          <!-- 左侧：正则库列表 (移动端会变到底部) -->
          <div class="list-sidebar">
            <div class="sidebar-header-area">
              <FileImportExport
                accept=".json"
                import-text="导入"
                export-text="导出"
                :show-buttons="true"
                @import-confirmed="handleImport"
                @export-data="handleExport"
                @error="handleError"
                @message="handleMessage"
              />
            </div>

            <div class="scroll-list custom-scrollbar">
              <div
                v-for="item in asyncAnalyzeStore.savedRegexConfigs"
                :key="item.id"
                class="sub-item"
                :class="{ active: currentId === item.id }"
                @click="loadConfig(item)"
              >
                <div class="item-name">{{ item.name }}</div>
                <div class="item-pattern">{{ item.regex }}</div>
                <button class="delete-icon" @click.stop="deleteConfig(item.id)">×</button>
              </div>

              <div v-if="asyncAnalyzeStore.savedRegexConfigs.length === 0" class="empty-sub">
                暂无配置
              </div>
            </div>

            <div class="sidebar-footer-area">
              <button class="btn primary full small" @click="createNew">+ 新建配置</button>
            </div>
          </div>

          <!-- 右侧：编辑与测试区 -->
          <div class="list-content custom-scrollbar">

            <!-- 顶部：配置名称与保存 -->
            <div class="form-grid two-col-mobile">
              <div class="form-group flex-grow">
                <label>配置名称</label>
                <input
                  v-model="currentName"
                  type="text"
                  placeholder="给这个正则起个名字"
                />
              </div>
              <div class="form-group no-label-align">
                <button class="btn primary full" @click="saveCurrentConfig" :disabled="!currentName">
                  {{ currentId ? '更新保存' : '保存新配置' }}
                </button>
              </div>
            </div>

            <!-- 正则输入 -->
            <div class="form-group">
              <label>
                正则表达式
                <span class="tip inline-tip">例如: /pattern/flags</span>
              </label>
              <input
                v-model="regexInputString"
                type="text"
                class="code-font"
                :class="{ 'input-error': errorMsg }"
                placeholder="/(\d+)岁/g"
              />
              <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
            </div>

            <!-- 预览区 (运行时提取) -->
            <div class="preview-box" v-if="runtimePreview.length > 0">
              <div class="preview-title">🚀 运行时提取预览 (实际保存内容)</div>
              <div class="preview-items custom-scrollbar">
                <div v-for="(text, idx) in runtimePreview" :key="idx" class="p-item">{{ text }}</div>
              </div>
            </div>

            <!-- 测试文本与结果 (上下分栏) -->
            <div class="test-split-area">
              <!-- 测试文本 -->
              <div class="form-group full-height">
                <label>测试文本</label>
                <textarea
                  v-model="testText"
                  class="code-font"
                  placeholder="在此粘贴需要匹配的文本..."
                ></textarea>
              </div>

              <!-- 匹配结果 -->
              <div class="form-group full-height result-group">
                <label>
                  匹配详情
                  <span v-if="matches.length" class="badge">{{ matches.length }}</span>
                </label>

                <div class="results-box custom-scrollbar">
                  <div v-if="matches.length === 0" class="empty-state">
                    {{ testText ? '未找到匹配项' : '等待输入...' }}
                  </div>

                  <div v-else class="match-list">
                    <div v-for="(match, index) in matches" :key="index" class="match-card">
                      <div class="match-header">
                        <span class="m-index">#{{ index + 1 }}</span>
                        <span class="m-content">{{ match[0] }}</span>
                      </div>
                      <div v-if="match.length > 1" class="m-groups">
                        <div v-for="(group, gIndex) in match.slice(1)" :key="gIndex" class="g-row">
                          <span class="g-label">${{ gIndex + 1 }}:</span>
                          <span class="g-val">{{ group }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAsyncAnalyzeStore, SavedRegexConfig } from '@/ERA助手/stores/AsyncAnalyzeStore';
import { eraLogger } from '@/ERA助手/utils/EraHelperLogger';
import FileImportExport from '@/ERA助手/UI/components/File/FileImportExport.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';
import { RegexUtils } from '@/Utils/RegexUtils';

const uiStore = useUiStore();
const emit = defineEmits(['close']);
const asyncAnalyzeStore = useAsyncAnalyzeStore();

// 编辑器状态
const currentId = ref<string>('');
const currentName = ref('');
const regexInputString = ref('/.*/g');
const testText = ref('');
const errorMsg = ref('');

// 计算运行时实际会提取的内容
const runtimePreview = computed(() => {
  if (!regexInputString.value || !testText.value) return [];
  return RegexUtils.extractContentByRegex(testText.value, regexInputString.value);
});

// 计算匹配结果 (用于调试显示详情)
const matches = computed(() => {
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  errorMsg.value = '';
  if (!regexInputString.value || !testText.value) return [];

  try {
    const { pattern, flags } = RegexUtils.parseRegexString(regexInputString.value);
    if (!pattern) return [];

    // 强制加上 g 标志以便 matchAll 显示所有结果
    let displayFlags = flags;
    if (!displayFlags.includes('g')) {
      displayFlags += 'g';
    }

    const re = new RegExp(pattern, displayFlags);
    return Array.from(testText.value.matchAll(re));
  } catch (e: any) {
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    errorMsg.value = e.message;
    return [];
  }
});

// --- 列表管理逻辑 ---

const createNew = () => {
  currentId.value = '';
  currentName.value = '';
  regexInputString.value = '//g';
  testText.value = '';
};

const loadConfig = (config: SavedRegexConfig) => {
  currentId.value = config.id;
  currentName.value = config.name;
  regexInputString.value = config.regex;
};

const saveCurrentConfig = async () => {
  if (!currentName.value) return;

  const newConfig: SavedRegexConfig = {
    id: currentId.value || Date.now().toString(),
    name: currentName.value,
    regex: regexInputString.value,
  };

  if (currentId.value) {
    const index = asyncAnalyzeStore.savedRegexConfigs.findIndex(c => c.id === currentId.value);
    if (index !== -1) {
      asyncAnalyzeStore.savedRegexConfigs[index] = newConfig;
    }
  } else {
    asyncAnalyzeStore.savedRegexConfigs.push(newConfig);
    currentId.value = newConfig.id;
  }

  await asyncAnalyzeStore.saveModelSettings();
};

const deleteConfig = async (id: string) => {
  if (!confirm('确定要删除这个正则配置吗？')) return;
  asyncAnalyzeStore.savedRegexConfigs = asyncAnalyzeStore.savedRegexConfigs.filter(c => c.id !== id);
  if (currentId.value === id) {
    createNew();
  }
  await asyncAnalyzeStore.saveModelSettings();
};

// --- 导入导出逻辑 ---
const handleExport = () => {
  const dataStr = JSON.stringify(asyncAnalyzeStore.savedRegexConfigs, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `era_regex_configs_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleImport = async (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error('格式错误');

    const validConfigs = parsed.map((item: any) => {
      if (item.regex) return item;
      if (item.pattern) {
        return {
          id: item.id || Date.now().toString() + Math.random(),
          name: item.name,
          regex: `/${item.pattern}/${item.flags || ''}`,
          note: item.note
        };
      }
      return null;
    }).filter(item => item && item.name && item.regex);

    if (validConfigs.length === 0) throw new Error('无有效数据');

    asyncAnalyzeStore.savedRegexConfigs = validConfigs;
    await asyncAnalyzeStore.saveModelSettings();
    createNew();
  } catch (e: any) {
    alert('导入失败: ' + e.message);
  }
};

const handleError = (msg: string) => eraLogger.log('RegexTester Error: ' + msg);
const handleMessage = (msg: string, type: string) => console.log(`[${type}] ${msg}`);
</script>

<style scoped lang="scss">
/* 复用参考文件的基础 Modal 样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  width: 90%;
  max-width: 1000px;
  height: 85vh;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #000000;

  &.dark-mode {
    background: #1f2937;
    color: #e2e8f0;

    .task-header { border-bottom-color: #374151; }
    .label { color: #e2e8f0 !important; }
    .close-btn { color: #e2e8f0; &:hover { background: #374151; } }

    .list-editor { border-color: #4b5563; }
    .list-sidebar { background: #111827; border-right-color: #4b5563; }
    .list-content { background: #1f2937; }

    .sub-item {
      color: #9ca3af; border-bottom-color: #4b5563;
      &:hover { background: #374151; }
      &.active { background: #1f2937; color: #818cf8; }
    }
    .item-name { color: #e2e8f0; }
    .empty-sub { color: #9ca3af; }

    .form-group {
      label { color: #e2e8f0 !important; }
      input, textarea {
        background: #374151 !important;
        color: #e2e8f0 !important;
        border-color: #4b5563 !important;
        &:focus { border-color: #818cf8 !important; }
      }
    }

    .results-box { background: #111827; border-color: #374151; }
    .match-card { background: #1f2937; border-color: #374151; }
    .m-content { background: #064e3b; color: #34d399; border-color: #065f46; }
    .g-val { background: #374151; color: #e2e8f0; }

    .preview-box { background: #064e3b; border-color: #065f46; }
    .preview-title { background: #065f46; color: #a7f3d0; }
    .p-item { color: #d1fae5; border-bottom-color: #047857; }

    .btn.primary { background: #4f46e5; color: #fff; }
    .btn { background: #374151; color: #e2e8f0; border-color: #4b5563; }
  }
}

.regex-tester-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 15px;
}

/* Header */
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.task-title-edit .label {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.close-btn {
  font-size: 24px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; background: transparent; border: none; cursor: pointer; color: #111827;
  &:hover { background: #f3f4f6; }
}

/* List Editor Layout */
.list-editor {
  display: flex;
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

.list-sidebar {
  width: 220px;
  border-right: 1px solid #d1d5db;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
  flex-shrink: 0;
}

.sidebar-header-area { padding: 8px; border-bottom: 1px solid #e5e7eb; }
.sidebar-footer-area { padding: 8px; border-top: 1px solid #e5e7eb; }

.scroll-list { flex: 1; overflow-y: auto; }

.sub-item {
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
  &:hover { background: #e5e7eb; }
  &.active { background: #ffffff; border-left: 3px solid #4f46e5; }

  .item-name { font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
  .item-pattern { font-size: 11px; color: #6b7280; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .delete-icon {
    position: absolute; right: 5px; top: 5px;
    background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer; opacity: 0;
  }
  &:hover .delete-icon { opacity: 1; }
}

.empty-sub { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }

/* Main Content */
.list-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Forms */
.form-grid {
  display: flex; gap: 10px;
  .flex-grow { flex: 1; }
  .no-label-align { display: flex; align-items: flex-end; padding-bottom: 1px; }
}

.form-group {
  margin-bottom: 0;
  label {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 700; color: #000000; margin-bottom: 4px;
  }
  input, textarea {
    width: 100%; padding: 6px 8px;
    border: 1px solid #d1d5db; border-radius: 4px;
    font-size: 13px; background: #ffffff; color: #000000;
    &:focus { border-color: #4f46e5; outline: none; }
  }
  &.full-height { flex: 1; display: flex; flex-direction: column; textarea { flex: 1; resize: none; min-height: 80px; } }
}

.code-font { font-family: 'Menlo', 'Monaco', 'Consolas', monospace; }
.tip { font-size: 11px; color: #6b7280; font-weight: 400; }
.error-msg { color: #dc2626; font-size: 11px; margin-top: 2px; }
.input-error { border-color: #dc2626 !important; background: #fef2f2 !important; }

/* Preview & Results */
.preview-box {
  border: 1px solid #d1fae5; background: #ecfdf5; border-radius: 4px; overflow: hidden; flex-shrink: 0;
}
.preview-title { background: #d1fae5; padding: 4px 8px; font-size: 11px; font-weight: 700; color: #065f46; }
.preview-items { padding: 6px; max-height: 80px; overflow-y: auto; }
.p-item { font-family: monospace; font-size: 12px; color: #064e3b; border-bottom: 1px dashed #a7f3d0; margin-bottom: 4px; }

.test-split-area {
  display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 200px;
}

.results-box {
  flex: 1; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; padding: 8px; overflow-y: auto;
}

.badge { background: #e0e7ff; color: #312e81; padding: 1px 6px; border-radius: 8px; font-size: 10px; }
.empty-state { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }

.match-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 6px; margin-bottom: 6px;
}
.match-header { display: flex; gap: 6px; align-items: flex-start; margin-bottom: 4px; }
.m-index { font-size: 10px; color: #6b7280; font-family: monospace; margin-top: 2px; }
.m-content {
  flex: 1; font-family: monospace; font-size: 12px; color: #047857; background: #f0fdf4;
  padding: 2px 4px; border-radius: 2px; border: 1px solid #d1fae5; word-break: break-all;
}
.m-groups { border-top: 1px dashed #e5e7eb; padding-top: 4px; margin-top: 4px; }
.g-row { display: flex; gap: 4px; font-family: monospace; font-size: 11px; margin-top: 2px; }
.g-label { color: #6b7280; min-width: 20px; }
.g-val { color: #1f2937; background: #f3f4f6; padding: 0 4px; border-radius: 2px; flex: 1; word-break: break-all; }

/* Buttons */
.btn {
  padding: 6px 12px; border-radius: 4px; border: 1px solid #d1d5db; cursor: pointer; font-size: 12px; font-weight: 500; background: #fff; color: #1f2937;
  &.primary { background: #4f46e5; color: white; border-color: #4f46e5; &:hover { background: #4338ca; } }
  &.full { width: 100%; }
  &.small { padding: 4px 8px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* Custom Scrollbar */
.custom-scrollbar {
  &::-webkit-scrollbar { width: 4px; height: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
  &::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
}

/* =========================================
   移动端适配 (Max Width 768px)
   ========================================= */
@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-start; /* 顶部对齐，防止键盘顶起时居中计算错误 */
  }

  .modal-container {
    width: 100%;
    height: 100%;
    max-width: none;
    border-radius: 0;
  }

  .regex-tester-layout {
    padding: 10px;
  }

  .list-editor {
    flex-direction: column; /* 垂直排列 */
    border: none; /* 移动端去掉边框以节省空间 */
  }

  /* 调整顺序：编辑区在上方(order 1)，列表区在下方(order 2) */
  .list-content {
    order: 1;
    flex: 1; /* 占据主要空间 */
    border-bottom: 1px solid #e5e7eb;
    padding: 0 0 10px 0; /* 减少内边距 */
  }

  .list-sidebar {
    order: 2;
    width: 100%;
    height: 160px; /* 固定底部高度 */
    border-right: none;
    border-top: 1px solid #d1d5db;
  }

  /* 移动端表单调整 */
  .two-col-mobile {
    flex-direction: row; /* 保持并排，按钮小一点 */
    .form-group { margin-bottom: 8px; }
  }

  .test-split-area {
    min-height: 0; /* 允许收缩 */
  }

  .result-group {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .results-box {
    min-height: 100px; /* 保证结果区最小高度 */
  }

  .delete-icon { opacity: 1; color: #ef4444; font-size: 18px; padding: 5px; }
}
</style>
