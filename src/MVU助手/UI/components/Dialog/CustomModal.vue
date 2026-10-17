<template>
  <Transition name="modal-fade">
    <div
      v-if="state.visible"
      :class="{ 'dark-mode': uiStore.darkMode }"
      class="modal-overlay mvu-workspace"
      @click.self="handleCancel"
    >
      <div
        ref="dialogRef"
        class="modal-container"
        role="dialog"
        aria-modal="true"
        :aria-label="state.title"
        tabindex="-1"
      >
        <div class="modal-header">
          <h3>{{ state.title }}</h3>
          <button class="close-btn" aria-label="关闭对话框" @click="handleCancel">×</button>
        </div>

        <div class="modal-body">
          <p v-if="state.message" class="modal-message">{{ state.message }}</p>

          <div v-if="state.type === 'prompt'" class="input-wrapper">
            <input
              ref="inputRef"
              v-model="state.inputValue"
              autofocus
              :aria-label="state.message || state.title"
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
import { ref } from 'vue';
import '../../design.scss';
import { modalState as state, closeModal } from '@/MVU助手/utils/modal';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { useDialogFocus } from '@/MVU助手/utils/useDialogFocus';

const inputRef = ref<HTMLInputElement | null>(null);
const dialogRef = ref<HTMLElement | null>(null);
const uiStore = useUiStore();

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
useDialogFocus(dialogRef, () => state.visible, handleCancel);
</script>

<style scoped lang="scss" src="./dialog.scss"></style>
