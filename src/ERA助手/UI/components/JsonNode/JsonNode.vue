<template>
  <div class="json-node" :style="{ marginLeft: `${node.depth * 20}px` }">
    <div class="line">
      <!-- 折叠/展开箭头 -->
      <span v-if="!node.isLeaf" class="arrow" :class="{ expanded: node.expanded }" @click="onToggle"> ▶ </span>
      <span v-else class="space" />

      <!-- Key -->
      <span class="key">{{ node.key }}:</span>

      <!-- 值 / 折叠预览 -->
      <template v-if="node.isLeaf">
        <span class="value" :class="getValueTypeClass(node.value)">
          {{ formatValue(node.value) }}
        </span>
      </template>
      <template v-else-if="!node.expanded">
        <span class="preview">
          {{ Array.isArray(node.value) ? `[${node.value.length}]` : `{...}` }}
        </span>
      </template>

      <!-- 操作按钮 (悬浮显示) -->
      <div class="actions">
        <!-- 保留原有的 sendPath 功能，但样式改为 Edit 风格的按钮 -->
        <button v-if="node.isLeaf" class="btn-action" title="添加此路径" @click="$emit('sendPath', node.path)">
          +
        </button>
      </div>
    </div>

    <!-- 子节点递归 -->
    <div v-if="node.expanded && node.children" class="children-container">
      <JsonNode
        v-for="(child, i) in node.children"
        :key="i"
        :node="child"
        @toggle="$emit('toggle', $event)"
        @send-path="$emit('sendPath', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { JsonNodeType } from '../../types/JsonNode';

const props = defineProps<{ node: JsonNodeType }>();
const emit = defineEmits<{
  toggle: [node: JsonNodeType];
  sendPath: [path: string];
}>();

function onToggle() {
  emit('toggle', props.node);
}

// 格式化显示值
function formatValue(value: any): string {
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

// 获取值的类型类名 (用于颜色区分)
function getValueTypeClass(value: any): string {
  if (value === null) return 'type-null';
  return `type-${typeof value}`;
}
</script>

<style scoped lang="scss">
.json-node {
  position: relative;
  font-family: monospace;
  font-size: 12px;
}

.line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px; /*稍微调整padding使其更紧凑*/
  border-radius: 4px;
  transition: background-color 0.2s;
  min-height: 24px;

  &:hover {
    background-color: #f1f5f9;
    .actions {
      opacity: 1;
    }
  }
}

.arrow {
  cursor: pointer;
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.2s;
  user-select: none;

  &.expanded {
    transform: rotate(90deg);
  }

  &:hover {
    color: #475569;
  }
}

.space {
  width: 16px;
}

.key {
  color: #1e293b;
  font-weight: 600;
}

.value {
  &.type-string {
    color: #059669;
  }
  &.type-number {
    color: #dc2626;
  }
  &.type-boolean {
    color: #7c3aed;
  }
  &.type-null {
    color: #64748b;
    font-style: italic;
  }
}

.preview {
  color: #94a3b8;
  font-style: italic;
}

/* 操作按钮区域 */
.actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.btn-action {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #e2e8f0;
    color: #0f172a;
  }
}

.children-container {
  /* 移除左侧边框线，保持 Edit 风格的简洁 */
  /* 如果需要虚线指引，可以取消下面注释 */
  /* padding-left: 10px; */
  /* border-left: 1px dashed #e2e8f0; */
}
</style>
