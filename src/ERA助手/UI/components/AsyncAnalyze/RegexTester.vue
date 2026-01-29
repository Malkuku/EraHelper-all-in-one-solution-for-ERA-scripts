<template>
  <div class="modal-mask" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="modal-wrapper">
      <div class="regex-tester-layout">

        <!-- 顶部标题栏 -->
        <div class="modal-header">
          <h3 class="modal-title">正则调试助手</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="modal-body">
          <!-- 左侧：列表与管理 -->
          <div class="sidebar-panel">
            <div class="sidebar-header">
              <h4 class="panel-title">已存正则库</h4>
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

            <div class="regex-list">
              <div
                v-for="item in asyncAnalyzeStore.savedRegexConfigs"
                :key="item.id"
                class="list-item"
                :class="{ active: currentId === item.id }"
                @click="loadConfig(item)"
              >
                <div class="item-info">
                  <div class="item-name">{{ item.name }}</div>
                  <!-- 显示完整的正则字符串 -->
                  <div class="item-pattern">/{{ item.pattern }}/{{ item.flags }}</div>
                </div>
                <button class="delete-btn" @click.stop="deleteConfig(item.id)">×</button>
              </div>

              <div v-if="asyncAnalyzeStore.savedRegexConfigs.length === 0" class="empty-list">
                暂无保存的正则配置
              </div>
            </div>

            <div class="sidebar-footer">
              <button class="btn full-width" @click="createNew">
                + 新建配置
              </button>
            </div>
          </div>

          <!-- 右侧：编辑与测试 -->
          <div class="main-panel">
            <!-- 顶部保存栏 -->
            <div class="config-bar">
              <div class="input-group flex-1">
                <label>配置名称:</label>
                <input v-model="currentName" type="text" class="form-input" placeholder="给这个正则起个名字" />
              </div>
              <button class="btn primary" @click="saveCurrentConfig" :disabled="!currentName">
                {{ currentId ? '更新保存' : '保存为新配置' }}
              </button>
            </div>

            <!-- 正则输入区 -->
            <div class="section-card flex-1">
              <h4 class="section-title">正则调试</h4>

              <div class="regex-input-area">
                <div class="input-group flex-1">
                  <!-- 不需要选择修饰符，用户输入的字符串就是带修饰的正则 -->
                  <label>正则表达式 (例如: /pattern/flags 或 直接输入 pattern):</label>
                  <input
                    v-model="regexInputString"
                    type="text"
                    class="form-input code-font"
                    :class="{ 'input-error': errorMsg }"
                    placeholder="/(\d+)岁/g"
                  />
                </div>
              </div>

              <div v-if="errorMsg" class="error-banner">⚠️ {{ errorMsg }}</div>

              <!-- 测试分栏 -->
              <div class="split-view">
                <div class="split-pane">
                  <label class="pane-label">测试文本</label>
                  <textarea
                    v-model="testText"
                    class="form-textarea code-font"
                    placeholder="在此粘贴需要匹配的文本..."
                  ></textarea>
                </div>

                <div class="split-pane">
                  <label class="pane-label">
                    匹配详情 <span v-if="matches.length" class="badge">{{ matches.length }}</span>
                  </label>

                  <!-- 结果展示区 -->
                  <div class="results-container">

                    <!-- 新增：运行时提取预览 -->
                    <div class="preview-section" v-if="runtimePreview.length > 0">
                      <div class="preview-header">
                        <span class="preview-title">🚀 运行时提取预览 (实际保存内容)</span>
                      </div>
                      <div class="preview-content">
                        <div v-for="(text, idx) in runtimePreview" :key="idx" class="preview-item">
                          {{ text }}
                        </div>
                      </div>
                    </div>

                    <div v-if="matches.length === 0" class="empty-state">
                      {{ testText ? '未找到匹配项' : '等待输入...' }}
                    </div>

                    <div v-else class="match-list">
                      <div class="list-divider">详细匹配信息</div>
                      <div v-for="(match, index) in matches" :key="index" class="match-item">
                        <div class="match-header">
                          <span class="match-index">#{{ index + 1 }}</span>
                          <div class="match-full">{{ match[0] }}</div>
                        </div>
                        <div v-if="match.length > 1" class="capture-groups">
                          <div v-for="(group, gIndex) in match.slice(1)" :key="gIndex" class="group-item">
                            <span class="group-label">${{ gIndex + 1 }}:</span>
                            <div class="group-value">{{ group }}</div>
                          </div>
                        </div>
                        <div v-else class="no-groups-hint">
                          (无捕获组，运行时将提取完整匹配)
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

// [新增] 计算运行时实际会提取的内容
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
    // 使用统一的解析逻辑
    const { pattern, flags } = RegexUtils.parseRegexString(regexInputString.value);
    if (!pattern) return [];

    // 强制使用 'g' 以便 matchAll 能工作并显示所有结果，
    // 即使 parseRegexString 返回的 flags 没有 g (例如默认 s)，
    // 在调试器中我们也希望能看到所有潜在匹配。
    // 但为了准确性，我们应该尽量尊重用户输入。
    // 如果用户输入 raw string，parseRegexString 返回 's'。
    // 这里为了展示列表，我们临时添加 'g' 如果它不存在?
    // 不，为了严谨，我们应该完全遵循 parseRegexString 的结果。
    // 但是 matchAll 必须要有 'g' 标志吗？在 ES2020 中，String.prototype.matchAll 要求正则必须有 /g 标志。
    // 所以如果 flags 里没有 g，我们需要加上，仅用于这里的展示。

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
  regexInputString.value = `/${config.pattern}/${config.flags}`;
};

const saveCurrentConfig = async () => {
  if (!currentName.value) return;

  const { pattern, flags } = RegexUtils.parseRegexString(regexInputString.value);

  const newConfig: SavedRegexConfig = {
    id: currentId.value || Date.now().toString(),
    name: currentName.value,
    pattern: pattern,
    flags: flags
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
  toastr.success('保存成功');
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
    const validConfigs = parsed.filter((item: any) => item.name && item.pattern);
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
/* 保持原有样式，新增 Preview 样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-wrapper {
  width: 90vw;
  height: 85vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;

  .modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #6b7280;
    cursor: pointer;
    line-height: 1;
    &:hover { color: #111827; }
  }
}

.modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 15px;
  gap: 15px;
}

.regex-tester-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* 侧边栏样式 */
.sidebar-panel {
  width: 240px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;

  .panel-title {
    margin: 0 0 10px 0;
    font-size: 15px;
    font-weight: 700;
    color: #111827;
  }
}

.regex-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.list-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  &.active {
    background: #e0e7ff;
    border-color: #c7d2fe;
    .item-name { color: #312e81; font-weight: 600; }
  }
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-pattern {
  font-size: 12px;
  color: #4b5563;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  opacity: 0;
  background: none;
  border: none;
  color: #dc2626;
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;

  .list-item:hover & { opacity: 1; }
}

.empty-list {
  text-align: center;
  color: #6b7280;
  font-size: 13px;
  margin-top: 20px;
}

.sidebar-footer {
  padding: 10px;
  border-top: 1px solid #e5e7eb;
}

/* 主区域样式 */
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 0;
}

.config-bar {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 15px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.section-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.section-title {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  border-left: 4px solid #4f46e5;
  padding-left: 8px;
}

/* 通用表单样式 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 13px;
    font-weight: 600;
    color: #000000 !important;
  }
}

.form-input, .form-textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff !important;
  color: #000000 !important;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
  }
}

.form-textarea {
  resize: none;
  height: 100%;
  min-height: 150px;
}

.code-font { font-family: 'Menlo', 'Monaco', 'Consolas', monospace; }
.flex-1 { flex: 1; }
.full-width { width: 100%; }

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;

  &:hover:not(:disabled) { background: #f3f4f6; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &.primary {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
    &:hover:not(:disabled) { background: #4338ca; }
  }
}

.regex-input-area {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.error-banner {
  background-color: #fef2f2;
  color: #b91c1c;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 10px;
  border: 1px solid #fecaca;
}

/* Split View */
.split-view {
  display: flex;
  gap: 15px;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.split-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-label {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}

.badge {
  background: #e0e7ff;
  color: #312e81;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.results-container {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
}

/* Preview Section */
.preview-section {
  margin-bottom: 15px;
  border: 1px solid #d1fae5;
  background: #ecfdf5;
  border-radius: 6px;
  overflow: hidden;
}

.preview-header {
  background: #d1fae5;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #065f46;
}

.preview-content {
  padding: 10px;
}

.preview-item {
  font-family: monospace;
  font-size: 13px;
  color: #064e3b;
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 8px;
  border-bottom: 1px dashed #a7f3d0;
  padding-bottom: 8px;
  &:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
}

.list-divider {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 10px 0 5px 0;
  font-weight: 700;
}

.empty-state {
  color: #6b7280;
  text-align: center;
  margin-top: 40px;
  font-size: 13px;
}

.match-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.match-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  width: 100%;
  min-width: 0;
}

.match-index {
  color: #6b7280;
  font-size: 11px;
  font-family: monospace;
  flex-shrink: 0;
  margin-top: 4px;
}

.match-full {
  color: #047857;
  font-family: monospace;
  font-weight: 700;
  display: block;
  flex: 1;
  width: 100%;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  background: #f0fdf4;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #d1fae5;
}

.capture-groups {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #e5e7eb;
}

.no-groups-hint {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
  margin-top: 4px;
}

.group-item {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-family: monospace;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
}

.group-label {
  color: #4b5563;
  font-size: 11px;
  min-width: 24px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 4px;
}

.group-value {
  color: #1f2937;
  display: block;
  flex: 1;
  width: 100%;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Dark Mode */
.dark-mode {
  .modal-wrapper { background: #1f2937; }
  .modal-header { background: #111827; border-color: #374151; }
  .modal-title { color: #f3f4f6; }
  .close-btn { color: #9ca3af; &:hover { color: #fff; } }

  .sidebar-panel, .config-bar, .section-card { background: #1f2937; border-color: #374151; }
  .sidebar-header, .sidebar-footer { border-color: #374151; }
  .panel-title, .section-title { color: #f3f4f6; }

  .list-item {
    &:hover { background: #374151; }
    &.active { background: #312e81; border-color: #4338ca; .item-name { color: #a5b4fc; } }
  }
  .item-name { color: #e5e7eb; }
  .item-pattern { color: #9ca3af; }

  .input-group label, .pane-label { color: #d1d5db !important; }

  .form-input, .form-textarea {
    background: #374151 !important;
    border-color: #4b5563;
    color: #f3f4f6 !important;
    &:focus { border-color: #818cf8; background: #1f2937 !important; }
  }

  .results-container { background: #111827; border-color: #374151; }
  .match-item { background: #1f2937; border-color: #374151; }

  .match-full {
    color: #34d399;
    background: #064e3b;
    border-color: #065f46;
  }

  .group-value {
    color: #e5e7eb;
    background: #374151;
  }

  .group-label { color: #9ca3af; }

  .btn {
    background: #374151; border-color: #4b5563; color: #e5e7eb;
    &:hover:not(:disabled) { background: #4b5563; }
    &.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
  }

  .preview-section {
    border-color: #065f46;
    background: #064e3b;
  }
  .preview-header {
    background: #065f46;
    color: #a7f3d0;
  }
  .preview-item {
    color: #d1fae5;
    border-bottom-color: #047857;
  }
}
</style>
