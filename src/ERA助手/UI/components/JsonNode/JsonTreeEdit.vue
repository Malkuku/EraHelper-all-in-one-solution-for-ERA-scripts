<template>
  <div class="json-tree" :class="{ 'dark-mode': uiStore.darkMode }">
    <JsonNodeEdit
      v-for="node in filteredRoots"
      :key="node.path"
      :node="node"
      :editing-node-path="editingNodePath"
      @toggle-expand="toggleExpand"
      @start-edit="startEdit"
      @cancel-edit="cancelEdit"
      @save-edit="saveEdit"
      @add-child="addChild"
      @remove-node="removeNode"
    />
    <div v-if="filteredRoots.length === 0 && roots.length > 0" class="empty-tree">没有匹配的搜索结果。</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue';
import { get, set, unset, cloneDeep } from 'lodash';
import { JsonNodeType } from '../../types/JsonNode';
import JsonNodeEdit from './JsonNodeEdit.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

/* ---------- Props / Emits ---------- */
const props = defineProps<{
  data: any;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  (e: 'update:data', value: any): void;
}>();

/* ---------- 状态管理 ---------- */
const roots = ref<JsonNodeType[]>([]);
const editingNodePath = ref<string | null>(null);

// --- 新增：用于保存和恢复展开状态的辅助函数 ---

/**
 * 递归获取所有已展开节点的路径
 * @param nodes - 当前要遍历的节点数组
 * @returns 一个包含所有展开节点路径的 Set
 */
function getExpandedPaths(nodes: JsonNodeType[]): Set<string> {
  const paths = new Set<string>();
  for (const node of nodes) {
    if (node.expanded) {
      paths.add(node.path);
      if (node.children) {
        // 递归地从子节点中获取
        getExpandedPaths(node.children).forEach(p => paths.add(p));
      }
    }
  }
  return paths;
}

/**
 * 递归地根据路径集合恢复节点的展开状态
 * @param nodes - 当前要遍历的节点数组
 * @param expandedPaths - 包含所有应展开节点路径的 Set
 */
function restoreExpandedState(nodes: JsonNodeType[], expandedPaths: Set<string>) {
  for (const node of nodes) {
    if (expandedPaths.has(node.path)) {
      node.expanded = true;
    }
    if (node.children) {
      restoreExpandedState(node.children, expandedPaths);
    }
  }
}

/* ---------- 核心：响应式树构建 ---------- */
function buildReactiveTree(obj: any, depth = 0, path = ''): JsonNodeType[] {
  if (obj === null || typeof obj !== 'object') return [];

  return Object.keys(obj).map(key => {
    const value = obj[key];
    const currentPath = path ? (Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`) : key;
    const isLeaf = value === null || typeof value !== 'object';

    const node: JsonNodeType = reactive({
      key,
      value,
      depth,
      path: currentPath,
      isLeaf,
      expanded: false, // 默认折叠
      children: isLeaf ? undefined : buildReactiveTree(value, depth + 1, currentPath),
    });
    return node;
  });
}

// --- 修改：监听外部 data 变化，重建树并恢复状态 ---
watch(
  () => props.data,
  (newData, oldData) => {
    // 1. 在重建树之前，保存当前已展开节点的路径
    const expandedPaths = getExpandedPaths(roots.value);

    // 2. 重建树
    roots.value = buildReactiveTree(newData);

    // 3. 恢复展开状态
    restoreExpandedState(roots.value, expandedPaths);
  },
  { immediate: true },
); // 注意：这里的 deep: true 可以移除了，因为我们是在替换整个 data 对象，浅层监听引用变化即可。

/* ---------- 搜索与过滤 (已集成) ---------- */
const filteredRoots = computed(() => {
  const query = (props.searchQuery || '').trim().toLowerCase();
  if (!query) {
    return roots.value;
  }

  const searchableRoots = cloneDeep(roots.value);

  function filter(nodes: JsonNodeType[]): JsonNodeType[] {
    const result: JsonNodeType[] = [];
    for (const node of nodes) {
      const keyMatch = String(node.key).toLowerCase().includes(query);
      const valueMatch = node.isLeaf && String(node.value).toLowerCase().includes(query);

      const children = node.children ? filter(node.children) : [];

      if (keyMatch || valueMatch || children.length > 0) {
        // 如果子节点有匹配，则强制展开父节点以显示结果
        node.expanded = children.length > 0;
        node.children = children;
        result.push(node);
      }
    }
    return result;
  }

  return filter(searchableRoots);
});

/* ---------- 事件处理 ---------- */
function findNodeByPath(nodes: JsonNodeType[], path: string): JsonNodeType | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (path.startsWith(node.path) && node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function toggleExpand(node: JsonNodeType) {
  // 直接在原始树上操作，这样即使用户清空搜索，展开/折叠状态也能保留
  const originalNode = findNodeByPath(roots.value, node.path);
  if (originalNode) {
    originalNode.expanded = !originalNode.expanded;
  }
}

function startEdit(path: string) {
  editingNodePath.value = path;
}

function cancelEdit() {
  editingNodePath.value = null;
}

function saveEdit({ path, value }: { path: string; value: any }) {
  const newData = cloneDeep(props.data);
  set(newData, path, value);
  emit('update:data', newData);
  editingNodePath.value = null;
}

function addChild({ path, isObject }: { path: string; isObject: boolean }) {
  const newData = cloneDeep(props.data);
  const parent = get(newData, path);

  if (parent === undefined || typeof parent !== 'object') {
    console.warn(`Cannot add child to non-object path: ${path}`);
    return;
  }

  const newKey = isObject ? 'newKey' : parent.length;
  const newPath = isObject ? `${path}.newKey` : `${path}[${newKey}]`;

  set(newData, newPath, 'newValue');
  emit('update:data', newData);

  const parentNode = findNodeByPath(roots.value, path);
  if (parentNode) parentNode.expanded = true;

  setTimeout(() => {
    editingNodePath.value = newPath;
  }, 100);
}

function removeNode(path: string) {
  const newData = cloneDeep(props.data);
  unset(newData, path);

  const parentPath = path.substring(0, path.lastIndexOf('.')) || path.substring(0, path.lastIndexOf('['));
  if (parentPath) {
    const parent = get(newData, parentPath);
    if (Array.isArray(parent)) {
      const cleanedArray = parent.filter(item => item !== null && item !== undefined);
      set(newData, parentPath, cleanedArray);
    }
  }

  emit('update:data', newData);
}
</script>

<style scoped lang="scss">
.json-tree {
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  padding: 10px;
  background-color: #fff;
}
.empty-tree {
  padding: 20px;
  color: #9ca3af;
  text-align: center;
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
