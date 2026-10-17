<template>
  <div class="task-manager" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="toolbar">
      <button class="primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存配置' }}</button>
      <button :disabled="saving" @click="reset">撤销未保存修改</button>
      <button @click="exportConfiguration">导出配置</button>
      <label class="file-button"
        >导入配置<input :disabled="saving" type="file" accept=".json,application/json" @change="importConfiguration"
      /></label>
      <span>{{ dirty ? '有未保存修改' : '配置已同步' }}</span>
    </div>
    <p v-if="configurationError" class="error" role="alert">{{ configurationError }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <fieldset :disabled="saving">
      <nav class="tabs" aria-label="任务配置分类">
        <button v-for="item in tabs" :key="item.id" :class="{ selected: tab === item.id }" @click="tab = item.id">
          {{ item.label }}
        </button>
      </nav>

      <section v-if="tab === 'groups'">
        <div class="toolbar">
          <button @click="addGroup">+ 新建规则组</button
          ><label
            >活动规则组<select v-model="draft.activeGroupId">
              <option :value="null">不启用常规任务链</option>
              <option v-for="group in draft.groups" :key="group.id" :value="group.id">{{ group.name }}</option>
            </select></label
          >
        </div>
        <label
          >自动常规任务的最少正文字数<input v-model.number="draft.automatic.minReceivedChars" type="number" min="0"
        /></label>
        <p class="hint">默认 300 字；仅自动常规任务受此限制。事件按任务的事件名触发。</p>
        <details v-for="group in draft.groups" :key="group.id" class="card" open>
          <summary>{{ group.name }}</summary>
          <div class="fields">
            <label>名称<input v-model="group.name" /></label><label>备注<input v-model="group.comment" /></label>
          </div>
          <div class="choices">
            <label v-for="task in draft.tasks" :key="task.id"
              ><input v-model="group.taskIds" type="checkbox" :value="task.id" />{{ task.name }}</label
            >
          </div>
          <p v-if="!draft.tasks.length" class="hint">先在任务页新建任务，再添加到规则组。</p>
          <button class="danger" @click="removeGroup(group.id)">删除规则组</button>
        </details>
      </section>

      <section v-if="tab === 'connections'">
        <button @click="addConnection">+ 新建连接</button>
        <p class="hint">
          填写 API 根地址，例如
          https://example.com/v1。连接密钥单独保存在本地，不包含在配置或预设导出中；留空表示保留已存密钥。
        </p>
        <details v-for="connection in draft.connections" :key="connection.id" class="card" open>
          <summary>{{ connection.name }}</summary>
          <div class="fields">
            <label>名称<input v-model="connection.name" /></label
            ><label>备注<input v-model="connection.comment" /></label>
            <label
              >API 根地址<input v-model="connection.baseUrl" type="url" placeholder="https://example.com/v1" /></label
            ><label>模型<input v-model="connection.model" /></label>
            <label
              >更新本地密钥<input
                v-model="secrets[connection.secretRef]"
                type="password"
                autocomplete="new-password"
                placeholder="留空保留已存密钥"
            /></label>
          </div>
          <button
            @click="
              secrets[connection.secretRef] = '';
              clearedSecrets.add(connection.secretRef);
            "
          >
            保存时清空密钥
          </button>
          <span v-if="clearedSecrets.has(connection.secretRef)" class="hint">将清空密钥；填写新值可替换。</span>
          <button class="danger" @click="removeConnection(connection.id)">删除连接</button>
        </details>
      </section>

      <section v-if="tab === 'presets'">
        <div class="toolbar">
          <button @click="addPreset">+ 新建预设</button
          ><label class="file-button"
            >导入酒馆原生预设<input type="file" accept=".json,application/json" @change="importPreset"
          /></label>
        </div>
        <p class="hint">
          预设是独立副本。修改酒馆原预设后需重新导入。只编辑下列原生字段，其他字段原样保留；未知扩展字段不代表受支持。
        </p>
        <div class="toolbar">
          <label
            >选择预设<select v-model="selectedPreset">
              <option value="">请选择</option>
              <option v-for="preset in draft.presets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
            </select></label
          >
        </div>
        <div v-if="preset" class="card">
          <label>预设名称<input v-model="preset.name" /></label>
          <div class="toolbar">
            <button @click="duplicatePreset">复制预设</button
            ><button @click="download(preset.name + '.json', preset.raw)">导出原生预设</button
            ><button class="danger" @click="removePreset(preset.id)">删除预设</button>
          </div>
          <div class="fields">
            <label v-for="field in samplingFields" :key="field.key"
              >{{ field.label }}<input v-model.number="preset.raw[field.key]" type="number" :step="field.step"
            /></label>
          </div>
          <p class="hint">
            提示词按 character_id=100001
            的原生全局顺序排列。角色卡、玩家人设、作者注释不会自动填充，可通过宏或模板主动读取。
          </p>
          <p v-if="!rawPreset" class="error">原生预设结构无效，请修正预算参数，或重新导入有效预设后编辑提示词。</p>
          <button :disabled="!rawPreset" @click="addPrompt">+ 新增提示词</button>
          <details v-for="prompt in presetPrompts" :key="prompt.identifier" class="prompt card">
            <summary>
              {{ prompt.name || prompt.identifier }} · {{ promptEnabled(prompt.identifier) ? '启用' : '停用' }}
            </summary>
            <div class="toolbar">
              <label
                ><input
                  type="checkbox"
                  :checked="promptEnabled(prompt.identifier)"
                  @change="togglePrompt(prompt.identifier, ($event.target as HTMLInputElement).checked)"
                />启用</label
              ><button @click="movePrompt(prompt.identifier, -1)">上移</button
              ><button @click="movePrompt(prompt.identifier, 1)">下移</button
              ><button class="danger" @click="removePrompt(prompt.identifier)">删除提示词</button>
            </div>
            <div class="fields">
              <label>名称<input v-model="prompt.name" /></label
              ><label
                >角色<select v-model="prompt.role">
                  <option value="system">system</option>
                  <option value="user">user</option>
                  <option value="assistant">assistant</option>
                </select></label
              >
            </div>
            <p class="hint">标识：{{ prompt.identifier }}{{ prompt.marker ? '（原生占位符）' : '' }}</p>
            <label>内容<textarea v-model="prompt.content" rows="5" /></label>
            <details>
              <summary>原生注入位置</summary>
              <div class="fields">
                <label
                  >位置<select v-model.number="prompt.injection_position">
                    <option :value="0">相对顺序</option>
                    <option :value="1">聊天深度</option>
                  </select></label
                ><label>深度<input v-model.number="prompt.injection_depth" type="number" min="0" /></label
                ><label>注入顺序<input v-model.number="prompt.injection_order" type="number" /></label>
              </div>
            </details>
          </details>
        </div>
      </section>

      <section v-if="tab === 'tasks'">
        <div class="toolbar">
          <button @click="addTask">+ 新建任务</button
          ><label
            >选择任务<select v-model="selectedTask">
              <option value="">请选择</option>
              <option v-for="item in draft.tasks" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select></label
          >
        </div>
        <div v-if="task" class="card">
          <div class="toolbar">
            <label><input v-model="task.enabled" type="checkbox" />启用任务（所有入口）</label
            ><button @click="duplicateTask">复制任务</button
            ><button class="danger" @click="removeTask(task.id)">删除任务</button>
          </div>
          <div class="fields">
            <label>名称<input v-model="task.name" /></label><label>备注<input v-model="task.comment" /></label>
            <label
              >连接<select v-model="task.connectionId">
                <option value="">请选择</option>
                <option v-for="item in draft.connections" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select></label
            >
            <label
              >预设<select v-model="task.presetId">
                <option value="">请选择</option>
                <option v-for="item in draft.presets" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select></label
            >
            <label>附加事件名（可空）<input v-model="task.eventName" /></label
            ><label>执行顺序<input v-model.number="task.order" type="number" step="1" /></label>
            <label>历史消息条数<input v-model.number="task.historyDepth" type="number" min="0" /></label
            ><label>自动触发楼层间隔<input v-model.number="task.triggerInterval" type="number" min="1" /></label
            ><label>失败重试次数<input v-model.number="task.retryCount" type="number" min="0" /></label>
          </div>
          <label>任务提示词<textarea v-model="task.prompt" rows="6" /></label>
          <details open>
            <summary>世界书候选池</summary>
            <p class="hint">
              仅扫描显式选择的条目。UID
              和名称正则取并集；两者都为空则不会选择条目。候选副本强制启用后仍需按扫描规则触发。
            </p>
            <button @click="task.candidateBooks.push({ bookName: '', entryUids: [], nameRegexes: [] })">
              + 添加世界书
            </button>
            <div v-for="(book, bookIndex) in task.candidateBooks" :key="bookIndex" class="card">
              <div class="fields">
                <label>世界书名称<input v-model="book.bookName" /></label
                ><label
                  >条目 UID（逗号分隔）<input :value="book.entryUids.join(', ')" @change="setUids(book, $event)"
                /></label>
              </div>
              <div v-for="(regex, index) in book.nameRegexes" :key="index" class="regex-row">
                <label>名称正则<input v-model="regex.pattern" /></label
                ><label>flags<input v-model="regex.flags" /></label
                ><button @click="book.nameRegexes.splice(index, 1)">移除</button>
              </div>
              <button @click="book.nameRegexes.push({ pattern: '', flags: '' })">+ 名称正则</button
              ><button class="danger" @click="task.candidateBooks.splice(bookIndex, 1)">移除世界书</button>
            </div>
          </details>
          <details>
            <summary>世界书扫描参数</summary>
            <div class="fields">
              <label v-for="field in scanNumbers" :key="field.key"
                >{{ field.label }}<input v-model.number="task.scan[field.key]" type="number" :min="0" :max="field.max"
              /></label>
            </div>
            <div class="choices">
              <label v-for="field in scanSwitches" :key="field.key"
                ><input v-model="task.scan[field.key]" type="checkbox" />{{ field.label }}</label
              >
            </div>
          </details>
          <details>
            <summary>显式任务正则（{{ task.regexRules.length }}）</summary>
            <p class="hint">依次执行；不继承酒馆全局或角色正则。</p>
            <button @click="addRegex">+ 添加正则</button>
            <div v-for="(regex, index) in task.regexRules" :key="regex.id" class="card">
              <div class="toolbar">
                <label><input v-model="regex.enabled" type="checkbox" />启用</label
                ><button @click="move(task.regexRules, index, -1)">上移</button
                ><button @click="move(task.regexRules, index, 1)">下移</button
                ><button @click="task.regexRules.splice(index, 1)">删除</button>
              </div>
              <div class="fields">
                <label
                  >阶段<select v-model="regex.stage">
                    <option value="history">历史</option>
                    <option value="worldinfo">世界书</option>
                    <option value="prompt">请求消息</option>
                    <option value="response">模型响应</option>
                  </select></label
                ><label>匹配表达式<input v-model="regex.pattern" /></label
                ><label>flags<input v-model="regex.flags" /></label>
              </div>
              <label>替换文本<textarea v-model="regex.replacement" rows="2" /></label>
            </div>
          </details>
          <details open>
            <summary>输出</summary>
            <label
              >输出方式<select
                :value="task.output.mode"
                @change="setOutput(($event.target as HTMLSelectElement).value)"
              >
                <option value="return">仅返回结果</option>
                <option value="write">写入目标</option>
              </select></label
            >
            <template v-if="task.output.mode === 'write'"
              ><p class="hint">写入成功才视为任务成功；世界书按 UID 定位，目标不存在时自动创建并启用。</p>
              <button @click="task.output.writes.push(newWrite())">+ 添加写入</button>
              <div v-for="(write, writeIndex) in task.output.writes" :key="write.id" class="card">
                <div class="toolbar">
                  <label
                    >目标<select
                      :value="write.target.kind"
                      @change="setTarget(write, ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="message">当前正文消息</option>
                      <option value="worldbook">世界书条目</option>
                    </select></label
                  ><button @click="move(task.output.writes, writeIndex, -1)">上移</button
                  ><button @click="move(task.output.writes, writeIndex, 1)">下移</button
                  ><button class="danger" @click="task.output.writes.splice(writeIndex, 1)">删除写入</button>
                </div>
                <div v-if="write.target.kind === 'worldbook'" class="fields">
                  <label>世界书名称<input v-model="write.target.bookName" /></label
                  ><label
                    >已有条目 UID（可空）<input
                      :value="write.target.entryUid ?? ''"
                      type="number"
                      min="0"
                      @input="setEntryUid(write, $event)" /></label
                  ><label>条目名称 / 新建名称<input v-model="write.target.entryName" /></label>
                </div>
                <p class="hint">提取规则分别匹配完整响应，命中结果按列表顺序换行拼接；空列表使用完整响应。</p>
                <div v-for="(extract, index) in write.extract" :key="index" class="regex-row">
                  <label>提取正则<input v-model="extract.pattern" /></label
                  ><label>flags<input v-model="extract.flags" /></label
                  ><button @click="write.extract.splice(index, 1)">删除</button>
                </div>
                <button @click="write.extract.push({ pattern: '', flags: '' })">+ 提取正则</button>
                <label
                  >写入操作<select
                    :value="write.operation.kind"
                    @change="
                      write.operation =
                        ($event.target as HTMLSelectElement).value === 'append'
                          ? { kind: 'append' }
                          : { kind: 'replace', regex: { pattern: '', flags: '' } }
                    "
                  >
                    <option value="append">追加</option>
                    <option value="replace">正则替换</option>
                  </select></label
                >
                <div v-if="write.operation.kind === 'replace'" class="regex-row">
                  <label>目标匹配正则<input v-model="write.operation.regex.pattern" /></label
                  ><label>flags<input v-model="write.operation.regex.flags" /></label>
                </div>
              </div>
            </template>
          </details>
        </div>
      </section>
      <p v-if="!draft.groups.length && !draft.tasks.length" class="hint">
        先配置连接和预设，再创建任务并加入规则组。所有修改点击“保存配置”后生效。
      </p>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { klona } from 'klona';
import {
  ConfigSchema,
  ScanSchema,
  type TaskSettings,
  type TaskConfig,
  type WriteSpec,
} from '@/MVU助手/AsyncAnalyze/TaskSchema';
import {
  NativePresetSchema,
  parseNativePreset,
  type NativePreset,
} from '@/MVU助手/AsyncAnalyze/generation/NativePreset';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { Modal } from '@/MVU助手/utils/modal';

const props = defineProps<{
  settings: TaskSettings;
  saveSettings: (settings: TaskSettings) => Promise<void>;
  setSecret: (reference: string, secret: string) => void;
  deleteSecret: (reference: string) => void;
  configurationError?: string;
}>();
const uiStore = useUiStore();
const draft = ref<TaskSettings>(klona(props.settings));
const baseline = ref(JSON.stringify(props.settings));
const secrets = reactive<Record<string, string>>({});
const clearedSecrets = reactive(new Set<string>());
const pendingDeletes = reactive(new Set<string>());
const dirty = computed(
  () =>
    JSON.stringify(draft.value) !== baseline.value || Object.values(secrets).some(Boolean) || clearedSecrets.size > 0,
);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const tab = ref('groups');
const tabs = [
  { id: 'groups', label: '规则组' },
  { id: 'tasks', label: '任务' },
  { id: 'connections', label: '连接' },
  { id: 'presets', label: '预设' },
];
const selectedTask = ref('');
const selectedPreset = ref('');
const task = computed(() => draft.value.tasks.find((item) => item.id === selectedTask.value));
const preset = computed(() => draft.value.presets.find((item) => item.id === selectedPreset.value));
const rawPreset = computed(() => {
  const raw = preset.value?.raw;
  return raw && NativePresetSchema.safeParse(raw).success ? (raw as NativePreset) : undefined;
});
const presetPrompts = computed(() => {
  const raw = rawPreset.value;
  if (!raw) return [];
  const order = raw.prompt_order.find((item) => item.character_id === 100001)!.order;
  return [...raw.prompts].sort((a, b) => {
    const rank = (id: string) => {
      const index = order.findIndex((item) => item.identifier === id);
      return index < 0 ? order.length : index;
    };
    return rank(a.identifier) - rank(b.identifier);
  });
});
const samplingFields = [
  { key: 'temp_openai', label: '温度', step: '0.01' },
  { key: 'openai_max_tokens', label: '最大回复 Token', step: '1' },
  { key: 'openai_max_context', label: '上下文 Token', step: '1' },
  { key: 'top_p_openai', label: 'Top P', step: '0.01' },
  { key: 'top_k_openai', label: 'Top K', step: '1' },
  { key: 'freq_pen_openai', label: '频率惩罚', step: '0.01' },
  { key: 'pres_pen_openai', label: '存在惩罚', step: '0.01' },
  { key: 'seed', label: '随机种子（-1 随机）', step: '1' },
];
const scanNumbers: {
  key: 'depth' | 'minActivations' | 'minActivationDepthMax' | 'budgetPercent' | 'budgetCap' | 'maxRecursionSteps';
  label: string;
  max?: number;
}[] = [
  { key: 'depth', label: '扫描深度', max: 1000 },
  { key: 'minActivations', label: '最少激活条目数' },
  { key: 'minActivationDepthMax', label: '最少激活最大深度' },
  { key: 'budgetPercent', label: '上下文预算百分比', max: 100 },
  { key: 'budgetCap', label: '预算上限（0 不限制）' },
  { key: 'maxRecursionSteps', label: '最大递归步数（0 不限制）' },
];
const scanSwitches: {
  key: 'includeNames' | 'recursive' | 'caseSensitive' | 'matchWholeWords' | 'useGroupScoring';
  label: string;
}[] = [
  { key: 'includeNames', label: '包含消息名称' },
  { key: 'recursive', label: '递归扫描' },
  { key: 'caseSensitive', label: '区分大小写' },
  { key: 'matchWholeWords', label: '全词匹配' },
  { key: 'useGroupScoring', label: '分组评分' },
];
const uid = () => crypto.randomUUID();
const message = (value: unknown) => (value instanceof Error ? value.message : String(value));
watch(
  () => props.settings,
  (value) => {
    if (!dirty.value && !saving.value) {
      draft.value = klona(value);
      baseline.value = JSON.stringify(value);
    }
  },
  { deep: true },
);
function clearSecretDrafts() {
  Object.keys(secrets).forEach((key) => delete secrets[key]);
  clearedSecrets.clear();
  pendingDeletes.clear();
}
function reset() {
  draft.value = klona(props.settings);
  baseline.value = JSON.stringify(props.settings);
  clearSecretDrafts();
  error.value = '';
  notice.value = '';
}
function validated() {
  const parsed = ConfigSchema.parse(draft.value);
  for (const item of parsed.presets) parseNativePreset(item.raw);
  return parsed;
}
async function save() {
  if (saving.value) return;
  error.value = '';
  notice.value = '';
  saving.value = true;
  try {
    const config = validated();
    await props.saveSettings(klona(config));
    // References are committed before deleting any local credential.
    for (const reference of pendingDeletes)
      if (!config.connections.some((item) => item.secretRef === reference)) props.deleteSecret(reference);
    for (const reference of clearedSecrets)
      if (config.connections.some((item) => item.secretRef === reference)) props.setSecret(reference, '');
    for (const [reference, secret] of Object.entries(secrets))
      if (secret && config.connections.some((item) => item.secretRef === reference)) props.setSecret(reference, secret);
    draft.value = klona(config);
    baseline.value = JSON.stringify(config);
    clearSecretDrafts();
    notice.value = '配置已保存。';
  } catch (cause) {
    error.value = `保存未完成：${message(cause)}`;
  } finally {
    saving.value = false;
  }
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[<>:"/\\|?*]/g, '_');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportConfiguration() {
  try {
    download('任务配置.json', validated());
  } catch (cause) {
    error.value = `无法导出：${message(cause)}`;
  }
}
async function fileData(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return null;
  return { name: file.name.replace(/\.json$/i, ''), value: JSON.parse(await file.text()) as unknown };
}
async function importConfiguration(event: Event) {
  try {
    const file = await fileData(event);
    if (!file) return;
    const config = ConfigSchema.parse(file.value);
    config.presets.forEach((item) => parseNativePreset(item.raw));
    if (!(await Modal.confirm('替换配置草稿', '导入将替换当前配置草稿；本地密钥不会导入。点击保存后生效。'))) return;
    clearSecretDrafts();
    for (const connection of props.settings.connections)
      if (!config.connections.some((item) => item.secretRef === connection.secretRef))
        pendingDeletes.add(connection.secretRef);
    draft.value = klona(config);
    error.value = '';
    notice.value = '配置已导入草稿，请检查后保存；新引用的密钥需在连接页填写。';
  } catch (cause) {
    error.value = `导入失败（旧版配置不受支持）：${message(cause)}`;
  }
}
function addGroup() {
  draft.value.groups.push({ id: uid(), name: '新规则组', comment: '', taskIds: [] });
}
async function removeGroup(id: string) {
  if (!(await Modal.confirm('删除规则组', '从配置草稿删除此规则组？任务本身会保留。'))) return;
  draft.value.groups = draft.value.groups.filter((item) => item.id !== id);
  if (draft.value.activeGroupId === id) draft.value.activeGroupId = null;
}
function addConnection() {
  draft.value.connections.push({ id: uid(), name: '新连接', comment: '', baseUrl: '', model: '', secretRef: uid() });
}
async function removeConnection(id: string) {
  if (draft.value.tasks.some((item) => item.connectionId === id)) {
    error.value = '此连接仍被任务引用，请先修改或删除相关任务。';
    return;
  }
  if (!(await Modal.confirm('删除连接', '删除此连接？保存成功后会清理此连接不再使用的本地密钥。'))) return;
  const connection = draft.value.connections.find((item) => item.id === id)!;
  pendingDeletes.add(connection.secretRef);
  delete secrets[connection.secretRef];
  clearedSecrets.delete(connection.secretRef);
  draft.value.connections = draft.value.connections.filter((item) => item.id !== id);
}
async function addPreset() {
  const context = await Modal.prompt('新建预设', '请输入模型支持的上下文 Token 数（默认回复预算为 300 Token）。');
  if (context === null) return;
  const maxContext = Number(context);
  if (!Number.isInteger(maxContext) || maxContext <= 300) {
    error.value = '上下文 Token 数必须是大于回复预算 300 的整数。';
    return;
  }
  const id = uid();
  draft.value.presets.push({
    id,
    name: '新预设',
    raw: parseNativePreset({
      openai_max_context: maxContext,
      openai_max_tokens: 300,
      prompts: [
        { identifier: 'main', name: '主提示词', role: 'system', content: '', system_prompt: true },
        { identifier: 'worldInfoBefore', name: '世界书（前）', role: 'system', marker: true },
        { identifier: 'chatHistory', name: '聊天历史与任务', role: 'system', marker: true },
        { identifier: 'worldInfoAfter', name: '世界书（后）', role: 'system', marker: true },
      ],
      prompt_order: [
        {
          character_id: 100001,
          order: ['main', 'worldInfoBefore', 'chatHistory', 'worldInfoAfter'].map((identifier) => ({
            identifier,
            enabled: true,
          })),
        },
      ],
    }),
  });
  selectedPreset.value = id;
}
async function importPreset(event: Event) {
  try {
    const file = await fileData(event);
    if (!file) return;
    const raw = parseNativePreset(file.value);
    const name = await Modal.prompt('导入原生预设', '插件副本名称；同名副本将提示覆盖。', file.name);
    if (!name?.trim()) return;
    const existing = draft.value.presets.find((item) => item.name === name.trim());
    if (existing) {
      if (!(await Modal.confirm('覆盖同名预设', `覆盖“${name.trim()}”的副本？引用此预设的任务将在保存后使用新内容。`)))
        return;
      existing.raw = raw;
      selectedPreset.value = existing.id;
    } else {
      const id = uid();
      draft.value.presets.push({ id, name: name.trim(), raw });
      selectedPreset.value = id;
    }
    error.value = '';
    notice.value = '原生预设已导入草稿，请保存配置。';
  } catch (cause) {
    error.value = `预设导入失败：${message(cause)}`;
  }
}
function duplicatePreset() {
  if (!preset.value) return;
  const copy = klona(preset.value);
  copy.id = uid();
  copy.name += '（副本）';
  draft.value.presets.push(copy);
  selectedPreset.value = copy.id;
}
async function removePreset(id: string) {
  if (draft.value.tasks.some((item) => item.presetId === id)) {
    error.value = '此预设仍被任务引用，请先修改或删除相关任务。';
    return;
  }
  if (await Modal.confirm('删除预设', '删除此插件预设副本？酒馆原预设不受影响。')) {
    draft.value.presets = draft.value.presets.filter((item) => item.id !== id);
    selectedPreset.value = '';
  }
}
function globalOrder() {
  return rawPreset.value!.prompt_order.find((item) => item.character_id === 100001)!.order;
}
function promptEnabled(id: string) {
  return globalOrder().find((item) => item.identifier === id)?.enabled ?? false;
}
function togglePrompt(id: string, enabled: boolean) {
  const order = globalOrder();
  const item = order.find((item) => item.identifier === id);
  if (item) item.enabled = enabled;
  else order.push({ identifier: id, enabled });
}
function move<T>(items: T[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
}
function movePrompt(id: string, delta: number) {
  const order = globalOrder();
  let index = order.findIndex((item) => item.identifier === id);
  if (index < 0) {
    order.push({ identifier: id, enabled: false });
    index = order.length - 1;
  }
  move(order, index, delta);
}
function addPrompt() {
  const id = uid();
  rawPreset.value!.prompts.push({
    identifier: id,
    name: '新提示词',
    role: 'system',
    content: '',
    injection_position: 0,
  });
  globalOrder().push({ identifier: id, enabled: true });
}
async function removePrompt(id: string) {
  if (!(await Modal.confirm('删除提示词', `删除 ${id} 及预设内对它的顺序引用？`))) return;
  const raw = rawPreset.value!;
  raw.prompts = raw.prompts.filter((item) => item.identifier !== id);
  raw.prompt_order.forEach((item) => (item.order = item.order.filter((entry) => entry.identifier !== id)));
}
function addTask() {
  const config: TaskConfig = {
    id: uid(),
    name: '新任务',
    comment: '',
    enabled: true,
    eventName: '',
    order: 0,
    historyDepth: 2,
    triggerInterval: 1,
    retryCount: 0,
    prompt: '',
    connectionId: draft.value.connections[0]?.id ?? '',
    presetId: draft.value.presets[0]?.id ?? '',
    candidateBooks: [],
    scan: ScanSchema.parse({}),
    regexRules: [],
    output: { mode: 'return' },
  };
  draft.value.tasks.push(config);
  selectedTask.value = config.id;
}
function duplicateTask() {
  if (!task.value) return;
  const copy = klona(task.value);
  copy.id = uid();
  copy.name += '（副本）';
  draft.value.tasks.push(copy);
  selectedTask.value = copy.id;
}
async function removeTask(id: string) {
  if (!(await Modal.confirm('删除任务', '从任务池及所有规则组移除此任务？'))) return;
  draft.value.tasks = draft.value.tasks.filter((item) => item.id !== id);
  draft.value.groups.forEach((group) => (group.taskIds = group.taskIds.filter((value) => value !== id)));
  selectedTask.value = '';
}
function setUids(book: TaskConfig['candidateBooks'][number], event: Event) {
  const text = (event.target as HTMLInputElement).value;
  const parts = text.trim() ? text.split(/[,，\s]+/).filter(Boolean) : [];
  if (parts.some((item) => !/^\d+$/.test(item))) {
    error.value = '条目 UID 必须是非负整数，以逗号分隔。';
    (event.target as HTMLInputElement).value = book.entryUids.join(', ');
    return;
  }
  book.entryUids = [...new Set(parts.map(Number))];
  error.value = '';
}
function addRegex() {
  task.value!.regexRules.push({ id: uid(), stage: 'prompt', pattern: '', flags: 'g', replacement: '', enabled: true });
}
function newWrite(): WriteSpec {
  return { id: uid(), target: { kind: 'message' }, extract: [], operation: { kind: 'append' } };
}
function setOutput(mode: string) {
  task.value!.output = mode === 'write' ? { mode: 'write', writes: [newWrite()] } : { mode: 'return' };
}
function setTarget(write: WriteSpec, kind: string) {
  write.target = kind === 'worldbook' ? { kind: 'worldbook', bookName: '', entryName: '' } : { kind: 'message' };
}
function setEntryUid(write: WriteSpec, event: Event) {
  if (write.target.kind !== 'worldbook') return;
  const value = (event.target as HTMLInputElement).value;
  write.target.entryUid = value === '' ? undefined : Number(value);
}
</script>

<style scoped lang="scss">
.task-manager {
  --panel: #fff;
  --soft: #f9fafb;
  --line: #d1d5db;
  --text: #111827;
  --muted: #6b7280;
  color-scheme: light;
  padding: 16px;
  color: var(--text);
  font-size: 14px;
  overflow-wrap: anywhere;
}
.task-manager.dark-mode {
  --panel: #1f2937;
  --soft: #111827;
  --line: #4b5563;
  --text: #e5e7eb;
  --muted: #9ca3af;
  color-scheme: dark;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.toolbar,
.tabs,
.choices,
.regex-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.tabs {
  border-bottom: 1px solid var(--line);
  padding: 8px 0;
}
.card {
  margin: 12px 0;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}
summary {
  cursor: pointer;
  font-weight: 600;
  padding: 4px 0 10px;
}
.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
  gap: 12px;
  margin: 12px 0;
}
label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 6px 0;
}
.choices label,
.toolbar label:has(input[type='checkbox']) {
  flex-direction: row;
  align-items: center;
}
input,
textarea,
select {
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--text) !important;
  background: var(--soft) !important;
  font: inherit;
}
input[type='checkbox'] {
  width: auto;
}
textarea {
  resize: vertical;
}
button,
.file-button {
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text) !important;
  background: var(--panel) !important;
  cursor: pointer;
  font: inherit;
}
button:hover,
.selected {
  border-color: #6366f1;
}
button.primary,
button.selected {
  background: #4f46e5 !important;
  color: #fff !important;
  border-color: #4f46e5;
}
button:disabled {
  opacity: 0.55;
  cursor: wait;
}
button.danger {
  color: #dc2626 !important;
}
.file-button input {
  display: none;
}
.hint {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
.error {
  color: #dc2626;
  white-space: pre-wrap;
}
.notice {
  color: #16a34a;
}
.regex-row label:first-child {
  flex: 1;
}
.regex-row label {
  flex-basis: 100px;
}
</style>
