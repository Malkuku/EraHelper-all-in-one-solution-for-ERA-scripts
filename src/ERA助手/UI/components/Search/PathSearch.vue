<template>
  <div class="search-box" :class="{ 'dark-mode': uiStore.darkMode }">
    <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor">
      <path
        d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"
      />
    </svg>
    <input
      :value="modelValue"
      type="text"
      placeholder="搜索路径或值..."
      class="search-input"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button v-if="modelValue" class="search-clear" @click="$emit('update:modelValue', '')">&times;</button>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

defineProps<{
  modelValue: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>

<style scoped lang="scss">
.search-box {
  position: relative;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.search-icon {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: #f8fafc !important;
  color: #1e293b !important;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8 !important;
  }
}

.search-clear {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #64748b;
  }
}

/* 深色模式强制覆盖 */
@media (prefers-color-scheme: dark) {
  .search-input {
    background: #f8fafc !important;
    color: #1e293b !important;
    border-color: #e2e8f0 !important;
  }

  .search-input::placeholder {
    color: #94a3b8 !important;
  }
}

/* 黑夜模式 */
.dark-mode {
  .search-box {
    border-bottom: 1px solid #4b5563;
  }

  .search-icon {
    color: #94a3b8;
  }

  .search-input {
    background: #374151 !important;
    color: #e2e8f0 !important;
    border-color: #4b5563 !important;

    &:focus {
      border-color: #818cf8;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    &::placeholder {
      color: #6b7280 !important;
    }
  }

  .search-clear {
    color: #94a3b8;

    &:hover {
      color: #cbd5e1;
    }
  }
}
</style>
