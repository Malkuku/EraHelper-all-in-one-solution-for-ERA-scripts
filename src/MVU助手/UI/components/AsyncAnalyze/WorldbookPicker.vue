<template>
  <div class="worldbook-picker">
    <div class="picker-toolbar">
      <label>搜索世界书<input v-model="bookSearch" placeholder="输入世界书名称" /></label>
      <label
        >酒馆世界书<select :value="bookName" @change="changeBook(($event.target as HTMLSelectElement).value)">
          <option value="">请选择世界书</option>
          <option v-if="bookName && !names.includes(bookName)" :value="bookName">{{ bookName }}（当前不可用）</option>
          <option v-for="name in filteredNames" :key="name" :value="name">{{ name }}</option>
        </select></label
      >
      <button type="button" :disabled="loading" @click="refresh">{{ loading ? '读取中…' : '刷新 / 重试' }}</button>
    </div>
    <p v-if="error" class="error" role="alert">读取失败：{{ error }}。已选数据保留，可重试。</p>
    <template v-if="bookName">
      <div class="picker-toolbar">
        <label>搜索条目<input v-model="entrySearch" placeholder="名称、UID 或内容" /></label>
        <span v-if="!single">已勾选 {{ entryUids.length }} 项</span>
        <button v-if="!single" type="button" :disabled="!!error || loading" @click="selectVisible">勾选搜索结果</button>
        <button v-if="!single" type="button" @click="$emit('update:entryUids', [])">清空勾选</button>
      </div>
      <div class="entry-list">
        <label v-for="entry in filteredEntries" :key="entry.uid" class="entry-row">
          <input
            :type="single ? 'radio' : 'checkbox'"
            :checked="single ? entryUid === entry.uid : entryUids.includes(entry.uid)"
            @change="choose(entry)"
          />
          <span
            ><strong>{{ entry.name || '未命名条目' }}</strong
            ><small
              >UID {{ entry.uid }} · {{ entry.enabled ? '已启用' : '已停用'
              }}<template v-if="matchedByRegex(entry.name)"> · 名称正则命中</template></small
            ></span
          >
          <details @click.stop>
            <summary>内容</summary>
            <pre>{{ entry.content }}</pre>
          </details>
        </label>
        <p v-if="!loading && !error && !filteredEntries.length" class="hint">没有匹配的条目。</p>
      </div>
      <p v-if="unavailableUids.length" class="hint">
        当前未能读取的已选 UID：{{ unavailableUids.join(', ') }}（保留配置）
      </p>
      <template v-if="single">
        <button type="button" @click="$emit('update:entryUid', undefined)">使用新建条目名称</button>
        <label
          >条目名称 / 新建名称<input
            :value="entryName"
            @input="$emit('update:entryName', ($event.target as HTMLInputElement).value)"
        /></label>
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { RegexSpec } from '@/MVU助手/AsyncAnalyze/TaskSchema';
const props = withDefaults(
  defineProps<{
    bookName: string;
    entryUids?: number[];
    nameRegexes?: RegexSpec[];
    single?: boolean;
    entryUid?: number;
    entryName?: string;
  }>(),
  { entryUids: () => [], nameRegexes: () => [], entryName: '', entryUid: undefined },
);
const emit = defineEmits<{
  'update:bookName': [value: string];
  'update:entryUids': [value: number[]];
  'update:entryUid': [value: number | undefined];
  'update:entryName': [value: string];
}>();
const names = ref<string[]>([]),
  entries = ref<WorldbookEntry[]>([]);
const bookSearch = ref(''),
  entrySearch = ref(''),
  error = ref(''),
  loading = ref(false);
let request = 0;
const filteredNames = computed(() =>
  names.value.filter(name => name === props.bookName || name.toLowerCase().includes(bookSearch.value.toLowerCase())),
);
const filteredEntries = computed(() =>
  entries.value.filter(entry =>
    `${entry.name} ${entry.uid} ${entry.content}`.toLowerCase().includes(entrySearch.value.toLowerCase()),
  ),
);
const unavailableUids = computed(() =>
  (props.single ? (props.entryUid === undefined ? [] : [props.entryUid]) : props.entryUids).filter(
    uid => !entries.value.some(entry => entry.uid === uid),
  ),
);
function matchedByRegex(name: string) {
  return props.nameRegexes.some(spec => {
    try {
      return new RegExp(spec.pattern, spec.flags).test(name);
    } catch {
      return false;
    }
  });
}
async function refresh() {
  const token = ++request,
    book = props.bookName;
  loading.value = true;
  error.value = '';
  try {
    const nextNames = getWorldbookNames();
    const nextEntries = book ? await getWorldbook(book) : [];
    if (token !== request) return;
    names.value = nextNames;
    entries.value = nextEntries;
  } catch (cause) {
    if (token === request) error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    if (token === request) loading.value = false;
  }
}
function changeBook(name: string) {
  if (name === props.bookName) return;
  // A user's explicit book change creates a new identity; a read failure never changes it.
  entries.value = [];
  emit('update:bookName', name);
  emit('update:entryUids', []);
  emit('update:entryUid', undefined);
  emit('update:entryName', '');
}
function choose(entry: WorldbookEntry) {
  if (props.single) {
    emit('update:entryUid', entry.uid);
    emit('update:entryName', entry.name);
  } else
    emit(
      'update:entryUids',
      props.entryUids.includes(entry.uid)
        ? props.entryUids.filter(uid => uid !== entry.uid)
        : [...props.entryUids, entry.uid],
    );
}
function selectVisible() {
  emit('update:entryUids', [...new Set([...props.entryUids, ...filteredEntries.value.map(entry => entry.uid)])]);
}
watch(
  () => props.bookName,
  () => {
    entries.value = [];
    entrySearch.value = '';
    void refresh();
  },
);
onMounted(refresh);
</script>
<style scoped>
.picker-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.picker-toolbar label {
  flex: 1;
  min-width: 150px;
}
.entry-list {
  max-height: 310px;
  overflow-y: auto;
  border: 1px solid var(--line, #d1d5db);
  border-radius: 6px;
  padding: 6px;
}
.entry-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-bottom: 1px solid var(--line, #e5e7eb);
}
.entry-row > span {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.entry-row input {
  width: auto;
}
small {
  display: block;
  color: var(--muted, #6b7280);
  margin-top: 4px;
}
details {
  max-width: 50%;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.error {
  color: #dc2626;
}
.hint {
  font-size: 12px;
  color: var(--muted, #6b7280);
}
</style>
