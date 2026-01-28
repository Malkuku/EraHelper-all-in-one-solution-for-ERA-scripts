<template>
  <div class="modal-mask" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="modal-wrapper">
      <div class="regex-tester-layout">

        <!-- 顶部标题栏 (新增) -->
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
                  <!-- 3. 不需要选择修饰符，用户输入的字符串就是带修饰的正则 -->
                  <label>正则表达式 (例如: /pattern/flags):</label>
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
                    匹配结果 <span v-if="matches.length" class="badge">{{ matches.length }}</span>
                  </label>
                  <div class="results-container">
                    <div v-if="matches.length === 0" class="empty-state">
                      {{ testText ? '未找到匹配项' : '等待输入...' }}
                    </div>
                    <div v-else class="match-list">
                      <div v-for="(match, index) in matches" :key="index" class="match-item">
                        <div class="match-header">
                          <span class="match-index">#{{ index + 1 }}</span>
                          <span class="match-full">{{ match[0] }}</span>
                        </div>
                        <div v-if="match.length > 1" class="capture-groups">
                          <div v-for="(group, gIndex) in match.slice(1)" :key="gIndex" class="group-item">
                            <span class="group-label">${{ gIndex + 1 }}:</span>
                            <span class="group-value">{{ group }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAsyncAnalyzeStore, SavedRegexConfig } from '@/ERA助手/stores/AsyncAnalyzeStore';
import { eraLogger } from '@/ERA助手/utils/EraHelperLogger';
import FileImportExport from '@/ERA助手/UI/components/File/FileImportExport.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

// 定义 Emits 以便关闭弹窗
const emit = defineEmits(['close']);

const asyncAnalyzeStore = useAsyncAnalyzeStore();

// 编辑器状态
const currentId = ref<string>('');
const currentName = ref('');
// 3. 合并后的正则输入字符串
const regexInputString = ref('/.*/g');
const testText = ref('');
const errorMsg = ref('');

// 解析正则字符串的辅助函数
const parseRegexString = (input: string) => {
  // 匹配 /pattern/flags 格式
  // 注意：这里简单的正则可能无法处理 pattern 中包含转义 / 的情况，但对于基础调试足够
  // 更严谨的做法是从后往前找最后一个 /
  const lastSlashIndex = input.lastIndexOf('/');
  const firstSlashIndex = input.indexOf('/');

  if (firstSlashIndex === 0 && lastSlashIndex > 0 && lastSlashIndex > firstSlashIndex) {
    const pattern = input.substring(1, lastSlashIndex);
    const flags = input.substring(lastSlashIndex + 1);
    return { pattern, flags };
  }

  // 如果用户没写 /.../，默认当做 pattern，flags 默认为 g
  return { pattern: input, flags: 'g' };
};

// 计算匹配结果
const matches = computed(() => {
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  errorMsg.value = '';
  if (!regexInputString.value || !testText.value) return [];

  try {
    const { pattern, flags } = parseRegexString(regexInputString.value);
    if (!pattern) return [];

    const re = new RegExp(pattern, flags);
    return Array.from(testText.value.matchAll(re));
  } catch (e: any) {
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    errorMsg.value = e.message;
    return [];
  }
});

// --- 列表管理逻辑 ---

// 新建
const createNew = () => {
  currentId.value = '';
  currentName.value = '';
  regexInputString.value = '//g'; // 默认空正则
  testText.value = '';
};

// 加载配置
const loadConfig = (config: SavedRegexConfig) => {
  currentId.value = config.id;
  currentName.value = config.name;
  // 将存储的分离数据合并为字符串显示
  regexInputString.value = `/${config.pattern}/${config.flags}`;
};

// 保存配置
const saveCurrentConfig = async () => {
  if (!currentName.value) return;

  // 解析当前输入框的内容以便存储
  const { pattern, flags } = parseRegexString(regexInputString.value);

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

// 删除配置
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
/* 4. UI优化：弹窗样式 */
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
    color: #111827; /* 1. 字体加深 */
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
    color: #111827; /* 1. 字体加深 */
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
    .item-name { color: #312e81; font-weight: 600; } /* 1. 字体加深 */
  }
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600; /* 1. 加粗 */
  color: #1f2937; /* 1. 字体加深 */
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-pattern {
  font-size: 12px;
  color: #4b5563; /* 1. 字体加深 */
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
}

.section-title {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827; /* 1. 字体加深 */
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
    color: #000000 !important; /* 使用纯黑色提高可读性 */
  }
}

.form-input, .form-textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;

  /* 2. 强制覆盖浏览器样式 */
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
  color: #374151; /* 1. 字体加深 */
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
  padding: 10px;
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
}

.match-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.match-index { color: #6b7280; font-size: 11px; font-family: monospace; }
.match-full { color: #047857; font-family: monospace; font-weight: 700; word-break: break-all; }

.capture-groups {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #e5e7eb;
}

.group-item {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-family: monospace;
}

.group-label { color: #4b5563; font-size: 11px; min-width: 24px; font-weight: 600; }
.group-value { color: #1f2937; }

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

  .input-group label, .pane-label { color: #d1d5db; }

  .form-input, .form-textarea {
    /* 2. 强制覆盖浏览器样式 (Dark Mode) */
    background: #374151 !important;
    border-color: #4b5563;
    color: #f3f4f6 !important;

    &:focus { border-color: #818cf8; background: #1f2937 !important; }
  }

  .results-container { background: #111827; border-color: #374151; }
  .match-item { background: #1f2937; border-color: #374151; }
  .match-full { color: #34d399; }
  .group-value { color: #e5e7eb; }
  .group-label { color: #9ca3af; }

  .btn {
    background: #374151; border-color: #4b5563; color: #e5e7eb;
    &:hover:not(:disabled) { background: #4b5563; }
    &.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
  }
}
</style>
