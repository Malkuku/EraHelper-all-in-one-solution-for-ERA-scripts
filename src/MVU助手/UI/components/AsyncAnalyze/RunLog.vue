<template>
  <details class="mvu-run-log">
    <summary>过程日志 / 请求 / 原始输出（{{ logs.length }}）</summary>
    <p v-if="!logs.length">本次运行没有可用的会话日志；脚本重载前的日志无法恢复。</p>
    <article v-for="(entry, index) in logs" :key="index">
      <strong>{{ entry.time }} · {{ entry.message }}</strong>
      <pre>{{ entry.text }}</pre>
    </article>
  </details>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { taskRunLogs } from '../../../AsyncAnalyze/TaskDiagnostics';
const props = defineProps<{ runId: string }>();
const logs = computed(() => taskRunLogs.get(props.runId) ?? []);
</script>
<style scoped>
.mvu-run-log {
  margin-top: 10px;
  font-size: 12px;
}
summary {
  cursor: pointer;
  padding: 6px 0;
}
article {
  margin-top: 12px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 280px;
  overflow: auto;
  font-size: 12px;
  font-weight: 400;
}
</style>
