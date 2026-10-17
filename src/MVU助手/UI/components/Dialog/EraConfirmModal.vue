<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay mvu-workspace" :class="{ 'dark-mode': uiStore.darkMode }" @click.self="handleCancel">
      <div ref="dialogRef" class="modal-content" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button v-if="showClose" class="modal-close" aria-label="关闭对话框" @click="handleCancel">&times;</button>
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
import { ref } from 'vue';
import '../../design.scss';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { useDialogFocus } from '@/MVU助手/utils/useDialogFocus';

const uiStore = useUiStore();
const dialogRef = ref<HTMLElement | null>(null);

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

useDialogFocus(dialogRef, () => props.visible, handleCancel);
</script>

<style scoped lang="scss" src="./dialog.scss"></style>
