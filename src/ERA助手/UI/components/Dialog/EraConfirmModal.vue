<!-- components/EraConfirmModal.vue -->
<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" :class="{ 'dark-mode': uiStore.darkMode }" @click.self="handleCancel">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button v-if="showClose" class="modal-close" @click="handleCancel">&times;</button>
        </div>
        <div class="modal-body">
          <slot name="default">
            <p>{{ content }}</p>
          </slot>
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <template v-if="type === 'confirm'">
              <button class="btn primary" @click="handleConfirm">
                {{ confirmText }}
              </button>
              <button class="btn" @click="handleCancel">
                {{ cancelText }}
              </button>
            </template>
            <template v-else-if="type === 'alert'">
              <button class="btn primary" @click="handleConfirm">
                {{ confirmText }}
              </button>
            </template>
          </slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

interface Props {
  visible: boolean;
  title?: string;
  content?: string;
  type?: 'confirm' | 'alert';
  confirmText?: string;
  cancelText?: string;
  showClose?: boolean;
}

interface Emits {
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'update:visible', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  title: '提示',
  content: '',
  type: 'confirm',
  confirmText: '确认',
  cancelText: '取消',
  showClose: true,
});

const emit = defineEmits<Emits>();

const handleConfirm = () => {
  emit('confirm');
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};

// 阻止背景滚动
watch(
  () => props.visible,
  newVal => {
    if (newVal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  },
);
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modal-appear 0.2s ease-out;
}

.modal-header {
  padding: 20px 24px 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.modal-body {
  padding: 20px 24px;
  flex: 1;
  overflow-y: auto;
}

.modal-body p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #4b5563;
}

.modal-footer {
  padding: 12px 24px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 70px;
}

.btn.primary {
  background: #6366f1;
  color: white;

  &:hover {
    background: #4f46e5;
  }

  &:active {
    background: #4338ca;
  }
}

.btn {
  background: #f3f4f6;
  color: #374151;

  &:hover {
    background: #e5e7eb;
  }

  &:active {
    background: #d1d5db;
  }
}

/* 动画 */
@keyframes modal-appear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 480px) {
  .modal-content {
    margin: 0 16px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
}

/* 黑夜模式 */
.dark-mode {
  .modal-overlay {
    background: rgba(0, 0, 0, 0.75);
  }

  .modal-content {
    background: #1f2937;
    color: #e2e8f0;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    border-bottom: 1px solid #374151;

    h3 {
      color: #e2e8f0;
    }

    .modal-close {
      color: #9ca3af;

      &:hover {
        background: #4b5563;
        color: #f8fafc;
      }
    }
  }

  .modal-body {
    color: #cbd5e1;

    p {
      color: #cbd5e1;
    }
  }

  .modal-footer {
    border-top: 1px solid #374151;
  }

  .btn {
    background: #4b5563;
    color: #e2e8f0;

    &:hover {
      background: #6b7280;
    }

    &:active {
      background: #4b5563;
    }

    &.primary {
      background: #4f46e5;
      color: #f8fafc;

      &:hover {
        background: #6366f1;
      }

      &:active {
        background: #4f46e5;
      }
    }
  }
}
</style>
