<template>
  <div class="searchable-select" ref="containerRef" :class="{'dark-mode': uiStore.darkMode, 'is-disabled': disabled }">
    <!-- 触发区域 -->
    <div class="select-trigger" @click="toggleDropdown">
      <!-- 多选模式显示 -->
      <template v-if="multiple && Array.isArray(modelValue)">
        <span v-if="modelValue.length === 0" class="placeholder">{{ placeholder }}</span>
        <div v-else class="tags-container">
          <span v-for="(item, index) in modelValue" :key="index" class="tag">
            {{ item }}
            <span class="remove-tag" @click.stop="removeItem(index)">×</span>
          </span>
        </div>
      </template>

      <!-- 单选模式显示 -->
      <template v-else>
        <span v-if="!modelValue" class="placeholder">{{ placeholder }}</span>
        <span v-else class="selected-text">{{ modelValue }}</span>
      </template>

      <span class="arrow-icon">▼</span>
    </div>

    <!-- 下拉菜单 -->
    <div v-if="isOpen" class="dropdown-panel custom-scrollbar">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="搜索..."
          @click.stop
        />
      </div>

      <!-- 列表内容 -->
      <div class="options-list">
        <div v-if="loading" class="dropdown-tip">加载中...</div>
        <div v-else-if="filteredOptions.length === 0" class="dropdown-tip">无匹配项</div>

        <template v-else>
          <div
            v-for="option in filteredOptions"
            :key="option"
            class="dropdown-item"
            :class="{ 'selected': isSelected(option) }"
            @click.stop="selectOption(option)"
          >
            <!-- 多选显示复选框 -->
            <input
              v-if="multiple"
              type="checkbox"
              :checked="isSelected(option)"
              readonly
            />
            <span>{{ option }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

const props = defineProps({
  modelValue: {
    type: [String, Array],
    default: ''
  },
  options: {
    type: Array as () => string[],
    default: () => []
  },
  placeholder: {
    type: String,
    default: '请选择...'
  },
  multiple: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const containerRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const searchQuery = ref('');

// 过滤选项
const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options;
  const query = searchQuery.value.toLowerCase();
  return props.options.filter(opt => opt.toLowerCase().includes(query));
});

// 判断是否选中
const isSelected = (option: string) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    return props.modelValue.includes(option);
  }
  return props.modelValue === option;
};

// 切换下拉框
const toggleDropdown = async () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = ''; // 重置搜索
    await nextTick();
    searchInputRef.value?.focus();
  }
};

// 关闭下拉框
const closeDropdown = (e: Event) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

// 选择选项
const selectOption = (option: string) => {
  if (props.multiple) {
    const currentVal = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const index = currentVal.indexOf(option);
    if (index > -1) {
      currentVal.splice(index, 1);
    } else {
      currentVal.push(option);
    }
    emit('update:modelValue', currentVal);
    emit('change', currentVal);
    // 多选时不自动关闭
  } else {
    emit('update:modelValue', option);
    emit('change', option);
    isOpen.value = false;
  }
};

// 移除标签 (多选模式)
const removeItem = (index: number) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const newVal = [...props.modelValue];
    newVal.splice(index, 1);
    emit('update:modelValue', newVal);
    emit('change', newVal);
  }
};

onMounted(() => {
  document.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown);
});
</script>

<style scoped lang="scss">
.searchable-select {
  position: relative;
  width: 100%;
  font-size: 13px;

  &.is-disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.select-trigger {
  min-height: 32px;
  padding: 4px 24px 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: #ffffff !important; /* 强制背景色 */
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  position: relative;
  color: #111827 !important; /* 强制字体颜色 */
  transition: border-color 0.2s;

  &:hover {
    border-color: #c7d2fe;
  }
}

.arrow-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #9ca3af;
  pointer-events: none;
}

.placeholder {
  color: #9ca3af;
}

.selected-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tags for multiple select */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  background: #e0e7ff;
  color: #312e81;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #c7d2fe;

  .remove-tag {
    cursor: pointer;
    font-weight: bold;
    line-height: 1;
    &:hover { color: #1e1b4b; }
  }
}

/* Dropdown Panel */
.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #ffffff !important; /* 强制背景色 */
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-top: 4px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 10001;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.search-box {
  padding: 6px;
  border-bottom: 1px solid #f3f4f6;
  position: sticky;
  top: 0;
  background-color: #ffffff !important; /* 强制背景色 */
  z-index: 1;

  input {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    outline: none;

    /* 核心修复：强制浅色模式渲染，防止系统深色模式影响 */
    color-scheme: light;
    color: #111827 !important; /* 强制深色字体 */
    background-color: #ffffff !important; /* 强制白色背景 */

    &::placeholder {
      color: #9ca3af;
    }

    &:focus {
      border-color: #4f46e5;
    }
  }
}

.dropdown-item {
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #111827;

  &:hover {
    background-color: #f3f4f6;
  }

  &.selected {
    background-color: #e0e7ff;
    color: #312e81;
    font-weight: 500;
  }

  input[type="checkbox"] {
    margin: 0;
    accent-color: #4f46e5; /* 优化复选框颜色 */
  }
}

.dropdown-tip {
  padding: 12px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

/* Dark Mode Adaptation */
.dark-mode .searchable-select {
  .select-trigger {
    background-color: #111827 !important; /* 覆盖默认的 !important */
    border-color: #4b5563;
    color: #e2e8f0 !important; /* 覆盖默认的 !important */
  }

  .tag {
    background-color: #312e81;
    color: #e0e7ff;
    border-color: #818cf8;
  }

  .dropdown-panel {
    background-color: #1f2937 !important; /* 覆盖默认的 !important */
    border-color: #4b5563;
  }

  .search-box {
    background-color: #1f2937 !important; /* 覆盖默认的 !important */
    border-bottom-color: #374151;

    input {
      background-color: #111827 !important; /* 覆盖默认的 !important */
      border-color: #4b5563;
      color: #e2e8f0 !important; /* 覆盖默认的 !important */
      color-scheme: dark; /* 深色模式下强制深色渲染 */

      &::placeholder {
        color: #6b7280;
      }
    }
  }

  .dropdown-item {
    color: #e2e8f0;
    &:hover { background-color: #374151; }
    &.selected {
      background-color: #312e81;
      color: #e0e7ff;
    }
  }

  .placeholder {
    color: #6b7280;
  }

  .arrow-icon {
    color: #6b7280;
  }
}
</style>
