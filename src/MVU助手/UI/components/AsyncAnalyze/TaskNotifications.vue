<template>
  <div ref="anchor" />
  <Teleport v-if="anchor" :to="anchor.ownerDocument.body">
    <aside
      v-if="taskNotices.size"
      ref="panel"
      class="mvu-task-notifications"
      aria-label="任务状态通知"
      popover="manual"
    >
      <section
        v-for="notice in taskNotices.values()"
        :key="notice.runId"
        :class="notice.level"
        @mouseenter="hoveredRunId = notice.runId"
        @mouseleave="hoveredRunId = null"
        @focusin="focusedRunId = notice.runId"
        @focusout="leaveFocus"
      >
        <details class="notice-details" @toggle="toggleDetails(notice.runId, $event)">
          <summary class="notice-heading">
            <strong role="status" aria-live="polite" :title="notice.title"
              ><span v-if="notice.running" class="spinner" aria-hidden="true" />{{ notice.title }}</strong
            >
            <span class="expand-label">展开</span><span class="collapse-label">收起</span>
          </summary>
          <p>{{ notice.message }}</p>
          <p v-if="notice.running">处理中，结果返回后会在此更新；取消后将等待清理完成。</p>
          <button v-if="notice.running" @click="cancelTaskRun(notice.runId)">取消此运行</button>
          <RunLog :run-id="notice.runId" />
        </details>
        <button
          v-if="!notice.running"
          class="close-notice"
          aria-label="关闭此通知"
          @click="taskNotices.delete(notice.runId)"
        >
          ×
        </button>
      </section>
    </aside>
  </Teleport>
</template>
<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import { taskNotices } from '../../../AsyncAnalyze/TaskDiagnostics';
import { cancelTaskRun } from '../../../AsyncAnalyze/TaskRuntime';
import RunLog from './RunLog.vue';
const anchor = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const hoveredRunId = ref<string | null>(null);
const focusedRunId = ref<string | null>(null);
const expanded = ref(new Set<string>());
function toggleDetails(runId: string, event: Event) {
  if ((event.target as HTMLDetailsElement).open) expanded.value.add(runId);
  else expanded.value.delete(runId);
}
function leaveFocus(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) focusedRunId.value = null;
}
watchEffect(onCleanup => {
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const notice of taskNotices.values()) {
    if (
      notice.running ||
      notice.level !== 'success' ||
      expanded.value.has(notice.runId) ||
      hoveredRunId.value === notice.runId ||
      focusedRunId.value === notice.runId
    )
      continue;
    timers.push(setTimeout(() => taskNotices.delete(notice.runId), 3000));
  }
  onCleanup(() => timers.forEach(clearTimeout));
});
watch(
  panel,
  element => {
    if (element && !element.matches(':popover-open')) element.showPopover();
  },
  { flush: 'post' },
);
</script>
<style scoped>
.mvu-task-notifications {
  position: fixed;
  inset: 16px auto auto 50%;
  transform: translateX(-50%);
  margin: 0;
  width: min(420px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #eef2ff;
  font: 14px/1.5 sans-serif;
  z-index: 2147483647;
  overflow-wrap: anywhere;
}
section {
  position: relative;
  padding: 10px 12px;
  margin-top: 8px;
  border: 1px solid #8995bb;
  border-radius: 10px;
  background: #242938;
  box-shadow: 0 4px 24px #0005;
}
section.success {
  border-color: #72d9ac;
}
section.error {
  border-color: #ff939d;
}
section.warning {
  border-color: #f4cd79;
}
.notice-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  list-style: none;
  min-height: 26px;
  padding-right: 30px;
}
.notice-heading::-webkit-details-marker {
  display: none;
}
.notice-heading strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.expand-label,
.collapse-label {
  flex-shrink: 0;
  color: #c5cde5;
  font-size: 12px;
}
.notice-details:not([open]) .collapse-label,
.notice-details[open] .expand-label {
  display: none;
}
.close-notice {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0 6px;
}
p {
  margin: 8px 0;
}
button {
  cursor: pointer;
  border: 1px solid #8995bb;
  border-radius: 5px;
  background: #343e57;
  color: #fff;
  padding: 4px 10px;
  font: inherit;
}
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #8995bb;
  border-top-color: #fff;
  border-radius: 50%;
  margin-right: 8px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
