<template>
  <div
    v-show="uiStore.collectedPaths.length > 0"
    class="path-collection-box"
    :class="{ 'dark-mode': uiStore.darkMode }"
  >
    <div class="path-collection-header" @click="toggleCollection">
      <span>已收集路径 ({{ uiStore.collectedPaths.length }})</span>
      <span class="toggle-icon">{{ isExpanded ? '▲' : '▼' }}</span>
    </div>
    <div v-show="isExpanded" class="path-collection-content">
      <div v-for="(path, index) in uiStore.collectedPaths" :key="index" class="path-item">
        <span class="path-text" :title="path">{{ path }}</span>
        <button class="btn small danger remove-path-btn" @click="removePath(index)">×</button>
      </div>
      <div class="path-collection-actions">
        <button class="btn small" @click="clearAllPaths">清空所有</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '../../../stores/UIStore';

interface Props {
  isExpanded?: boolean;
}

interface Emits {
  (e: 'update:isExpanded', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  isExpanded: false,
});

const emit = defineEmits<Emits>();
const uiStore = useUiStore();

const toggleCollection = () => {
  emit('update:isExpanded', !props.isExpanded);
};

const removePath = (index: number) => {
  uiStore.collectedPaths.splice(index, 1);
};

const clearAllPaths = () => {
  uiStore.collectedPaths = [];
};
</script>

<style scoped lang="scss">
.path-collection-box {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin: 8px 0;
  background: #fff;
}

.path-collection-header {
  padding: 8px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
  font-size: 12px;
}

.path-collection-content {
  max-height: 200px;
  overflow-y: auto;
}

.path-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 11px;
}

.path-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.remove-path-btn {
  min-width: auto;
  padding: 2px 6px;
}

.path-collection-actions {
  padding: 8px 12px;
  display: flex;
  justify-content: flex-end;
}

/* 按钮样式 */
.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    transform 0.15s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.btn:hover {
  background: #e5e7eb;
  color: #000000;
}

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}

.btn.danger {
  background: #dc2626;
  color: #ffffff;
  font-weight: 500;
}

.btn.danger:hover {
  background: #b91c1c;
  color: #ffffff;
}

/* 黑夜模式 */
.dark-mode {
  .path-collection-box {
    border-color: #4b5563;
    background: #1f2937;
  }

  .path-collection-header {
    background: #374151;
    border-bottom: 1px solid #4b5563;
    color: #e2e8f0;
  }

  .path-collection-content {
    /* 滚动条样式 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: #374151;
    }
    &::-webkit-scrollbar-thumb {
      background: #4b5563;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #6b7280;
    }
  }

  .path-item {
    border-bottom: 1px solid #374151;
    color: #cbd5e1;
  }

  .btn {
    background: #4b5563;
    color: #e2e8f0;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);

    &:hover {
      background: #6b7280;
      color: #f8fafc;
    }

    &.danger {
      background: #dc2626;
      color: #f8fafc;

      &:hover {
        background: #ef4444;
      }
    }
  }
}
</style>
