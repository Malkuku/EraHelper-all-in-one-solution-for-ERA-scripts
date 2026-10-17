<template>
  <span class="tooltip-wrapper" @mouseenter="show" @mouseleave="hide">
    <button
      ref="referenceRef"
      type="button"
      class="tooltip-trigger"
      aria-label="查看字段说明"
      :aria-describedby="visible ? tooltipId : undefined"
      :aria-expanded="visible"
      @focus="open"
      @blur="hide"
      @click.stop.prevent="open"
      @keydown.esc.stop.prevent="hide"
    >
      <slot
        ><svg class="default-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="8" r="1" fill="currentColor" /></svg
      ></slot>
    </button>
    <Teleport v-if="visible && referenceRef" :to="referenceRef.ownerDocument.body">
      <div
        v-if="visible"
        :id="tooltipId"
        ref="floatingRef"
        class="mvu-field-help"
        role="tooltip"
        :style="{ ...floatingStyles, visibility: isPositioned ? 'visible' : 'hidden' }"
      >
        {{ content || '无内容' }}
      </div>
    </Teleport>
  </span>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from 'vue';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';
const props = withDefaults(
  defineProps<{ content?: string; placement?: 'top' | 'bottom' | 'left' | 'right'; delay?: number }>(),
  { content: '', placement: 'bottom', delay: 200 },
);
const tooltipId = useId();
const visible = ref(false);
const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const { floatingStyles, isPositioned } = useFloating(referenceRef, floatingRef, {
  open: visible,
  placement: () =>
    props.placement === 'top' || props.placement === 'bottom' ? `${props.placement}-start` : props.placement,
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
  middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
});
let timer: ReturnType<typeof setTimeout> | undefined;
function open() {
  clearTimeout(timer);
  visible.value = true;
}
function show() {
  clearTimeout(timer);
  timer = setTimeout(open, props.delay);
}
function hide() {
  clearTimeout(timer);
  visible.value = false;
}
onBeforeUnmount(hide);
</script>
<style scoped>
.tooltip-wrapper {
  display: inline-flex;
  flex: 0 0 auto;
  align-self: center;
  vertical-align: middle;
  margin-inline-start: 5px;
}
.tooltip-trigger {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 24px !important;
  min-height: 24px !important;
  width: 24px !important;
  height: 24px !important;
  margin: 0 !important;
  padding: 3px !important;
  border: 0 !important;
  border-radius: 4px;
  background: transparent !important;
  color: inherit !important;
  cursor: help;
}
.tooltip-trigger:focus-visible {
  outline: 2px solid #818cf8;
  outline-offset: 2px;
}
.default-icon {
  width: 16px;
  height: 16px;
}
.mvu-field-help {
  width: max-content;
  max-width: min(340px, calc(100vw - 16px));
  box-sizing: border-box;
  background: #252936;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: sans-serif;
  font-size: 12px !important;
  font-weight: 400;
  line-height: 1.6 !important;
  color: #fff !important;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  z-index: 2147483647;
  pointer-events: none;
  box-shadow: 0 2px 12px #0004;
}
</style>
