<template>
  <div class="task-page" :class="{ 'dark-mode': uiStore.darkMode }">
    <TaskManager
      :settings="store.settings"
      :save-settings="store.replaceSettings"
      :set-secret="store.setSecret"
      :delete-secret="store.deleteSecret"
      :configuration-error="store.configurationError"
    >
      <template #runs>
        <section class="runs">
          <div class="actions">
            <button @click="runCurrent">运行当前楼层任务</button
            ><button @click="rerunCurrentTasks">回滚后重新计算</button
            ><button @click="clearResults">清空结果显示</button>
          </div>
          <p v-if="activeTaskRuns.size" role="status">运行中的任务链：{{ activeTaskRuns.size }}</p>
          <div v-for="run in activeTaskRuns.values()" :key="run.id" class="run">
            <span
              >{{ run.result.trigger.eventName || '常规链' }} · 楼层 {{ run.identity.messageId }} · {{ run.id }}</span
            >
            <button @click="cancelTaskRun(run.id)">取消此运行</button>
          </div>
          <details v-for="result in [...taskRunResults].reverse()" :key="result.runId" class="run">
            <summary>
              {{ result.trigger.eventName || '常规链' }} · {{ labels[result.status] }} · 楼层 {{ result.messageId }}
            </summary>
            <p>请求：{{ result.requestId }} · 运行：{{ result.runId }}</p>
            <p v-if="result.reason">{{ result.reason }}</p>
            <p v-if="result.activeRunId">占用运行：{{ result.activeRunId }}</p>
            <p v-for="(warning, index) in result.warnings" :key="index" class="warning">{{ warning.message }}</p>
            <p v-if="result.rollback.status !== 'not_needed'">
              回滚：{{ labels[result.rollback.status] || result.rollback.status }}
            </p>
            <p v-for="(error, index) in result.rollback.errors" :key="index" class="error">{{ error }}</p>
            <details v-for="task in result.tasks" :key="task.taskId">
              <summary>{{ task.taskName }} · {{ labels[task.status] }} · 尝试 {{ task.attempts }} 次</summary>
              <p v-if="task.reason">
                {{ task.reason.message
                }}<span v-if="task.reason.currentFloor !== undefined"
                  >（本次 {{ task.reason.currentFloor }}，上次 {{ task.reason.lastSuccessfulFloor }}）</span
                >
              </p>
              <p v-if="task.error" class="error">
                {{ task.error.phase }} / {{ task.error.code }}：{{ task.error.message }}
              </p>
              <p v-for="write in task.writes" :key="write.writeId">
                {{ write.target || write.writeId }}：{{ labels[write.status] }} {{ write.error }}
              </p>
              <pre v-if="task.text">{{ task.text }}</pre>
            </details>
          </details>
        </section> </template
      ><template #settings><Settings /></template
    ></TaskManager>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../../stores/UIStore';
import { useTaskStore } from '../../stores/TaskStore';
import {
  activeTaskRuns,
  taskRunResults,
  runTaskChain,
  rerunCurrentTasks,
  cancelTaskRun,
} from '../../AsyncAnalyze/TaskRuntime';
import TaskManager from '../components/AsyncAnalyze/TaskManager.vue';
import Settings from '../components/AsyncAnalyze/Settings.vue';

const store = useTaskStore();
const uiStore = useUiStore();
const labels: Record<string, string> = {
  succeeded: '成功',
  partial: '部分完成',
  failed: '失败',
  cancelled: '已取消',
  busy: '忙碌',
  skipped: '已跳过',
  rolled_back: '已回滚',
  rollback_failed: '回滚失败',
  committed: '已提交',
  completed: '已完成',
};
const runCurrent = () => runTaskChain({ messageId: getLastMessageId(), trigger: { kind: 'manual' } });
const clearResults = () => {
  taskRunResults.value = [];
};
</script>

<style scoped>
.task-page {
  padding: 10px;
  color: #111827;
  color-scheme: light;
}
.runs {
  margin-top: 20px;
  border-top: 1px solid #cbd5e1;
  padding-top: 12px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.run {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  margin: 10px 0;
  padding: 10px;
  overflow-wrap: anywhere;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
}
/* 控件挂载在宿主页上，显式覆盖浏览器及酒馆的控件配色。 */
button {
  padding: 6px 10px;
  border: 1px solid #94a3b8;
  border-radius: 5px;
  cursor: pointer;
  color: #111827 !important;
  background: #f9fafb !important;
}
button:hover {
  background: #e5e7eb !important;
}
.error {
  color: #dc2626;
}
.warning {
  color: #a16207;
}
.dark-mode {
  color: #e2e8f0;
  color-scheme: dark;
}
.dark-mode .run {
  border-color: #64748b;
}
.dark-mode button {
  color: #e2e8f0 !important;
  background: #374151 !important;
}
.dark-mode button:hover {
  background: #4b5563 !important;
}
</style>
