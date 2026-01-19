<template>
  <div
    v-if="visible"
    class="simulation-test-modal"
    :class="{ 'dark-mode': uiStore.darkMode }"
    @click.self="handleClose"
  >
    <div class="simulation-test-content">
      <div class="tester-header">
        <h3>模拟测试</h3>
        <button class="btn small" @click="handleClose">×</button>
      </div>

      <div class="tester-body">
        <div class="tester-inputs">
          <div class="import-actions">
            <FileImportExport
              ref="fileImportRef"
              import-text="导入JSON"
              :require-confirm="false"
              @file-loaded="handleTestDataLoaded"
              @error="handleImportError"
            />
            <button class="btn" :disabled="!importedDataObj" @click="handleRunTest">运行测试</button>
            <button class="btn" @click="handleClose">关闭</button>
          </div>

          <div class="field">
            <label>执行日志:</label>
            <textarea
              v-model="localExecutionLog"
              placeholder="执行过程日志将显示在这里"
              readonly
              class="light-theme"
            ></textarea>
          </div>
        </div>

        <div class="tester-output">
          <h4>数据对比视图</h4>
          <div class="data-comparison">
            <div class="data-section">
              <h5>导入的数据</h5>
              <div class="json-display">
                <JsonTree v-if="importedDataObj" :data="importedDataObj" />
                <div v-else class="empty-json">暂无数据</div>
              </div>
            </div>
            <div class="data-section">
              <h5>原始数据</h5>
              <div class="json-display">
                <JsonTree v-if="importedDataObj" :data="importedDataObj" />
                <div v-else class="empty-json">暂无数据</div>
              </div>
            </div>
            <div class="data-section">
              <h5>测试结果</h5>
              <div class="json-display">
                <JsonTree v-if="resultDataObj" :data="resultDataObj" />
                <div v-else class="empty-json">暂无数据</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import JsonTree from '../JsonNode/JsonTree.vue';
import FileImportExport from '../File/FileImportExport.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

interface Props {
  visible: boolean;
  importedData?: any;
  resultData?: any;
  executionLog?: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
  (e: 'run-test', testData: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  importedData: () => ({}),
  resultData: () => ({}),
  executionLog: '',
});

const emit = defineEmits<Emits>();

// 创建本地响应式变量
const localImportedDataText = ref('');
const localResultDataText = ref('');
const localExecutionLog = ref('');

// JSON对象用于JsonTree展示
const importedDataObj = ref<any>(null);
const resultDataObj = ref<any>(null);

// 文件导入引用
const fileImportRef = ref<InstanceType<typeof FileImportExport> | null>(null);

// 监听props变化并更新本地变量
watch(
  () => props.importedData,
  newVal => {
    try {
      localImportedDataText.value = JSON.stringify(newVal, null, 2);
      importedDataObj.value = newVal;
    } catch (e) {
      localImportedDataText.value = '无法序列化数据';
      importedDataObj.value = null;
    }
  },
  { deep: true, immediate: true },
);

watch(
  () => props.resultData,
  newVal => {
    try {
      localResultDataText.value = JSON.stringify(newVal, null, 2);
      resultDataObj.value = newVal;
    } catch (e) {
      localResultDataText.value = '无法序列化数据';
      resultDataObj.value = null;
    }
  },
  { deep: true, immediate: true },
);

watch(
  () => props.executionLog,
  newVal => {
    localExecutionLog.value = newVal;
  },
  { immediate: true },
);

// 处理测试数据加载
function handleTestDataLoaded(content: string, file: File) {
  try {
    const jsonData = JSON.parse(content);
    localImportedDataText.value = content;
    importedDataObj.value = jsonData;
    toastr.success(`成功导入测试数据: ${file.name}`, '');
  } catch (error) {
    const errorMsg = `JSON解析失败: ${error}`;
    toastr.error(errorMsg, '');
    console.error(errorMsg, error);
  }
}

// 处理导入错误
function handleImportError(error: string) {
  toastr.error(`导入失败: ${error}`, '');
}

// 运行测试
function handleRunTest() {
  if (importedDataObj.value) {
    emit('run-test', importedDataObj.value);
  }
}

function handleClose() {
  emit('update:visible', false);
  emit('close');
}
</script>

<style scoped lang="scss">
.simulation-test-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.simulation-test-content {
  background: white;
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tester-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.tester-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.tester-inputs {
  flex: 0 0 40%;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.tester-inputs .field {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.tester-inputs .field label {
  width: auto;
  margin-bottom: 4px;
  font-size: 12px;
  color: #1f2937;
}

.import-actions {
  margin-bottom: 8px;
  gap: 4px;
}

.tester-inputs textarea {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  resize: none;
  min-height: 80px;
}

.tester-inputs textarea.light-theme {
  background-color: #ffffff !important;
  color: #000000 !important;
}

.tester-inputs textarea:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
}

.tester-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.tester-output {
  flex: 0 0 60%;
  padding: 16px;
  overflow-y: auto;
}

.tester-output h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #111827;
}

.data-comparison {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
}

.data-section {
  display: flex;
  flex-direction: column;
  max-height: 350px;
  flex: 1;
}

.data-section h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #374151;
}

.json-display {
  flex: 1;
  margin: 0;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow-y: auto;
  min-height: 100px; /* 添加最小高度确保能显示内容 */
}

.empty-json {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-style: italic;
}

.btn {
  padding: 5px 12px;
  margin-left: 5px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn:hover {
  background: #e5e7eb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}

@media (max-width: 768px) {
  .tester-body {
    flex-direction: column;
  }

  .tester-inputs,
  .tester-output {
    flex: none;
    width: 100%;
    height: auto;
    max-height: 50%;
    overflow-y: auto;
  }

  .tester-inputs {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
}

/* 黑夜模式 */
.dark-mode {
  .simulation-test-modal {
    background: rgba(0, 0, 0, 0.75);
  }

  .simulation-test-content {
    background: #1f2937;
    color: #e2e8f0;
  }

  .tester-header {
    background: #374151;
    border-bottom: 1px solid #4b5563;
    color: #e2e8f0;
  }

  .tester-inputs {
    border-right: 1px solid #4b5563;
    color: #e2e8f0;
  }

  .tester-inputs .field label {
    color: #cbd5e1;
  }

  .tester-inputs textarea {
    background: #1f2937;
    color: #e2e8f0;
    border-color: #4b5563;
  }

  .tester-inputs textarea.light-theme {
    background-color: #1f2937 !important;
    color: #e2e8f0 !important;
  }

  .tester-output h4 {
    color: #e2e8f0;
  }

  .data-section h5 {
    color: #cbd5e1;
  }

  .json-display {
    background: #374151;
    border-color: #4b5563;
  }

  .empty-json {
    color: #6b7280;
  }

  .btn {
    background: #4b5563;
    color: #e2e8f0;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);

    &:hover {
      background: #6b7280;
      color: #f8fafc;
    }

    &:disabled {
      opacity: 0.5;
      color: #9ca3af;
    }
  }
}
</style>
