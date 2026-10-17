<template>
  <div class="task-page" :class="{ 'dark-mode': uiStore.darkMode }">
    <TaskManager
      :settings="store.settings"
      :save-settings="store.replaceSettings"
      :set-secret="store.setSecret"
      :get-secret="store.getSecret"
      :configuration-error="store.configurationError"
      :configuration-warning="store.configurationWarning"
    >
      <template #runs="{ dirty }">
        <section class="runs" aria-label="任务运行记录">
          <header class="section-header">
            <div>
              <h2>运行记录</h2>
              <p>查看任务结果与数据影响，按需取消或重新计算。</p>
            </div>
            <button :disabled="!taskRunResults.length" @click="clearResults">清空显示记录</button>
          </header>
          <div class="run-controls">
            <div class="run-context">
              <strong>本次目标 · 楼层 {{ target.messageId }}</strong
              ><span>聊天：{{ target.chatId || '未打开聊天' }}</span>
              <span>已保存规则组：{{ group ? group.name || '未命名规则组' : '未启用' }}</span>
              <label
                >运行范围<select v-model="runMode" aria-label="运行范围">
                  <option value="regular">常规链（非负顺序）</option>
                  <option value="event">指定事件</option>
                  <option value="task">单个任务</option>
                </select></label
              >
              <label v-if="runMode === 'event'"
                >事件<select v-model="selectedEvent" aria-label="测试事件">
                  <option value="">请选择事件</option>
                  <option v-for="name in eventNames" :key="name" :value="name">{{ name }}</option>
                </select></label
              >
              <label v-if="runMode === 'task'"
                >任务<select v-model="selectedTask" aria-label="测试任务">
                  <option value="">请选择任务</option>
                  <option v-for="task in groupTasks" :key="task.id" :value="task.id">
                    {{ task.name || '未命名任务' }}{{ task.enabled ? '' : '（不参加常规链）'
                    }}{{ task.eventName ? ' · 事件 ' + task.eventName : '' }}
                  </option>
                </select></label
              >
              <p v-if="dirty" class="warning">有未保存草稿。本次运行使用已保存配置；请先保存全部配置以使用修改。</p>
              <p v-if="writeTargets.length">可能写入：{{ writeTargets.join('、') }}。实际写入以运行结果为准。</p>
              <p v-else>本次候选任务没有写入目标。</p>
              <p>
                测试会真实请求模型并执行配置的写入，使用当前楼层。事件按配置检查间隔，关闭常规参与也可触发；单任务测试仅执行所选任务并跳过间隔，普通任务仍检查常规参与开关。
              </p>
            </div>
            <div class="actions">
              <button class="primary" :disabled="!canRun || pending" @click="runCurrent">
                {{ runMode === 'regular' ? '运行当前楼层任务' : runMode === 'event' ? '测试此事件' : '测试此任务' }}
              </button>
              <button v-if="runMode === 'regular'" :disabled="!canRun || pending" @click="rerun">
                回滚此链后重新计算</button
              ><button @click="refreshTarget">刷新目标</button>
            </div>
            <p class="muted">
              重新计算会先撤销当前楼层上一条常规链的提交。日志仅在本次脚本会话有效；重载后不可恢复旧日志，是否可回滚由任务内核校验。
            </p>
            <p v-if="!canRun" class="warning">请打开聊天，并在活动规则组内选择对应事件、任务或启用常规任务。</p>
          </div>
          <details class="integration-rules">
            <summary>其它前端联动规则</summary>
            <button @click="copyIntegrationRules">一键复制前端联动规则</button>
            <pre>{{ integrationRules }}</pre>
          </details>
          <p v-if="feedback" role="status" class="feedback">{{ feedback }}</p>
          <section v-if="activeTaskRuns.size" class="active-runs" aria-label="正在运行">
            <h3>正在运行 · {{ activeTaskRuns.size }}</h3>
            <article v-for="run in activeTaskRuns.values()" :key="run.id" class="run-card">
              <div class="section-header">
                <div>
                  <strong>{{ runLabel(run.result) }}</strong>
                  <p>楼层 {{ run.identity.messageId }} · 正在处理任务</p>
                </div>
                <button @click="cancel(run.id)">取消此运行</button>
              </div>
              <p class="muted">取消请求后仍需等待清理与回滚，最终数据状态以完成记录为准。</p>
            </article>
          </section>
          <div v-if="!taskRunResults.length && !activeTaskRuns.size" class="empty-state">
            <strong>暂无运行记录</strong>
            <p>运行任务后，在这里查看文本结果、写入状态和失败原因。清空显示记录不会撤销数据修改。</p>
          </div>
          <article
            v-for="result in [...taskRunResults].reverse()"
            :key="result.runId"
            class="run-card"
            :class="{ 'needs-attention': needsAttention(result) }"
          >
            <header class="section-header">
              <div>
                <strong>{{ runLabel(result) }} · {{ labels[result.status] }}</strong>
                <p>楼层 {{ result.messageId }} · {{ result.tasks.length }} 个任务</p>
              </div>
              <button @click="copyDiagnostic(result)">复制诊断</button>
            </header>
            <p class="impact" :class="{ error: hasResidue(result) }">{{ dataImpact(result) }}</p>
            <p v-if="result.reason">{{ result.reason }}</p>
            <p v-for="(warning, index) in result.warnings" :key="'warning' + index" class="warning">
              {{ warning.message }}
            </p>
            <div v-if="hasResidue(result)" role="alert" class="recovery">
              <strong>需要检查未恢复的数据或任务状态</strong>
              <p>请先核对下方目标和错误，再处理冲突。避免直接重复写入；复制诊断可保留当前结果。</p>
              <p v-for="(error, index) in result.rollback.errors" :key="index">{{ error }}</p>
            </div>
            <section v-for="task in result.tasks" :key="task.taskId" class="task-result">
              <div class="task-result-heading">
                <strong>{{ task.taskName || '未命名任务' }}</strong
                ><span>{{ labels[task.status] }} · 尝试 {{ task.attempts }} 次</span>
              </div>
              <p v-if="task.reason">
                {{ task.reason.message
                }}<span v-if="task.reason.currentFloor !== undefined"
                  >（本次 {{ task.reason.currentFloor }}，上次触发基线
                  {{ task.reason.lastTriggerFloor ?? task.reason.lastSuccessfulFloor ?? 0 }}）</span
                >
              </p>
              <p v-if="task.error" class="error">{{ task.error.message }}</p>
              <div v-if="task.error?.details" class="error-context">
                <p>API：{{ task.error.details.connectionName || '未命名' }} · 模型：{{ task.error.details.model }}</p>
                <p>地址：{{ task.error.details.endpoint }}</p>
                <p>
                  阶段：{{ phaseLabels[task.error.phase] || task.error.phase }} · 耗时
                  {{ (task.error.details.elapsedMs / 1000).toFixed(2) }} 秒<span
                    v-if="task.error.details.httpStatus !== undefined"
                  >
                    · HTTP {{ task.error.details.httpStatus }} {{ task.error.details.statusText }}</span
                  >
                </p>
                <p v-if="task.error.details.backendCode || task.error.details.backendType">
                  后端代码：{{ task.error.details.backendCode || '未提供' }} · 类型：{{
                    task.error.details.backendType || '未提供'
                  }}
                </p>
              </div>
              <ul v-if="task.writes.length" class="writes">
                <li v-for="write in task.writes" :key="write.writeId">
                  {{ write.target || write.writeId }}：{{ labels[write.status] }}
                  <span v-if="write.error" class="error">{{ write.error }}</span>
                </li>
              </ul>
              <details v-if="task.text" :open="result.status === 'succeeded' && result.tasks.length === 1">
                <summary>查看返回文本</summary>
                <pre>{{ task.text }}</pre>
              </details>
              <details v-if="task.error" open>
                <summary>失败详情</summary>
                <p>{{ task.error.phase }} / {{ task.error.code }}</p>
                <pre v-if="task.error.details?.response">{{ task.error.details.response }}</pre>
                <p v-else>
                  本阶段未取得后端响应内容。控制台按运行 ID
                  {{ result.runId }} 查看过程日志；请求和原始输出见控制台的调试级别日志。
                </p>
              </details>
            </section>
            <details class="diagnostic">
              <summary>运行标识与诊断</summary>
              <p>聊天：{{ result.chatId }} · 请求：{{ result.requestId }} · 运行：{{ result.runId }}</p>
              <p v-if="result.activeRunId">占用运行：{{ result.activeRunId }}</p>
              <p>回滚：{{ labels[result.rollback.status] || result.rollback.status }}</p>
            </details>
          </article>
        </section>
      </template>
      <template #settings><Settings /></template>
    </TaskManager>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, ref } from 'vue';
import { useUiStore } from '../../stores/UIStore';
import { useTaskStore } from '../../stores/TaskStore';
import {
  activeTaskRuns,
  taskRunResults,
  runTaskChain,
  rerunCurrentTasks,
  cancelTaskRun,
} from '../../AsyncAnalyze/TaskRuntime';
import type { RunResult, Trigger } from '../../AsyncAnalyze/TaskSchema';
import { createEventIntegrationRules } from '../../AsyncAnalyze/EventIntegrationRules';
import { Modal } from '../../utils/modal';
import TaskManager from '../components/AsyncAnalyze/TaskManager.vue';
import Settings from '../components/AsyncAnalyze/Settings.vue';

const store = useTaskStore();
const uiStore = useUiStore();
const phaseLabels: Record<string, string> = {
  prepare: '准备配置',
  scan: '扫描世界书',
  template: '处理模板',
  request: '请求模型',
  extract: '提取响应',
  commit: '提交结果',
  rollback: '回滚',
};
const labels: Record<string, string> = {
  succeeded: '成功',
  partial: '部分完成',
  failed: '失败',
  cancelled: '已取消',
  busy: '忙碌',
  skipped: '已跳过',
  rolled_back: '已回滚',
  rollback_failed: '回滚失败',
  committed: '已写入',
  completed: '已完成',
  not_needed: '无需回滚',
};
const readTarget = () => ({ chatId: SillyTavern.getCurrentChatId() || '', messageId: getLastMessageId() });
const target = ref(readTarget());
const feedback = ref('');
const pending = ref(false);
const runMode = ref<'regular' | 'event' | 'task'>('regular');
const selectedEvent = ref('');
const selectedTask = ref('');
const group = computed(() => store.settings.groups.find(item => item.id === store.settings.activeGroupId));
const groupTasks = computed(() => store.settings.tasks.filter(item => group.value?.taskIds.includes(item.id)));
const eventNames = computed(() => [...new Set(groupTasks.value.map(item => item.eventName).filter(Boolean))]);
const enabledTasks = computed(() => groupTasks.value.filter(item => item.enabled && item.order >= 0));
const candidateTasks = computed(() =>
  runMode.value === 'regular'
    ? enabledTasks.value
    : runMode.value === 'event'
      ? groupTasks.value.filter(item => item.eventName === selectedEvent.value && !!selectedEvent.value)
      : groupTasks.value.filter(item => item.id === selectedTask.value),
);
const canRun = computed(() => !!target.value.chatId && target.value.messageId >= 0 && candidateTasks.value.length > 0);
const integrationRules = computed(() =>
  createEventIntegrationRules(getScriptId(), selectedEvent.value || eventNames.value[0] || 'my_event'),
);
const writeTargets = computed(() => [
  ...new Set(
    candidateTasks.value.flatMap(task =>
      task.output.mode === 'return'
        ? []
        : task.output.mode === 'event_result'
          ? ['事件结果广播（无持久写入）']
          : task.output.writes.map(write =>
              write.target.kind === 'worldbook' ? `世界书 · ${write.target.bookName}` : '消息正文及其中的MVU更新',
            ),
    ),
  ),
]);
function refreshTarget() {
  target.value = readTarget();
}
onActivated(refreshTarget);
function checkTarget() {
  const latest = readTarget();
  if (latest.chatId !== target.value.chatId || latest.messageId !== target.value.messageId) {
    target.value = latest;
    feedback.value = '聊天或楼层已变化，已刷新目标。请核对后重新点击运行。';
    return false;
  }
  return true;
}
async function execute(rerun: boolean) {
  if (pending.value || !checkTarget()) return;
  pending.value = true;
  feedback.value = '';
  try {
    const task = runMode.value === 'task' ? candidateTasks.value[0] : undefined;
    const trigger: Trigger =
      runMode.value === 'event'
        ? { kind: 'event', eventName: selectedEvent.value }
        : task
          ? task.eventName
            ? { kind: 'event', eventName: task.eventName, taskId: task.id }
            : { kind: 'task', taskId: task.id }
          : { kind: 'manual' };
    const result = rerun
      ? await rerunCurrentTasks()
      : await runTaskChain({ messageId: target.value.messageId, trigger, ...(task ? { taskId: task.id } : {}) });
    feedback.value = `${rerun ? '重新计算' : '运行'}：${labels[result.status]}。${result.reason || dataImpact(result)}`;
  } catch (error) {
    feedback.value = `操作未完成：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    pending.value = false;
  }
}
const runCurrent = () => execute(false);
function runLabel(result: RunResult) {
  return result.trigger.eventName
    ? `事件 ${result.trigger.eventName}${result.trigger.taskId ? ' · 单任务' : ''}`
    : result.trigger.kind === 'task'
      ? '单任务测试'
      : '常规任务链';
}
async function copyIntegrationRules() {
  try {
    await navigator.clipboard.writeText(integrationRules.value);
    feedback.value = '已复制前端联动规则，可交给其它前端的开发者或 AI 使用。';
  } catch {
    feedback.value = '无法访问剪贴板，请手动复制下方规则。';
  }
}
async function rerun() {
  if (!checkTarget()) return;
  const confirmed = await Modal.confirm(
    '回滚后重新计算',
    `目标：${target.value.chatId}，楼层 ${target.value.messageId}。\n将先撤销本楼层上一条常规链的提交，再按已保存配置运行。仅本次脚本会话保留的日志可用。`,
  );
  if (confirmed) await execute(true);
}
function cancel(id: string) {
  feedback.value = cancelTaskRun(id) ? '已请求取消，等待任务清理并结算结果。' : '此运行已结束，请查看完成记录。';
}
function clearResults() {
  taskRunResults.value = [];
  feedback.value = '已清空显示记录。已写入数据和任务状态未被撤销。';
}
function hasResidue(result: RunResult) {
  return (
    ['partial', 'failed'].includes(result.rollback.status) ||
    result.tasks.some(
      task => task.status === 'rollback_failed' || task.writes.some(write => write.status === 'rollback_failed'),
    )
  );
}
function needsAttention(result: RunResult) {
  return hasResidue(result) || ['failed', 'partial'].includes(result.status);
}
function dataImpact(result: RunResult) {
  if (hasResidue(result)) return '存在未恢复的修改或任务状态，请检查受影响目标。';
  if (result.rollback.status === 'completed') return '已撤销本链需要回滚的提交。';
  const committed = result.tasks.flatMap(task => task.writes).filter(write => write.status === 'committed');
  if (committed.length) return `已写入 ${committed.length} 个目标，请核对下方明细。`;
  if (result.tasks.some(task => task.text && task.status === 'succeeded')) return '已返回文本，无成功写入记录。';
  return '无成功写入记录。';
}
async function copyDiagnostic(result: RunResult) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    feedback.value = '已复制运行诊断。内容包含返回文本与写入目标，请按需分享。';
  } catch {
    feedback.value = '无法访问剪贴板，请展开运行标识与诊断后手动复制。';
  }
}
</script>

<style scoped lang="scss">
.task-page {
  color: var(--mvu-text, #172338);
  min-width: 0;
}
.runs {
  display: grid;
  gap: 20px;
}
h2,
h3,
p {
  margin: 0;
}
h2 {
  font-size: 20px;
  line-height: 1.4;
}
h3 {
  font-size: 16px;
}
p {
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.section-header {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}
.section-header > div {
  flex: 1;
  min-width: min(220px, 100%);
}
.section-header p,
.muted {
  color: var(--mvu-muted, #58667c);
  font-size: 13px;
}
.run-controls,
.run-card {
  padding: 20px;
  border: 1px solid var(--mvu-line, #d5dce6);
  background: var(--mvu-panel, #fff);
  border-radius: 12px;
  min-width: 0;
}
.run-controls,
.run-context {
  display: grid;
  gap: 12px;
}
.run-context span {
  color: var(--mvu-muted, #58667c);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
button,
select {
  font: inherit;
  font-size: 14px;
  color: var(--mvu-text, #172338);
  background: var(--mvu-panel, #fff);
  border: 1px solid var(--mvu-control-line, #7c8ca3);
  border-radius: 8px;
  min-height: 44px;
  padding: 10px 14px;
  cursor: pointer;
}
button:hover {
  border-color: var(--mvu-accent, #405bd8);
}
button.primary {
  background: var(--mvu-accent, #405bd8);
  color: var(--mvu-on-accent, white);
  border-color: transparent;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--mvu-accent, #405bd8);
  outline-offset: 3px;
}
.run-card {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
.needs-attention {
  border-inline-start: 4px solid var(--mvu-warning, #95600a);
}
.impact {
  font-weight: 600;
}
.warning {
  color: var(--mvu-warning, #805400);
}
.error {
  color: var(--mvu-danger, #b42338);
}
.recovery {
  border: 1px solid var(--mvu-danger, #b42338);
  border-radius: 8px;
  padding: 12px;
  background: var(--mvu-bg, #f6f8fb);
}
.task-result {
  display: grid;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--mvu-line, #d5dce6);
}
.task-result-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}
.task-result-heading span {
  color: var(--mvu-muted, #58667c);
  font-size: 13px;
}
summary {
  cursor: pointer;
  min-height: 36px;
  padding: 6px 0;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 4px 0;
  padding: 14px;
  border-radius: 8px;
  background: var(--mvu-bg, #f6f8fb);
  font:
    13px/1.7 ui-monospace,
    monospace;
}
.empty-state {
  text-align: center;
  padding: 36px 20px;
  border: 1px dashed var(--mvu-line, #d5dce6);
  border-radius: 12px;
}
.empty-state p {
  margin-top: 10px;
  color: var(--mvu-muted, #58667c);
}
.feedback {
  padding: 12px 16px;
  border-inline-start: 3px solid var(--mvu-accent, #405bd8);
  background: var(--mvu-panel, #fff);
}
.writes {
  padding-inline-start: 20px;
  margin: 0;
  overflow-wrap: anywhere;
}
.diagnostic {
  font-size: 13px;
  color: var(--mvu-muted, #58667c);
}
@media (max-width: 480px) {
  .run-controls,
  .run-card {
    padding: 14px;
  }
}
</style>
