<template>
  <Transition name="modal-fade">
    <div v-if="state.visible" :class="{ 'dark-mode': uiStore.darkMode }" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ state.title }}</h3>
          <button class="close-btn" @click="handleCancel">×</button>
        </div>

        <div class="modal-body">
          <p v-if="state.message" class="modal-message">{{ state.message }}</p>

          <div v-if="state.type === 'prompt'" class="input-wrapper">
            <input
              ref="inputRef"
              v-model="state.inputValue"
              :placeholder="state.placeholder"
              class="modal-input"
              @keyup.enter="handleConfirm"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="state.type !== 'alert'" class="btn secondary" @click="handleCancel">取消</button>
          <button class="btn primary" @click="handleConfirm">确定</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, watch, ref } from 'vue';
import { modalState as state, closeModal } from '@/MVU助手/utils/modal';
import { useUiStore } from '@/MVU助手/stores/UIStore';

const inputRef = ref<HTMLInputElement | null>(null);
const uiStore = useUiStore();

// 自动聚焦输入框
watch(() => state.visible, (val) => {
  if (val && state.type === 'prompt') {
    nextTick(() => inputRef.value?.focus());
  }
});

const handleConfirm = () => {
  if (state.type === 'confirm') {
    closeModal(true);
  } else if (state.type === 'prompt') {
    closeModal(state.inputValue);
  } else {
    closeModal(true);
  }
};

const handleCancel = () => {
  if (state.type === 'confirm') {
    closeModal(false);
  } else if (state.type === 'prompt') {
    closeModal(null);
  } else {
    closeModal(null);
  }
};
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.modal-container {
  background: #fff;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-pop 0.2s ease-out;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 { margin: 0; font-size: 18px; font-weight: 600; color: #1f2937; }
  .close-btn { background: none; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; line-height: 1; }
}

.modal-body {
  padding: 20px;

  .modal-message { margin: 0 0 12px; color: #4b5563; font-size: 14px; line-height: 1.5; }

  .modal-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    color: #000000;
    &:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
  }
}

.modal-footer {
  padding: 12px 20px;
  background: #f9fafb;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;

  &.primary { background: #6366f1; color: white; &:hover { background: #4f46e5; } }
  &.secondary { background: #fff; border: 1px solid #d1d5db; color: #374151; &:hover { background: #f3f4f6; } }
}

/* Dark Mode Support */
.dark-mode .modal-container {
  background: #1f2937;
  border: 1px solid #374151;

  .modal-header {
    border-bottom-color: #374151;
    h3 { color: #e2e8f0; }
  }

  .modal-body {
    .modal-message { color: #cbd5e1; }
    .modal-input {
      background: #374151;
      border-color: #4b5563;
      color: #e2e8f0;
      &:focus { border-color: #818cf8; }
    }
  }

  .modal-footer {
    background: #111827;
    border-top-color: #374151;

    .btn.secondary {
      background: #374151;
      border-color: #4b5563;
      color: #e2e8f0;
      &:hover { background: #4b5563; }
    }
  }
}

/* Animations */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@keyframes modal-pop {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
