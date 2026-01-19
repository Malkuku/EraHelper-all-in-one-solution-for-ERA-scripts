<template>
  <div class="json-tree" :class="{ 'dark-mode': uiStore.darkMode }">
    <json-node
      v-for="(n, i) in roots"
      :key="i"
      :node="n"
      @toggle="onToggle"
      @send-path="(p: string) => $emit('sendPath', p)"
    />
    <div v-if="roots.length === 0" class="empty-tree">No data</div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import { JsonNodeType } from '../../types/JsonNode';
import JsonNode from './JsonNode.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

/* ---------- props / emit ---------- */
const props = defineProps<{ data: any }>();
const emit = defineEmits<{
  toggle: [node: JsonNodeType];
  sendPath: [path: string];
}>();

/* ---------- 递归建树 (保持原有逻辑) ---------- */
function buildTree(obj: any, depth = 0, path = '', expanded = false): JsonNodeType[] {
  if (obj === null || typeof obj !== 'object') return [];
  return Object.keys(obj).map(k => {
    const curPath = path ? `${path}.${k}` : k;
    const val = obj[k];
    const isLeaf = val === null || typeof val !== 'object';
    const node: JsonNodeType = { key: k, value: val, depth, path: curPath, isLeaf, expanded };
    if (!isLeaf) node.children = buildTree(val, depth + 1, curPath, expanded);
    return node;
  });
}

/* ---------- 响应式树根 ---------- */
const roots = ref<JsonNodeType[]>([]);
watch(
  () => props.data,
  val => (roots.value = buildTree(val)),
  { immediate: true },
);

/* ---------- 事件透传 ---------- */
function onToggle(n: JsonNodeType) {
  n.expanded = !n.expanded;
  emit('toggle', n);
}
</script>

<style scoped lang="scss">
.json-tree {
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  padding: 10px;
  background-color: #fff; /* 保持与 Edit 风格一致的背景 */
  white-space: nowrap;
}

.empty-tree {
  padding: 20px;
  color: #9ca3af;
  text-align: center;
  font-style: italic;
}

/* 黑夜模式 */
.dark-mode .json-tree {
  background-color: #1f2937;
  color: #e2e8f0;
}

.dark-mode .empty-tree {
  color: #6b7280;
}
</style>
