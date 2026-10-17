<template>
  <div class="regex-workbench">
    <div class="toolbar">
      <button @click="create">+ 新建配置</button>
      <label class="file-button"
        >导入正则库<input type="file" accept=".json,application/json" @change="importLibrary"
      /></label>
      <button @click="download">导出正则库</button>
      <button @click="importLegacy">导入旧版正则库</button>
    </div>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <div class="list-editor">
      <aside class="list-sidebar">
        <input v-model="search" aria-label="搜索正则库" placeholder="搜索正则名称或表达式…" />
        <button
          v-for="item in filtered"
          :key="item.id"
          class="sub-item"
          :class="{ active: currentId === item.id }"
          @click="load(item)"
        >
          <strong>{{ item.name }}</strong
          ><small>{{ formatRegexInput(item) }}</small>
        </button>
        <p v-if="!filtered.length" class="hint">暂无匹配配置。配置保存后可在各正则编辑处复用。</p>
      </aside>
      <div class="list-content">
        <div class="fields">
          <label>配置名称<input v-model="currentName" /></label>
          <div class="toolbar">
            <button class="primary" @click="save">{{ currentId ? '更新配置' : '存入正则库' }}</button
            ><button v-if="currentId" class="danger" @click="remove">删除配置</button>
          </div>
        </div>
        <div class="fields">
          <label
            >正则表达式<input v-model="expression" placeholder="输入正则表达式，或 /表达式/gi" class="code-font"
          /></label>
        </div>
        <p v-if="preview.error" class="error" role="alert">{{ preview.error }}</p>
        <label>替换文本<input v-model="replacement" placeholder="任务正则支持 $1 等替换语法" /></label>
        <label>测试文本<textarea v-model="testText" rows="6" placeholder="粘贴模型响应、条目名称或待替换文本" /></label>
        <div class="preview-box">
          <strong>提取预览（完整匹配）</strong>
          <pre>{{ preview.extracted }}</pre>
        </div>
        <details open>
          <summary>匹配详情 · {{ preview.matches.length }} 项</summary>
          <div v-for="(match, index) in preview.matches" :key="index" class="match-card">
            <strong>#{{ index + 1 }} · {{ match[0] }}</strong>
            <p v-for="(group, gi) in match.slice(1)" :key="gi">${{ gi + 1 }}：{{ group }}</p>
          </div>
          <p v-if="!preview.matches.length" class="hint">未找到匹配项；运行时提取规则全部未匹配会明确失败。</p>
        </details>
        <label
          >替换预览语义<select v-model="replaceMode">
            <option value="task">显式任务正则（支持 $1 / $&amp;）</option>
            <option value="target">写入目标替换（按字面插入提取内容）</option>
          </select></label
        >
        <pre class="preview-box">{{ preview.replaced }}</pre>
        <div v-if="seed" class="toolbar">
          <button class="primary" :disabled="!!preview.error" @click="apply">应用回当前字段</button
          ><button @click="$emit('done')">返回编辑</button>
        </div>
        <p class="hint">
          修改正则库和应用字段后，点击页面的“保存配置”才持久化。库的修改不会自动改写已经引用过的任务字段。
        </p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  matchTaskRegex,
  parseRegexInput,
  formatRegexInput,
  parseRegexPresets,
  RegexPresetSchema,
  type RegexPreset,
  type RegexSpec,
} from '@/MVU助手/AsyncAnalyze/TaskSchema';
const library = defineModel<RegexPreset[]>({ required: true });
const props = defineProps<{
  seed?: RegexSpec & { replacement?: string };
  purpose?: 'match' | 'extract' | 'task' | 'target';
}>();
const emit = defineEmits<{ apply: [value: RegexSpec & { replacement: string }]; done: [] }>();
const currentId = ref(''),
  currentName = ref(''),
  search = ref(''),
  replacement = ref(''),
  testText = ref(''),
  replaceMode = ref('task');
const current = ref<RegexSpec>({ pattern: '', flags: '' }),
  error = ref(''),
  notice = ref('');
const filtered = computed(() =>
  library.value.filter(item => `${item.name} ${item.pattern}`.toLowerCase().includes(search.value.toLowerCase())),
);
const expression = ref(formatRegexInput(current.value));
watch(
  expression,
  value => {
    current.value = parseRegexInput(value);
  },
  { flush: 'sync' },
);
watch(
  () => [current.value.pattern, current.value.flags],
  () => {
    const parsed = parseRegexInput(expression.value);
    if (parsed.pattern !== current.value.pattern || parsed.flags !== current.value.flags)
      expression.value = formatRegexInput(current.value);
  },
);
const preview = computed(() => {
  try {
    const matches = matchTaskRegex(testText.value, current.value);
    const regex = new RegExp(current.value.pattern, current.value.flags);
    const replaced =
      replaceMode.value === 'task'
        ? testText.value.replace(regex, replacement.value)
        : testText.value.replace(regex, () => replacement.value);
    return {
      matches,
      extracted: matches.map(match => match[0]).join('\n'),
      replaced:
        replaceMode.value === 'target' && !matches.length ? '目标替换未匹配，运行时会以 conflict 失败。' : replaced,
      error: '',
    };
  } catch (cause) {
    return { matches: [], extracted: '', replaced: '', error: String(cause) };
  }
});
watch(
  () => props.seed,
  value => {
    if (value) {
      create();
      current.value = { pattern: value.pattern, flags: value.flags };
      replacement.value = value.replacement ?? '';
      replaceMode.value = props.purpose === 'target' ? 'target' : 'task';
    }
  },
  { immediate: true },
);
function create() {
  currentId.value = '';
  currentName.value = '';
  current.value = { pattern: '', flags: '' };
  replacement.value = '';
  error.value = '';
  notice.value = '';
}
function load(item: RegexPreset) {
  currentId.value = item.id;
  currentName.value = item.name;
  current.value = { pattern: item.pattern, flags: item.flags };
  replacement.value = item.replacement;
  error.value = '';
  notice.value = '';
}
function save() {
  try {
    const item = RegexPresetSchema.parse({
      id: currentId.value || crypto.randomUUID(),
      name: currentName.value,
      ...current.value,
      replacement: replacement.value,
    });
    const index = library.value.findIndex(preset => preset.id === item.id);
    if (index < 0) library.value.push(item);
    else library.value[index] = item;
    currentId.value = item.id;
    error.value = '';
    notice.value = '正则库草稿已更新，请保存配置。';
  } catch (cause) {
    error.value = String(cause);
  }
}
function remove() {
  library.value = library.value.filter(item => item.id !== currentId.value);
  create();
  notice.value = '已从草稿删除，请保存配置。';
}
function merge(value: unknown) {
  const items = parseRegexPresets(value);
  if (!items.length) throw new Error('正则库为空');
  const ids = new Set(library.value.map(item => item.id));
  library.value.push(
    ...items.map(item => {
      const id = ids.has(item.id) ? crypto.randomUUID() : item.id;
      ids.add(id);
      return { ...item, id };
    }),
  );
  error.value = '';
  notice.value = `已导入 ${items.length} 项到草稿，请保存配置。`;
}
async function importLibrary(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    merge(JSON.parse(await file.text()));
  } catch (cause) {
    error.value = `导入失败：${String(cause)}`;
  }
}
function importLegacy() {
  try {
    const value = getVariables({ type: 'script', script_id: getScriptId() }).saved_regex_configs;
    if (value === undefined) throw new Error('当前脚本没有保存的旧版正则库；可使用导入文件');
    merge(value);
  } catch (cause) {
    error.value = String(cause);
  }
}
function download() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(library.value, null, 2)], { type: 'application/json;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = '正则库.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function apply() {
  emit('apply', { ...current.value, replacement: replacement.value });
}
</script>
<style scoped>
.list-editor {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}
.list-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--soft);
  padding: 10px;
  border-right: 1px solid var(--line);
}
.list-content {
  flex: 1;
  min-width: 0;
  padding: 16px;
  background: var(--panel);
}
.sub-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px;
  margin-top: 4px;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
}
.sub-item.active {
  border-left: 3px solid #6366f1;
}
.sub-item strong,
.sub-item small {
  display: block;
  overflow-wrap: anywhere;
}
.sub-item small {
  color: var(--muted);
  font-family: monospace;
  font-size: 11px;
}
.preview-box,
.match-card {
  border: 1px solid var(--line);
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
  background: var(--soft);
}
.preview-box pre,
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.match-card p {
  margin: 5px 0;
  font-family: monospace;
}
.code-font {
  font-family: monospace;
}
@media (max-width: 768px) {
  .list-editor {
    flex-direction: column;
  }
  .list-sidebar {
    width: auto;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    max-height: 200px;
    overflow-y: auto;
  }
  .list-content {
    padding: 10px;
  }
}
</style>
