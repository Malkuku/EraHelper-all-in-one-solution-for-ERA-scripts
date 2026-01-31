<template>
  <div class="rule-editor-container" :class="{ 'dark-mode': uiStore.darkMode }">
    <!-- 顶部：当前规则组信息 -->
    <div class="editor-header">
      <div class="breadcrumb">
        <button class="btn text-btn" @click="goBack">← 返回选择</button>
        <span class="separator">/</span>
        <span class="current-rule">{{ currentRuleName || '未选择规则' }}</span>
      </div>
      <div class="header-controls">
        <button class="btn primary" title="新建任务" @click="createTask">+ 新建任务</button>
        <button class="btn primary" style="margin-left: 10px;" @click="saveAll">保存所有更改</button>
      </div>
    </div>

    <div v-if="!currentRuleName" class="error-state">请先在“规则选择”页面选择一个规则组进行编辑。</div>

    <div v-else class="editor-body custom-scrollbar">
      <!-- 任务网格列表 -->
      <div class="task-grid">
        <!-- 全局配置卡片 -->
        <div
          class="task-card global-card"
          @click="openTaskEditor(GLOBAL_ID)"
        >
          <div class="card-header">
            <span class="task-order">★</span>
            <span class="task-name">正文世界书配置</span>
          </div>
          <div class="card-desc">
            配置发送给正文的世界书
            <Tooltip content="这里配置的世界书条目就是正文AI能看到的所有条目，兼容酒馆设置（关闭的条目AI同样看不到，同理，绿灯条目会按照关键词触发）；没有被配置的世界书也会按照原本酒馆的规则发送给AI" placement="top" />
          </div>
        </div>

        <!-- 普通任务卡片 -->
        <div
          v-for="task in sortedTasks"
          :key="task.key"
          class="task-card"
          :class="{ disabled: !task.data.enable }"
          @click="openTaskEditor(task.key)"
        >
          <div class="card-header">
            <span class="task-order">#{{ task.data.order }}</span>
            <span class="task-name" :title="task.key">{{ task.key }}</span>
            <span class="status-badge" :class="{ active: task.data.enable }">
              {{ task.data.enable ? '启用' : '禁用' }}
            </span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="label">触发:</span>
              <span class="value">执行顺序：{{ task.data.order }}/触发间隔：{{ task.data.trigger_index }}/上下文长度：{{ task.data.chat_history }}</span>
            </div>
            <div v-if="task.data.event_name" class="info-row">
              <span class="label">触发事件:</span>
              <span class="value event-name">{{ task.data.event_name }}</span>
            </div>
            <div class="info-row">
              <span class="label">备注:</span>
              <span class="value comment">
                {{ task.data.comment || '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 新建任务占位卡片 (可选) -->
        <div class="task-card add-card" @click="createTask">
          <div class="add-icon">+</div>
          <div class="add-text">新建任务</div>
        </div>
      </div>

      <div v-if="sortedTasks.length === 0" class="empty-tip">
        暂无普通任务，请点击右上角新建
      </div>
    </div>

    <!-- 弹窗组件 -->
    <TaskEditorModal
      v-if="showTaskModal"
      :rule-name="currentRuleName"
      :task-name="currentTaskName"
      @close="showTaskModal = false"
      @update:task-name="currentTaskName = $event"
      @delete-task="handleDeleteTask"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncAnalyzeStore } from '@/ERA助手/stores/AsyncAnalyzeStore';
import { useUiStore } from '@/ERA助手/stores/UIStore';
import { Modal } from '@/ERA助手/utils/modal';
import TaskEditorModal from './TaskEditorModal.vue';
import Tooltip from '../Common/Tooltip.vue';

// --- 类型定义 (保持不变) ---
export interface AsyncAnalyzeSetting {
  [key: string]: {
    comment: string;
    staged_setting: StagedSetting;
    world_book: {
      [key: string]: {
        lores: string[];
        lore_regex: string;
      }
    }
  }
}

export interface StagedSetting {
  [key: string]: {
    comment: string;
    enable: boolean;
    order: number;
    chat_history: number;
    trigger_index: number;
    trigger_history: number;
    reroll_count: number;
    prompt: string;
    world_book: {
      [key: string]: {
        lores: string[];
        lore_regex: string;
      }
    }
    merge_setting: {
      [key: string]: {
        is_inject: boolean;
        world_book: string;
        target_lore: string;
        content_regex: string[];
        replace_regex: string;
      }
    };
    api_config: string;
  }
}

const store = useAsyncAnalyzeStore();
const uiStore = useUiStore();
const route = useRoute();
const router = useRouter();

const GLOBAL_ID = '__GLOBAL__';

// 状态
const currentRuleName = ref<string>('');
const currentTaskName = ref<string>('');
const showTaskModal = ref(false);

// 监听路由参数变化，确保能正确切换规则
watch(
  () => route.query.rule,
  (newRule) => {
    if (newRule) {
      currentRuleName.value = newRule as string;
    }
  }
);

// 初始化
onMounted(async () => {
  const queryRule = route.query.rule as string;
  if (queryRule) {
    currentRuleName.value = queryRule;
  } else if (store.activeRuleName && store.asyncAnalyzeSetting[store.activeRuleName]) {
    currentRuleName.value = store.activeRuleName;
  }
});

// --- 计算属性 ---
const currentRule = computed(() => {
  if (!currentRuleName.value) return null;
  return store.asyncAnalyzeSetting[currentRuleName.value];
});

const sortedTasks = computed(() => {
  if (!currentRule.value || !currentRule.value.staged_setting) return [];
  return Object.entries(currentRule.value.staged_setting)
    .map(([key, data]) => ({
      key,
      data,
    }))
    .sort((a, b) => a.data.order - b.data.order);
});

// --- 导航与保存 ---
const goBack = () => {
  router.push({ name: 'RuleSelection' });
};

const saveAll = async () => {
  await store.saveModelSettings();
  toastr.success('规则已保存');
};

// --- 任务管理 ---
const createTask = async () => {
  if (!currentRule.value) return;
  const name = await Modal.prompt('新建任务', '请输入新任务名称 (例如: AnalyzePersonality)');
  if (!name) return;

  if (!currentRule.value.staged_setting) currentRule.value.staged_setting = {};

  if (currentRule.value.staged_setting[name]) {
    toastr.error('任务名称已存在');
    return;
  }
  currentRule.value.staged_setting[name] = {
    comment: '',
    enable: true,
    order: 0,
    chat_history: 2,
    trigger_index: 1,
    trigger_history: 0,
    reroll_count: 0,
    prompt: '',
    api_config: '',
    world_book: {},
    merge_setting: {},
  };

  // 创建后直接打开弹窗
  openTaskEditor(name);
};

// ... existing code ...
const openTaskEditor = (taskKey: string) => {
  currentTaskName.value = taskKey;
  showTaskModal.value = true;
};

// === 新增：带确认的删除逻辑 ===
const handleDeleteTask = async () => {
  // 1. 基础校验
  if (!currentRule.value || !currentRule.value.staged_setting || !currentTaskName.value) return;

  // 2. 调用 Modal 进行确认
  const confirmed = await Modal.confirm(
    '确认删除',
    `确定要删除任务 "${currentTaskName.value}" 吗？此操作无法撤销。`
  );

  if (!confirmed) return;

  // 3. 操作 Store 数据
  // currentRule 是基于 store 的 computed 属性，直接修改其内部对象会触发 Pinia 状态更新
  delete currentRule.value.staged_setting[currentTaskName.value];

  // 4. 关闭弹窗并清理状态
  showTaskModal.value = false;
  currentTaskName.value = '';

  // 5. (可选) 自动保存到后端/本地存储
  // 如果你希望删除后立即持久化保存，取消下面这行的注释：
  // await store.saveModelSettings();

  // 6. 提示用户
  if (typeof toastr !== 'undefined') {
    toastr.success('任务已删除');
  }
};
</script>

<style scoped lang="scss">
.rule-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  color: #000000;
}

/* Header */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  flex-shrink: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 15px;

  .text-btn {
    background: none;
    border: none;
    color: #4f46e5;
    cursor: pointer;
    padding: 0;
    font-weight: 600;
    &:hover {
      text-decoration: underline;
    }
  }

  .separator {
    margin: 0 10px;
    color: #9ca3af;
  }
  .current-rule {
    font-weight: 700;
    color: #111827;
    font-size: 16px;
  }
}

.error-state {
  padding: 40px;
  text-align: center;
  color: #ef4444;
}

/* Body Layout - Grid System */
.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f3f4f6; /* 浅灰背景衬托卡片 */
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding-bottom: 40px;
}

/* Task Cards */
.task-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border-color: #d1d5db;
  }

  &.disabled {
    opacity: 0.7;
    background: #f9fafb;
    .task-name {
      text-decoration: line-through;
      color: #6b7280;
    }
  }
}

/* Global Card Special Style */
.global-card {
  background: linear-gradient(to bottom right, #fff7ed, #ffffff);
  border-color: #fed7aa;
  grid-column: 1 / -1; /* 横跨整行 */

  .task-order {
    background: #ffedd5;
    color: #c2410c;
  }
  .card-desc {
    margin-top: 8px;
    font-size: 13px;
    color: #9a3412;
  }
  &:hover {
    border-color: #f97316;
  }
}

/* Add Card Style */
.add-card {
  border: 2px dashed #e5e7eb;
  background: transparent;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: #6b7280;

  &:hover {
    border-color: #4f46e5;
    color: #4f46e5;
    background: #eef2ff;
  }

  .add-icon {
    font-size: 32px;
    line-height: 1;
    margin-bottom: 8px;
  }
  .add-text {
    font-weight: 600;
  }
}

/* Card Content */
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.task-order {
  font-size: 12px;
  background: #f3f4f6;
  color: #374151;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.task-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.status-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #e5e7eb;
  color: #4b5563;

  &.active {
    background: #dcfce7;
    color: #166534;
  }
}

.card-body {
  font-size: 13px;
  color: #000000;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;

  .label {
    color: #000000;
  }
  .value {
    font-weight: 500;
    &.comment {
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.empty-tip {
  text-align: center;
  color: #9ca3af;
  margin-top: 40px;
  grid-column: 1 / -1;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;

  &.primary {
    background: #4f46e5;
    color: white;
    &:hover {
      background: #4338ca;
    }
  }
}

/* Custom Scrollbar */
.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
}

/* --- Dark Mode --- */
.rule-editor-container.dark-mode {
  background: #111827;
  color: #e2e8f0;

  .editor-header {
    background: #1f2937;
    border-bottom-color: #374151;
  }
  .breadcrumb .text-btn { color: #818cf8; }
  .breadcrumb .current-rule { color: #f3f4f6; }
  .breadcrumb .separator { color: #6b7280; }

  .editor-body {
    background: #111827; /* 深色背景 */
  }

  .task-card {
    background: #1f2937;
    border-color: #374151;
    color: #e2e8f0;

    &:hover {
      background: #2d3748;
      border-color: #4b5563;
    }

    &.disabled {
      background: #1a202c;
      .task-name { color: #6b7280; }
    }
  }

  .global-card {
    background: linear-gradient(to bottom right, #431407, #1f2937);
    border-color: #7c2d12;
    .task-order { background: #7c2d12; color: #ffedd5; }
    .card-desc { color: #fdba74; }
    &:hover { border-color: #ea580c; }
  }

  .add-card {
    border-color: #374151;
    color: #6b7280;
    &:hover {
      border-color: #6366f1;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.1);
    }
  }

  .task-name { color: #e2e8f0; }
  .task-order { background: #374151; color: #d1d5db; }
  .status-badge { background: #374151; color: #9ca3af; }
  .status-badge.active { background: #064e3b; color: #6ee7b7; }

  .card-body { color: #9ca3af; }
  .info-row .label { color: #6b7280 !important; }  // 添加 !important 以确保暗色模式下正确显示
  .info-row .value { color: #d1d5db; }


  input,
  textarea,
  select {
    color: #e2e8f0 !important;
    background-color: #374151 !important; /* 建议同时也设置背景色以防万一 */
    border-color: #4b5563 !important;
  }

  /* 针对 placeholder 的颜色修复 (可选) */
  input::placeholder,
  textarea::placeholder {
    color: #6b7280 !important;
  }
}
</style>
