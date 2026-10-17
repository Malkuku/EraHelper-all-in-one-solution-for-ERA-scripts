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
          <details class="run-controls">
            <summary class="controls-summary">
              <strong>手动运行 / 测试</strong>
              <span class="muted"
                >楼层 {{ target.messageId }} · {{ group ? group.name || '未命名规则组' : '未启用规则组' }}</span
              >
              <span v-if="dirty" class="warning">有未保存草稿</span>
            </summary>
            <div class="controls-body">
              <div class="run-context">
                <p class="muted">
                  聊天：{{ target.chatId || '未打开聊天' }} · 使用已保存配置 · {{ candidateTasks.length }} 个候选任务
                </p>
                <div class="run-selectors">
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
                </div>
                <p v-if="dirty" class="warning">有未保存草稿。本次运行使用已保存配置；请先保存全部配置以使用修改。</p>
                <p v-if="writeTargets.length" class="warning">
                  实际请求模型，可能影响：{{ writeTargets.join('、') }}。
                </p>
                <p v-else class="muted">实际请求模型，本次候选任务没有写入目标。</p>
              </div>
              <div class="actions">
                <button class="primary" :disabled="!canRun || pending" @click="runCurrent">
                  {{ runMode === 'regular' ? '运行当前楼层任务' : runMode === 'event' ? '测试此事件' : '测试此任务' }}
                </button>
                <button v-if="runMode === 'regular'" :disabled="!canRun || pending" @click="rerun">
                  回滚此链后重新计算</button
                ><button @click="refreshTarget">刷新目标</button>
              </div>
              <p v-if="!canRun" class="warning">请打开聊天，并在活动规则组内选择对应事件、任务或启用常规任务。</p>
              <details class="run-help">
                <summary>运行与重新计算说明</summary>
                <p>
                  事件按配置检查间隔，关闭常规参与也可触发。单任务测试仅执行所选任务并跳过间隔，普通任务仍检查常规参与开关。
                </p>
                <p>
                  重新计算会先撤销当前楼层上一条常规链的提交。日志仅在本次脚本会话有效；重载后不可恢复旧日志，是否可回滚由任务内核校验。
                </p>
              </details>
            </div>
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
          <header class="history-heading">
            <h3>
              运行记录 <span class="muted">{{ taskRunResults.length }} 次</span>
            </h3>
            <button class="text-button" :disabled="!taskRunResults.length" @click="clearResults">清空显示记录</button>
          </header>
          <div v-if="!taskRunResults.length && !activeTaskRuns.size" class="empty-state">
            <strong>暂无运行记录</strong>
            <p>运行任务后，在这里查看文本结果、写入状态和失败原因。清空显示记录不会撤销数据修改。</p>
          </div>
          <article
            v-for="(result, runIndex) in [...taskRunResults].reverse()"
            :key="result.runId"
            class="run-card"
            :class="{ 'needs-attention': needsAttention(result) }"
          >
            <header class="result-heading">
              <span class="status-badge" :class="result.status">{{ labels[result.status] }}</span>
              <strong>{{ runLabel(result) }}</strong>
              <span class="muted">楼层 {{ result.messageId }}</span>
            </header>
            <p class="task-counts muted">{{ taskOverview(result) }}</p>
            <p class="impact" :class="{ error: hasResidue(result) }">{{ dataImpact(result) }}</p>
            <p v-if="result.reason">{{ result.reason }}</p>
            <ul
              v-if="
                result.tasks.some(task => task.error || task.status === 'failed' || task.status === 'rollback_failed')
              "
              class="failure-summary"
            >
              <li
                v-for="task in result.tasks.filter(
                  task => task.error || task.status === 'failed' || task.status === 'rollback_failed',
                )"
                :key="task.taskId"
              >
                <strong>{{ task.taskName || '未命名任务' }}</strong
                >：{{ task.error?.message || task.reason?.message || labels[task.status] }}
              </li>
            </ul>
            <div v-if="hasResidue(result)" role="alert" class="recovery">
              <strong>需要检查未恢复的数据或任务状态</strong>
              <p>请先核对下方目标和错误，再处理冲突。避免直接重复写入；复制诊断可保留当前结果。</p>
              <p v-for="(error, index) in result.rollback.errors" :key="index">{{ error }}</p>
            </div>
            <ul v-if="result.tasks.some(task => task.writes.length)" class="writes">
              <template v-for="task in result.tasks" :key="task.taskId">
                <li v-for="write in task.writes" :key="write.writeId">
                  <span>{{ write.target || '未命名目标' }}</span>
                  <span :class="{ error: ['failed', 'rollback_failed', 'delivery_failed'].includes(write.status) }">{{
                    labels[write.status]
                  }}</span>
                  <p v-if="write.error" class="error">{{ write.error }}</p>
                </li>
              </template>
            </ul>
            <details v-if="result.warnings.length" class="run-warnings">
              <summary class="warning">运行提醒 · {{ result.warnings.length }} 项</summary>
              <p v-for="(warning, index) in result.warnings" :key="index" class="warning">{{ warning.message }}</p>
            </details>
            <details v-if="result.tasks.length" class="task-details" :open="runIndex === 0">
              <summary>任务明细 · {{ result.tasks.length }} 项</summary>
              <section v-for="task in result.tasks" :key="task.taskId" class="task-result">
                <div class="task-result-heading">
                  <strong>{{ task.taskName || '未命名任务' }}</strong
                  ><span
                    >{{ labels[task.status]
                    }}<template v-if="task.attempts > 1"> · 尝试 {{ task.attempts }} 次</template></span
                  >
                </div>
                <p
                  v-if="task.reason && !task.error && task.status !== 'failed' && task.status !== 'rollback_failed'"
                  class="muted"
                >
                  {{ task.reason.message
                  }}<span v-if="task.reason.currentFloor !== undefined"
                    >（本次 {{ task.reason.currentFloor }}，上次触发基线
                    {{ task.reason.lastTriggerFloor ?? task.reason.lastSuccessfulFloor ?? 0 }}）</span
                  >
                </p>
                <details v-if="task.text" class="returned-text">
                  <summary>
                    查看响应全文（诊断） <span class="muted">{{ task.text.length }} 字符</span>
                  </summary>
                  <pre>{{ task.text }}</pre>
                </details>
                <details v-if="task.error" class="error-diagnostic">
                  <summary>
                    技术详情
                    <span class="muted"
                      >{{ phaseLabels[task.error.phase] || task.error.phase
                      }}<template v-if="task.error.details?.httpStatus !== undefined">
                        · HTTP {{ task.error.details.httpStatus }}</template
                      ></span
                    >
                  </summary>
                  <div v-if="task.error?.details" class="error-context">
                    <p>
                      API：{{ task.error.details.connectionName || '未命名' }} · 模型：{{ task.error.details.model }}
                    </p>
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
                  <p class="muted">错误代码：{{ task.error.code }}</p>
                  <pre v-if="task.error.details?.response">{{ task.error.details.response }}</pre>
                  <p v-else>本阶段未取得后端响应内容。下方过程日志可查看已执行阶段、请求和错误。</p>
                </details>
              </section>
            </details>
            <RunLog :run-id="result.runId" />
            <details class="diagnostic">
              <summary>运行诊断</summary>
              <button class="text-button" @click="copyDiagnostic(result)">复制诊断</button>
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
import { eventOutputChannel, type RunResult, type Trigger } from '../../AsyncAnalyze/TaskSchema';
import { Modal } from '../../utils/modal';
import TaskManager from '../components/AsyncAnalyze/TaskManager.vue';
import Settings from '../components/AsyncAnalyze/Settings.vue';
import RunLog from '../components/AsyncAnalyze/RunLog.vue';
import { taskRunLogs } from '../../AsyncAnalyze/TaskDiagnostics';

const store = useTaskStore();
const uiStore = useUiStore();
const phaseLabels: Record<string, string> = {
  prepare: '准备配置',
  scan: '扫描世界书',
  template: '处理模板',
  request: '请求模型',
  extract: '提取响应',
  commit: '提交结果',
  delivery: '广播交付',
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
  pending: '待提交后广播',
  delivered: '已广播（不可撤回）',
  delivery_failed: '广播失败，可能部分送达',
  not_delivered: '未广播',
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
const writeTargets = computed(() => [
  ...new Set(
    candidateTasks.value.flatMap(task =>
      task.output.writes.map(write =>
        write.target.kind === 'worldbook'
          ? `世界书 · ${write.target.bookName}`
          : write.target.kind === 'event'
            ? `广播 · ${task.eventName ? eventOutputChannel(task.eventName) : '请先填写附加事件名'}`
            : '消息正文及其中的MVU更新',
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
async function rerun() {
  if (!checkTarget()) return;
  const confirmed = await Modal.confirm(
    '回滚后重新计算',
    `目标：${target.value.chatId}，楼层 ${target.value.messageId}。\n将先撤销本楼层上一条常规链可回滚的提交，再按已保存配置运行。已交付的广播无法撤回，重新计算可能再次广播。仅本次脚本会话保留的日志可用。`,
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
function taskOverview(result: RunResult) {
  const counts = new Map<string, number>();
  for (const task of result.tasks) counts.set(task.status, (counts.get(task.status) || 0) + 1);
  return [`${result.tasks.length} 个任务`, ...[...counts].map(([status, count]) => `${labels[status]} ${count}`)].join(
    ' · ',
  );
}
function dataImpact(result: RunResult) {
  const writes = result.tasks.flatMap(task => task.writes);
  const committed = writes.filter(write => write.status === 'committed').length;
  const delivered = writes.filter(write => write.status === 'delivered').length;
  const failedDelivery = writes.filter(write => write.status === 'delivery_failed').length;
  const parts: string[] = [];
  if (hasResidue(result)) parts.push('存在未恢复的修改或任务状态，请检查受影响目标。');
  else if (result.rollback.status === 'completed') parts.push('已撤销本链需要回滚的提交。');
  if (committed) parts.push(`已写入 ${committed} 个文本目标。`);
  if (delivered) parts.push(`已交付 ${delivered} 个广播，无法撤回。`);
  if (failedDelivery) parts.push(`${failedDelivery} 个广播交付失败，可能部分送达；请检查接收方。`);
  return parts.length ? parts.join('') : '无成功写入或广播交付记录。';
}
async function copyDiagnostic(result: RunResult) {
  try {
    await navigator.clipboard.writeText(
      JSON.stringify({ ...result, logs: taskRunLogs.get(result.runId) ?? [] }, null, 2),
    );
    feedback.value = '已复制运行诊断。内容包含返回文本与写入目标，请按需分享。';
  } catch {
    feedback.value = '无法访问剪贴板，请展开运行诊断查看信息。';
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
  gap: 12px;
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
  padding: 16px 18px;
  border: 1px solid var(--mvu-line, #d5dce6);
  background: var(--mvu-panel, #fff);
  border-radius: 12px;
  min-width: 0;
}
.controls-body,
.run-context {
  display: grid;
  gap: 12px;
}
.run-controls {
  padding: 4px 16px;
  background: var(--mvu-soft);
}
.controls-summary {
  padding: 10px 0;
}
.controls-summary > span {
  margin-inline-start: 10px;
}
.controls-body {
  padding: 8px 0 12px;
}
.run-selectors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.run-selectors label {
  flex: 1 1 220px;
}
.history-heading,
.result-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.history-heading {
  justify-content: space-between;
}
.history-heading h3 span {
  margin-inline-start: 6px;
  font-weight: 400;
}
.result-heading > strong {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.status-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 5px;
  font-size: 12px;
  color: var(--mvu-muted);
}
.status-badge.succeeded {
  color: var(--mvu-success);
}
.status-badge.failed {
  color: var(--mvu-danger);
}
.status-badge.partial {
  color: var(--mvu-warning);
}
.runs button.text-button {
  min-height: 32px;
  padding: 4px 8px;
  border-color: transparent;
  background: transparent;
  color: var(--mvu-muted);
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
  gap: 8px;
}
.needs-attention {
  border-inline-start: 4px solid var(--mvu-warning, #95600a);
}
.impact {
  font-size: 13px;
}
.failure-summary {
  list-style: none;
  padding: 8px 12px;
  margin: 0;
  border-inline-start: 3px solid var(--mvu-danger);
  background: var(--mvu-soft);
  color: var(--mvu-danger);
  overflow-wrap: anywhere;
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
  padding: 10px 0;
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
.task-details > summary,
.diagnostic > summary,
.run-warnings > summary {
  font-size: 13px;
}
.task-details > summary {
  color: var(--mvu-accent);
}
.returned-text > summary,
.error-diagnostic > summary {
  font-size: 13px;
  padding: 4px 0;
  min-height: 30px;
}
.returned-text > summary span,
.error-diagnostic > summary span {
  margin-inline-start: 6px;
}
.error-context {
  font-size: 13px;
  color: var(--mvu-muted);
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
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
.writes li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  padding: 6px 0;
  font-size: 13px;
}
.writes li > span:first-child {
  flex: 1;
  min-width: min(180px, 100%);
}
.writes li > p {
  flex-basis: 100%;
}
.active-runs {
  display: grid;
  gap: 8px;
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
