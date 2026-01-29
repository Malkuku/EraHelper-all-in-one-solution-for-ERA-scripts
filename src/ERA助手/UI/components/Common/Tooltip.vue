<template>
  <!-- 1. 外层容器：增加 position: relative -->
  <div
    ref="referenceRef"
    class="tooltip-wrapper"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <!-- 图标插槽 -->
    <slot>
      <svg class="default-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="8" r="1" fill="currentColor"/>
      </svg>
    </slot>

    <!-- 2. 提示框：直接写在这里，不要 Teleport -->
    <Transition name="tooltip-fade">
      <div
        v-if="visible"
        ref="floatingRef"
        class="tooltip-content"
        :style="floatingStyles"
      >
        {{ content || '无内容' }}

        <!-- 箭头 -->
        <div
          ref="arrowRef"
          class="tooltip-arrow"
          :style="{
            position: 'absolute',
            left: middlewareData.arrow?.x != null ? `${middlewareData.arrow.x}px` : '',
            top: middlewareData.arrow?.y != null ? `${middlewareData.arrow.y}px` : '',
            [staticSide]: '-4px',
          }"
        ></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFloating, offset, flip, shift, arrow, autoUpdate } from '@floating-ui/vue';

interface Props {
  content?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}
const props = withDefaults(defineProps<Props>(), {
  content: '',
  placement: 'top',
  delay: 200
});

const visible = ref(false);
const referenceRef = ref(null);
const floatingRef = ref(null);
const arrowRef = ref(null);

const { floatingStyles, middlewareData, placement: finalPlacement } = useFloating(referenceRef, floatingRef, {
  placement: props.placement,
  strategy: 'absolute', // 改为 absolute，相对于父级定位
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(8),
    flip(),
    shift(),
    arrow({ element: arrowRef }),
  ],
});

const staticSide = computed(() => {
  return {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[finalPlacement.value.split('-')[0]] || 'bottom';
});

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
  position: relative; /* 关键：为内部的 absolute 元素提供定位基准 */
  display: inline-block;
  vertical-align: middle;
  line-height: 1;
}

.default-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  cursor: help;
  &:hover { color: #4b5563; }
}

.tooltip-content {
  width: max-content;
  max-width: 200px;
  background-color: #333;
  padding: 6px 10px;
  border-radius: 4px;

  /* 强制样式：确保可见 */
  font-size: 12px !important;
  line-height: 1.5 !important;
  color: #fff !important;
  z-index: 9999;

  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #333;
  transform: rotate(45deg);
}

.tooltip-fade-enter-active, .tooltip-fade-leave-active { transition: opacity 0.2s; }
.tooltip-fade-enter-from, .tooltip-fade-leave-to { opacity: 0; }
</style>
