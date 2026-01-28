<template>
  <div
    :class="{ 'dark-mode': uiStore.darkMode }"
    class="tooltip-wrapper"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <!-- 触发元素插槽 -->
    <!-- 如果外部没有传入内容，将显示内部的 SVG 默认图标 -->
    <slot>
      <svg
        class="default-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="8" r="1" fill="currentColor"/>
      </svg>
    </slot>

    <!-- 提示文本 -->
    <Transition name="tooltip-fade">
      <div
        v-if="visible"
        class="tooltip-content"
        :class="placement"
      >
        {{ content }}
        <!-- 小箭头 -->
        <span class="tooltip-arrow"></span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';
const uiStore = useUiStore();

// 定义 Props
interface Props {
  content: string; // 提示文字内容
  placement?: 'top' | 'bottom' | 'left' | 'right'; // 弹出方向，默认 top
  delay?: number; // 显示延迟 (毫秒)
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
  delay: 200
});

const visible = ref(false);
let timer: number | null = null;

const show = () => {
  if (timer) clearTimeout(timer);
  timer = window.setTimeout(() => {
    visible.value = true;
  }, props.delay);
};

const hide = () => {
  if (timer) clearTimeout(timer);
  visible.value = false;
};
</script>

<style scoped lang="scss">
.tooltip-wrapper {
  position: relative;
  display: inline-block;
  line-height: 1; /* 防止高度塌陷 */
  vertical-align: middle; /* 优化与文字混排时的对齐 */
}

/* 默认图标样式 */
.default-icon {
  width: 16px;      /* 默认大小 */
  height: 16px;
  color: #9ca3af;   /* 默认灰色 (Tailwind gray-400) */
  cursor: help;     /* 鼠标放上去显示问号光标 */
  transition: color 0.2s;
  vertical-align: text-bottom; /* 微调图标垂直对齐 */

  &:hover {
    color: #4b5563; /* 悬停变深 (Tailwind gray-600) */
  }
}

.tooltip-content {
  position: absolute;
  background-color: #333;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 20000;
  pointer-events: none; /* 防止鼠标移动到提示框上导致闪烁 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  line-height: 1.4;

  /* 位置样式 */
  &.top {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    .tooltip-arrow {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: #333;
    }
  }

  &.bottom {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    .tooltip-arrow {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: #333;
    }
  }

  &.left {
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    margin-right: 8px;
    .tooltip-arrow {
      top: 50%;
      left: 100%;
      transform: translateY(-50%);
      border-left-color: #333;
    }
  }

  &.right {
    top: 50%;
    left: 100%;
    transform: translateY(-50%);
    margin-left: 8px;
    .tooltip-arrow {
      top: 50%;
      right: 100%;
      transform: translateY(-50%);
      border-right-color: #333;
    }
  }
}

/* 小箭头通用样式 */
.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 5px solid transparent;
}

/* 动画效果 */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}

/* 针对不同方向的微调动画，让它看起来是滑出来的 */
.tooltip-content.top.tooltip-fade-enter-from,
.tooltip-content.top.tooltip-fade-leave-to {
  transform: translate(-50%, 5px);
}
.tooltip-content.bottom.tooltip-fade-enter-from,
.tooltip-content.bottom.tooltip-fade-leave-to {
  transform: translate(-50%, -5px);
}

/* Dark Mode 适配 */
.dark-mode {
  /* 针对默认图标的 Dark Mode 适配 */
  .default-icon {
    color: #9ca3af;
    &:hover {
      color: #e5e7eb; /* 深色模式下悬停变亮 */
    }
  }

  .tooltip-content {
    background-color: #e5e7eb; /* 亮色背景 */
    color: #1f2937; /* 深色文字 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);

    &.top .tooltip-arrow { border-top-color: #e5e7eb; }
    &.bottom .tooltip-arrow { border-bottom-color: #e5e7eb; }
    &.left .tooltip-arrow { border-left-color: #e5e7eb; }
    &.right .tooltip-arrow { border-right-color: #e5e7eb; }
  }
}
</style>
