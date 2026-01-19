<template>
  <div v-if="visible" class="dsl-tester-modal" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="dsl-tester-content">
      <!-- 1. 顶部工具栏 (Header + Actions) -->
      <div class="tester-header">
        <div class="header-left">
          <h3>{{ modalTitle }}</h3>
          <!-- 状态徽标 -->
          <span v-if="isUsingImportedData" class="data-badge" title="当前使用的是导入的外部数据"> 外部数据模式 </span>
        </div>

        <div class="header-actions">
          <!-- 导入组件 -->
          <FileImportExport
            ref="fileImportRef"
            import-text="导入数据"
            :require-confirm="false"
            class="action-item"
            @file-loaded="handleTestDataLoaded"
            @error="handleImportError"
          />

          <!-- 运行按钮 -->
          <button class="btn primary" :disabled="!hasRules" title="运行 DSL 测试" @click="handleRunTest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            运行测试
          </button>

          <div class="divider"></div>

          <!-- 关闭按钮 (图标形式) -->
          <button class="close-btn" title="关闭" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- 2. 主体内容区域 (左右分栏) -->
      <div class="tester-body">
        <!-- 左侧：规则列表 -->
        <div class="panel-left">
          <div class="panel-header">
            <span>规则列表</span>
            <span v-if="hasRules" class="count-badge">{{ Object.keys(localHandlesData).length }}</span>
          </div>

          <div class="rules-container">
            <div v-if="hasRules" class="rules-list">
              <div v-for="(rule, name) in localHandlesData" :key="name" class="rule-card">
                <div class="rule-header">
                  <span class="rule-name" :title="String(name)">{{ name }}</span>
                  <span class="status-dot" :class="{ active: rule.enable }" title="启用状态"></span>
                </div>
                <div class="rule-detail">
                  <code class="path-code" :title="rule.path">{{ rule.path }}</code>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">暂无规则数据</div>
          </div>
        </div>

        <!-- 右侧：输出结果 -->
        <div class="panel-right">
          <div class="panel-header">
            <span>执行结果</span>
            <button v-if="localResultText" class="clear-btn" @click="localResultText = ''">清空</button>
          </div>
          <div class="output-container">
            <pre v-if="localResultText" class="console-output">{{ localResultText }}</pre>
            <div v-else class="empty-result">
              <div class="icon-placeholder">⌨️</div>
              <span>准备就绪</span>
              <small>点击顶部 "运行测试" 查看结果（更详细的日志请查看控制台）</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { EraDataHandler } from '@/ERA助手/EraDataHandler/EraDataHandler';
import { eraLogger } from '@/ERA助手/utils/EraHelperLogger';
import { EraDataRule } from '@/ERA助手/EraDataHandler/types/EraDataRule';
import FileImportExport from '../File/FileImportExport.vue';
import { useEraEditStore } from '@/ERA助手/stores/EraEditStore';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

interface Props {
  visible?: boolean;
  eraDataRule?: EraDataRule;
  resultText?: string;
  statData?: any;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}

const eraEditStore = useEraEditStore();

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  eraDataRule: () => ({}),
  resultText: '',
  statData: () => ({}),
});

const emit = defineEmits<Emits>();

const localResultText = ref(props.resultText);
const localHandlesData = ref<EraDataRule>(props.eraDataRule);
const localTestData = ref<any>(props.statData);
const isUsingImportedData = ref(false);
const fileImportRef = ref<InstanceType<typeof FileImportExport> | null>(null);

const hasRules = computed(() => {
  return localHandlesData.value && Object.keys(localHandlesData.value).length > 0;
});

const modalTitle = computed(() => 'EraDataRule 测试器');

watch(
  () => props.resultText,
  value => {
    localResultText.value = value;
  },
);

watch(
  () => props.eraDataRule,
  value => {
    localHandlesData.value = value ? { ...value } : {};
  },
  { deep: true },
);

watch(
  () => props.statData,
  value => {
    if (!isUsingImportedData.value) {
      localTestData.value = value ? JSON.parse(JSON.stringify(value)) : {};
    }
  },
  { deep: true, immediate: true },
);

function handleTestDataLoaded(content: string, file: File) {
  try {
    localTestData.value = JSON.parse(content);
    isUsingImportedData.value = true;
    if (typeof toastr !== 'undefined') toastr.success(`成功导入: ${file.name}`, '');
    localResultText.value = `// 数据已导入 (${file.name})\n// 请点击“运行测试”查看结果...`;
  } catch (error) {
    const errorMsg = `JSON解析失败: ${error}`;
    if (typeof toastr !== 'undefined') toastr.error(errorMsg, '');
  }
}

function handleImportError(error: string) {
  if (typeof toastr !== 'undefined') {
    toastr.error(`导入失败: ${error}`, '');
  } else {
    console.error(`导入失败: ${error}`);
  }
}

function handleClose() {
  isUsingImportedData.value = false;
  localTestData.value = props.statData ? JSON.parse(JSON.stringify(props.statData)) : {};
  emit('update:visible', false);
  emit('close');
}

async function handleRunTest() {
  if (!hasRules.value) {
    localResultText.value = '>> 错误: 没有可测试的规则数据';
    return;
  }

  eraLogger.log('开始运行 DSL 测试...');
  localResultText.value = '正在执行...';

  try {
    const statData = await eraEditStore.getStatData();
    const testData = JSON.parse(JSON.stringify(localTestData.value));
    const snapData = JSON.parse(JSON.stringify(statData));

    const result = await EraDataHandler.applyRule(testData, snapData, localHandlesData.value);

    let output = `=== 执行日志 ===\n${result.log}\n\n`;
    const changes = result.data;

    if (Object.keys(changes).length > 0) {
      output += `=== 数据变更 ===\n${JSON.stringify(changes, null, 2)}`;
    } else {
      output += `=== 数据变更 ===\n(无数据变化)`;
    }

    localResultText.value = output;
  } catch (error: any) {
    console.error(error);
    localResultText.value = `>> 执行异常:\n${error.message || error}`;
  }
}
</script>

<style scoped lang="scss">
/* 变量定义 */
$border-color: #e2e8f0;
$bg-color: #f8fafc;
$primary-color: #6366f1;
$text-main: #1e293b;
$text-sub: #64748b;
$header-height: 60px;

.dsl-tester-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dsl-tester-content {
  background: white;
  width: 90%;
  max-width: 1000px;
  height: 85vh; /* 增加高度 */
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Header & Toolbar */
.tester-header {
  height: $header-height;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: white;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: $text-main;
      letter-spacing: -0.02em;
    }

    .data-badge {
      background: #ecfdf5;
      color: #059669;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
      border: 1px solid #a7f3d0;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;

    .divider {
      width: 1px;
      height: 24px;
      background: $border-color;
      margin: 0 4px;
    }
  }
}

/* Body */
.tester-body {
  flex: 1;
  display: flex;
  min-height: 0;
  background: $bg-color;
}

/* Left Panel */
.panel-left {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid $border-color;
  background: #fcfcfc;
}

/* Right Panel */
.panel-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e1e1e; /* Dark theme for console */
  min-width: 0;
}

.panel-header {
  height: 40px;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $text-sub;
  border-bottom: 1px solid $border-color;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  flex-shrink: 0;

  .count-badge {
    background: #f1f5f9;
    color: $text-sub;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
  }

  .clear-btn {
    background: none;
    border: none;
    color: #666;
    font-size: 11px;
    cursor: pointer;
    &:hover {
      color: #fff;
    }
  }
}

.panel-right .panel-header {
  background: #252526;
  border-bottom: 1px solid #333;
  color: #858585;
}

/* Rules List */
.rules-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.rule-card {
  background: white;
  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  transition: all 0.2s;
  cursor: default;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  }

  .rule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;

    .rule-name {
      font-weight: 600;
      font-size: 13px;
      color: $text-main;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
      flex-shrink: 0;

      &.active {
        background: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
      }
    }
  }

  .rule-detail {
    .path-code {
      display: block;
      font-family: 'Menlo', monospace;
      font-size: 10px;
      background: #f1f5f9;
      padding: 3px 6px;
      border-radius: 3px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

/* Output Area */
.output-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  position: relative;

  /* 自定义滚动条 (Dark) */
  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }
  &::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 5px;
    border: 2px solid #1e1e1e;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #4f4f4f;
  }
}

.console-output {
  margin: 0;
  padding: 16px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.empty-state,
.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: $text-sub;
  font-size: 13px;
  gap: 8px;
  user-select: none;
}

.empty-result {
  color: #52525b;
  .icon-placeholder {
    font-size: 24px;
    opacity: 0.5;
  }
}

/* Buttons & Controls */
.btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &.primary {
    background: $primary-color;
    color: white;
    &:hover {
      background: #5558e0;
    }
    &:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      opacity: 0.7;
    }
  }
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: $text-sub;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #ef4444; /* Red on hover for close */
  }
}

/* 针对 FileImportExport 组件的样式覆盖 */
:deep(.file-import-export) {
  display: inline-block;
}
:deep(.file-import-export button) {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  border: 1px solid $border-color;
  color: $text-main;
  cursor: pointer;
  transition: all 0.2s;
}
:deep(.file-import-export button:hover) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* Responsive */
@media (max-width: 768px) {
  .tester-body {
    flex-direction: column;
  }
  .panel-left {
    flex: 0 0 40%;
    border-right: none;
    border-bottom: 1px solid $border-color;
  }
  .panel-right {
    flex: 1;
  }
  .tester-header {
    padding: 0 12px;
  }
  .header-left h3 {
    font-size: 14px;
  }
  .btn {
    padding: 0 10px;
    font-size: 12px;
  }
}

/* 黑夜模式 */
.dark-mode {
  .dsl-tester-modal {
    background: rgba(15, 23, 42, 0.85);
  }

  .dsl-tester-content {
    background: #1f2937;
    color: #e2e8f0;
  }

  .tester-header {
    background: #374151;
    border-bottom: 1px solid #4b5563;

    .header-left {
      h3 {
        color: #e2e8f0;
      }

      .data-badge {
        background: #164e63;
        color: #bae6fd;
        border: 1px solid #0891b2;
      }
    }
  }

  .tester-body {
    background: #1f2937;
  }

  .panel-left {
    background: #374151;
    border-right: 1px solid #4b5563;
  }

  .panel-right {
    background: #111827;
  }

  .panel-header {
    background: #374151;
    border-bottom: 1px solid #4b5563;
    color: #cbd5e1;

    &.dark-mode & {
      background: #1f2937;
      border-bottom: 1px solid #374151;
      color: #9ca3af;
    }
  }

  .rule-card {
    background: #4b5563;
    border: 1px solid #6b7280;
    color: #e2e8f0;

    &:hover {
      border-color: #9ca3af;
    }

    .rule-name {
      color: #e2e8f0;
    }

    .status-dot {
      background: #9ca3af;

      &.active {
        background: #34d399;
        box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.15);
      }
    }

    .path-code {
      background: #6b7280;
      color: #e2e8f0;
    }
  }

  .output-container {
    &::-webkit-scrollbar-track {
      background: #1f2937;
    }
    &::-webkit-scrollbar-thumb {
      background: #4b5563;
      border: 2px solid #1f2937;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #6b7280;
    }
  }

  .console-output {
    color: #d1d5db;
    background: #1f2937;
  }

  .empty-state,
  .empty-result {
    color: #9ca3af;
  }

  .btn {
    background: #4b5563;
    color: #e2e8f0;
    border: 1px solid #6b7280;

    &:hover:not(:disabled) {
      background: #6b7280;
      color: #f8fafc;
    }

    &.primary {
      background: #4f46e5;
      color: #f8fafc;

      &:hover:not(:disabled) {
        background: #6366f1;
      }
    }

    &:disabled {
      background: #4b5563;
      color: #9ca3af;
    }
  }

  .close-btn {
    color: #9ca3af;

    &:hover {
      background: #4b5563;
      color: #f8fafc;
    }
  }

  :deep(.file-import-export button) {
    background: #4b5563;
    border: 1px solid #6b7280;
    color: #e2e8f0;

    &:hover {
      background: #6b7280;
    }
  }
}
</style>
