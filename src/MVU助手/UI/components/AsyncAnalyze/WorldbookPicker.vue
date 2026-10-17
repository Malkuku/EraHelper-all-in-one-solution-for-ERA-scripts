<template>
  <div class="worldbook-picker">
    <div class="picker-toolbar">
      <label
        ><span class="field-label"
          >搜索世界书<Tooltip content="仅筛选下拉列表中的世界书，不会更改已经选择的世界书。" /></span
        ><input v-model="bookSearch" aria-label="搜索世界书" placeholder="输入世界书名称"
      /></label>
      <label
        ><span class="field-label"
          >酒馆世界书<Tooltip
            :content="
              single
                ? '选择结果写入的目标世界书。更换世界书会清空原条目选择。'
                : '选择参与本任务扫描的世界书。更换世界书会清空原条目选择；仅选择世界书不会自动选中全部条目。'
            " /></span
        ><select
          aria-label="酒馆世界书"
          :value="bookName"
          @change="changeBook(($event.target as HTMLSelectElement).value)"
        >
          <option value="">请选择世界书</option>
          <option v-if="bookName && !names.includes(bookName)" :value="bookName">{{ bookName }}（当前不可用）</option>
          <option v-for="name in filteredNames" :key="name" :value="name">{{ name }}</option>
        </select></label
      >
      <button type="button" :disabled="loading" @click="refresh">{{ loading ? '读取中…' : '刷新 / 重试' }}</button>
    </div>
    <p v-if="error" class="error" role="alert">读取失败：{{ error }}。已选数据保留，可重试。</p>
    <template v-if="bookName">
      <div class="selected-entries" aria-label="已选世界书条目">
        <span class="selection-label">{{ single ? '目标条目' : `已选条目（${entryUids.length}）` }}</span>
        <div v-if="selectedUids.length" class="selection-tags">
          <span v-for="uid in selectedUids" :key="uid" class="selection-tag">
            {{ entryLabel(uid) }}
            <button type="button" :aria-label="`移除 ${entryLabel(uid)}`" @click="removeSelected(uid)">×</button>
          </span>
        </div>
        <span v-else class="hint">{{ single ? entryName || '未选择目标条目' : '尚未选择条目' }}</span>
        <button type="button" :aria-expanded="pickerOpen" @click="pickerOpen = !pickerOpen">
          {{ pickerOpen ? '收起条目选择 ▴' : '选择条目 ▾' }}
        </button>
      </div>
      <div v-show="pickerOpen" class="entry-panel">
        <div class="picker-toolbar">
          <label
            ><span class="field-label"
              >搜索条目<Tooltip
                content="按名称或内容筛选列表，不会取消已选条目。勾选搜索结果仅增加当前可见条目。" /></span
            ><input v-model="entrySearch" aria-label="搜索条目" placeholder="搜索条目名称或内容"
          /></label>
          <span v-if="!single">已勾选 {{ entryUids.length }} 项</span>
          <button v-if="!single" type="button" :disabled="!!error || loading" @click="selectVisible">
            勾选搜索结果
          </button>
          <button v-if="!single" type="button" @click="$emit('update:entryUids', [])">清空勾选</button>
        </div>
        <div class="entry-list">
          <div
            v-for="entry in filteredEntries"
            :key="entry.uid"
            class="entry-row"
            :class="{ 'is-selected': selectedUids.includes(entry.uid) }"
          >
            <label class="entry-choice">
              <input
                :type="single ? 'radio' : 'checkbox'"
                :checked="single ? entryUid === entry.uid : entryUids.includes(entry.uid)"
                @change="choose(entry)"
              />
              <span
                ><strong>{{ entry.name || '未命名条目' }}</strong
                ><small v-if="matchedByRegex(entry.name)">名称正则命中</small></span
              >
            </label>
            <details @click.stop>
              <summary>内容</summary>
              <pre>{{ entry.content }}</pre>
            </details>
          </div>
          <p v-if="!loading && !error && !filteredEntries.length" class="hint">没有匹配的条目。</p>
        </div>
      </div>
      <p v-if="unavailableUids.length" class="hint">
        有 {{ unavailableUids.length }} 个已选条目暂时无法读取，选择已保留。
      </p>
      <template v-if="single">
        <button type="button" @click="$emit('update:entryUid', undefined)">使用新建条目名称</button>
        <label
          ><span class="field-label"
            >条目名称 / 新建名称<Tooltip
              content="选定已有条目时写入该条目；使用新建条目名称后，按此名称创建缺失目标并启用。" /></span
          ><input
            aria-label="条目名称 / 新建名称"
            :value="entryName"
            @input="$emit('update:entryName', ($event.target as HTMLInputElement).value)"
        /></label>
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Tooltip from '../Common/Tooltip.vue';
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
const pickerOpen = ref(false);
const selectedUids = computed(() =>
  props.single ? (props.entryUid === undefined ? [] : [props.entryUid]) : props.entryUids,
);
function entryLabel(uid: number) {
  const entry = entries.value.find(entry => entry.uid === uid);
  return entry ? entry.name || '未命名条目' : '未能读取的条目';
}
function removeSelected(uid: number) {
  if (props.single) emit('update:entryUid', undefined);
  else
    emit(
      'update:entryUids',
      props.entryUids.filter(value => value !== uid),
    );
}
let request = 0;
const filteredNames = computed(() =>
  names.value.filter(name => name === props.bookName || name.toLowerCase().includes(bookSearch.value.toLowerCase())),
);
const filteredEntries = computed(() =>
  entries.value.filter(entry =>
    `${entry.name} ${entry.content}`.toLowerCase().includes(entrySearch.value.toLowerCase()),
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
    pickerOpen.value = false;
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
    pickerOpen.value = false;
    void refresh();
  },
);
onMounted(refresh);
</script>
<style scoped>
.selected-entries {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  margin: 8px 0;
  border: 1px solid var(--mvu-control-line);
  border-radius: 7px;
}
.selection-label {
  font-weight: 600;
}
.selection-tags {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  gap: 6px;
}
.selection-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 3px 8px;
  border: 1px solid var(--mvu-accent);
  border-radius: 6px;
  background: var(--soft);
}
.worldbook-picker .selection-tag button {
  flex-shrink: 0;
  min-height: 28px;
  min-width: 28px;
  padding: 0 4px;
  border: 0;
}
.picker-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.worldbook-picker .picker-toolbar > label {
  flex: 1 1 180px;
  min-width: min(180px, 100%);
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
.worldbook-picker .entry-choice {
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin: 0;
  cursor: pointer;
}
.entry-choice > span {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.entry-row input {
  width: auto;
  margin: 0;
}
.entry-row.is-selected {
  background: var(--soft);
  box-shadow: inset 3px 0 var(--mvu-accent);
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
