<template>
  <div class="file-import-export" :class="{ 'dark-mode': uiStore.darkMode }">
    <input ref="fileInputRef" type="file" :accept="accept" style="display: none" @change="handleFileImport" />

    <div v-if="showButtons" class="button-group">
      <button class="btn small" :class="{ disabled: importing }" @click="triggerImport">
        <span v-if="importing" class="loading-spinner"></span>
        {{ importText }}
      </button>

      <button class="btn small primary" :class="{ disabled: exporting }" @click="exportFile">
        <span v-if="exporting" class="loading-spinner"></span>
        {{ exportText }}
      </button>

      <slot name="extra-buttons"></slot>
    </div>

    <!-- 确认对话框 -->
    <EraConfirmModal
      v-model:visible="showConfirm"
      :title="confirmTitle"
      :content="confirmContent"
      type="confirm"
      :confirm-text="confirmText"
      :cancel-text="cancelText"
      @confirm="executeImport"
      @cancel="cancelImport"
    />

    <!-- 消息提示 -->
    <div v-if="message" class="status-message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EraConfirmModal from '../Dialog/EraConfirmModal.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

// Props 定义
interface Props {
  // 文件接受类型
  accept?: string;
  // 导入按钮文本
  importText?: string;
  // 导出按钮文本
  exportText?: string;
  // 确认标题
  confirmTitle?: string;
  // 确认内容
  confirmContent?: string;
  // 确认按钮文本
  confirmText?: string;
  // 取消按钮文本
  cancelText?: string;
  // 是否显示按钮
  showButtons?: boolean;
  // 导入前是否需要确认
  requireConfirm?: boolean;
}

// 默认值
const props = withDefaults(defineProps<Props>(), {
  accept: '.json',
  importText: '导入',
  exportText: '导出',
  confirmTitle: '导入确认',
  confirmContent: '导入新数据将覆盖当前数据，确定要继续吗？',
  confirmText: '确认导入',
  cancelText: '取消',
  showButtons: true,
  requireConfirm: true,
});

// Emits 定义
const emit = defineEmits<{
  // 当用户选择文件时触发
  'file-selected': [file: File];
  // 当文件读取完成后触发
  'file-loaded': [content: string, file: File];
  // 当导出数据时触发
  'export-data': [];
  // 当导入确认时触发
  'import-confirmed': [content: string, file: File];
  // 当发生错误时触发
  error: [error: string];
  // 当显示消息时触发
  message: [text: string, type: 'success' | 'error' | 'warning'];
}>();

// 引用
const fileInputRef = ref<HTMLInputElement | null>(null);
const showConfirm = ref(false);
const importing = ref(false);
const exporting = ref(false);
const message = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
const tempFileData = ref<{ content: string; file: File } | null>(null);

// 触发文件选择
function triggerImport() {
  if (importing.value) return;

  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

// 处理文件导入
function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  emit('file-selected', file);

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const content = e.target?.result as string;

      // 如果需要确认，则显示确认对话框
      if (props.requireConfirm) {
        tempFileData.value = { content, file };
        showConfirm.value = true;
      } else {
        // 直接执行导入
        emit('import-confirmed', content, file);
      }

      emit('file-loaded', content, file);
    } catch (error) {
      const errorMsg = `文件读取失败: ${error}`;
      showMessage(errorMsg, 'error');
      emit('error', errorMsg);
    } finally {
      // 清空文件输入
      if (fileInputRef.value) {
        fileInputRef.value.value = '';
      }
    }
  };

  reader.onerror = () => {
    const errorMsg = '文件读取错误';
    showMessage(errorMsg, 'error');
    emit('error', errorMsg);
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  };

  reader.readAsText(file);
}

// 执行导入
function executeImport() {
  showConfirm.value = false;

  if (tempFileData.value) {
    importing.value = true;
    try {
      emit('import-confirmed', tempFileData.value.content, tempFileData.value.file);
      showMessage('导入成功', 'success');
    } catch (error) {
      const errorMsg = `导入失败: ${error}`;
      showMessage(errorMsg, 'error');
      emit('error', errorMsg);
    } finally {
      tempFileData.value = null;
      importing.value = false;
    }
  }
}

// 取消导入
function cancelImport() {
  showConfirm.value = false;
  tempFileData.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

// 导出文件
function exportFile() {
  if (exporting.value) return;

  exporting.value = true;
  try {
    emit('export-data');
    showMessage('导出成功', 'success');
  } catch (error) {
    const errorMsg = `导出失败: ${error}`;
    showMessage(errorMsg, 'error');
    emit('error', errorMsg);
  } finally {
    exporting.value = false;
  }
}

// 显示消息
function showMessage(text: string, type: 'success' | 'error' | 'warning') {
  message.value = { text, type };
  emit('message', text, type);

  setTimeout(() => {
    message.value = null;
  }, 3000);
}
</script>

<style scoped lang="scss">
.file-import-export {
  display: inline-block;
}

.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn:hover:not(.disabled) {
  background: #e5e7eb;
  color: #000000;
}

.btn.primary {
  background: #4f46e5;
  color: #ffffff;
  font-weight: 500;
}

.btn.primary:hover:not(.disabled) {
  background: #4338ca;
  color: #ffffff;
}

.btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.status-message {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  margin-top: 8px;
}

.status-message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.status-message.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

/* 黑夜模式 */
.dark-mode {
  .btn {
    background: #4b5563;
    color: #e2e8f0;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);

    &:hover:not(.disabled) {
      background: #6b7280;
      color: #f8fafc;
    }

    &.primary {
      background: #4f46e5;
      color: #f8fafc;

      &:hover:not(.disabled) {
        background: #6366f1;
        color: #f8fafc;
      }
    }

    &.disabled {
      opacity: 0.6;
      color: #9ca3af;
    }
  }

  .loading-spinner {
    border: 2px solid #4b5563;
    border-top: 2px solid #818cf8;
  }

  .status-message {
    &.success {
      background: #065f46;
      color: #a7f3d0;
      border: 1px solid #065f46;
    }

    &.error {
      background: #991b1b;
      color: #fecaca;
      border: 1px solid #991b1b;
    }

    &.warning {
      background: #92400e;
      color: #fef08a;
      border: 1px solid #92400e;
    }
  }
}
</style>
