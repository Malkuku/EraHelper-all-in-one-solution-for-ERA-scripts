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

        <!-- 快捷添加卡片 -->
        <div class="task-card add-card" @click="showLinkModal = true">
          <div class="add-icon">+</div>
          <div class="add-text">关联 / 新建任务</div>
        </div>

        <!-- 普通任务卡片 -->
        <div
          v-for="task in sortedTasks"
          :key="task.key"
          class="task-card"
          :class="{ disabled: !task.data.event_name && !task.data.enable }"
          @click="openTaskEditor(task.key)"
        >
          <div class="card-header">
            <span class="task-order">#{{ task.data.order }}</span>
            <span class="task-name" :title="task.key">{{ task.key }}</span>
            <span class="status-badge" :class="{
              'event-trigger': task.data.event_name,
              active: !task.data.event_name && task.data.enable
            }">
              {{ task.data.event_name ? '事件触发' : (task.data.enable ? '启用' : '禁用') }}
            </span>
            <!-- 移除按钮 (仅在卡片悬停时显示，或者一直显示小图标) -->
            <button class="btn-icon-remove" @click.stop="handleRemoveTask(task.key)" title="从当前规则组移除此任务 (不删除全局配置)">
              ×
            </button>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="label">触发:</span>
              <span class="value">顺序:{{ task.data.order }} / 间隔:{{ task.data.trigger_index }} / 上下文:{{ task.data.chat_history }}</span>
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
      </div>

      <div v-if="sortedTasks.length === 0" class="empty-tip">
        当前规则组暂无任务，请点击“关联已有任务”或“新建任务”
      </div>
    </div>

    <!-- 关联任务弹窗 -->
    <div v-if="showLinkModal" class="modal-overlay" @click.self="showLinkModal = false">
      <div class="modal-content">
        <h3>关联已有任务</h3>
        <div class="modal-body custom-scrollbar">
          <div v-if="availableTasks.length === 0" class="no-data">
            没有可关联的任务 (所有全局任务都已加入当前规则，或全局池为空)
          </div>
          <ul v-else class="link-list">
            <li v-for="taskName in availableTasks" :key="taskName" @click="linkTask(taskName)">
              <span class="name">{{ taskName }}</span>
              <span class="comment">{{ store.taskConfigSettings[taskName]?.comment || '无备注' }}</span>
              <button class="btn small primary">选择</button>
            </li>
          </ul>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="createTask">新建任务</button>
          <button class="btn" @click="showLinkModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 任务编辑器弹窗 -->
    <TaskEditorModal
      v-if="showTaskModal"
      :rule-name="currentRuleName"
      :task-name="currentTaskName"
      @close="showTaskModal = false"
      @update:task-name="currentTaskName = $event"
      @delete-task="handleRemoveTask"
    />
    <!-- 注意：这里的 delete-task 事件现在对应的是移除引用 -->
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncAnalyzeStore } from '@/MVU助手/stores/AsyncAnalyzeStore';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { Modal } from '@/MVU助手/utils/modal';
import TaskEditorModal from './TaskEditorModal.vue';
import Tooltip from '../Common/Tooltip.vue';

const store = useAsyncAnalyzeStore();
const uiStore = useUiStore();
const route = useRoute();
const router = useRouter();

const GLOBAL_ID = '__GLOBAL__';

// 状态
const currentRuleName = ref<string>('');
const currentTaskName = ref<string>('');
const showTaskModal = ref(false);
const showLinkModal = ref(false);

// 监听路由参数变化
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

// 获取当前规则组下的任务列表 (结合全局池数据)
const sortedTasks = computed(() => {
  if (!currentRule.value || !currentRule.value.task_refs) return [];

  return currentRule.value.task_refs
    .map(taskName => {
      const taskData = store.taskConfigSettings[taskName];
      // 如果全局池里找不到这个任务，说明数据不一致，暂时过滤掉或显示错误
      if (!taskData) return null;
      return {
        key: taskName,
        data: taskData,
      };
    })
    .filter((t): t is { key: string; data: any } => t !== null)
    .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
});

// 获取所有未被当前规则组引用的全局任务
const availableTasks = computed(() => {
  if (!currentRule.value) return [];
  const allTaskNames = Object.keys(store.taskConfigSettings);
  const currentRefs = new Set(currentRule.value.task_refs || []);

  return allTaskNames.filter(name => !currentRefs.has(name));
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

// 1. 新建任务 (同时创建全局配置并关联)
const createTask = async () => {
  if (!currentRule.value) return;

  // 关闭关联弹窗，避免层级问题
  showLinkModal.value = false;

  const name = await Modal.prompt('新建任务', '请输入新任务名称 (例如: AnalyzePersonality)');
  if (!name) return;

  // 检查全局池是否已存在
  if (store.taskConfigSettings[name]) {
    // 如果存在，询问是否直接关联
    const confirmLink = await Modal.confirm('任务已存在', `全局任务池中已存在名为 "${name}" 的任务，是否直接将其关联到当前规则组？`);
    if (confirmLink) {
      linkTask(name);
    }
    return;
  }

  // 初始化新任务到全局池
  store.taskConfigSettings[name] = {
    comment: '',
    enable: true,
    event_name: '',
    order: 0,
    chat_history: 2,
    trigger_index: 1,
    trigger_history: 0,
    reroll_count: 0,
    prompt: '',
    whiteListModel: false,
    api_config: '',
    world_book: {},
    merge_setting: {},
  };

  // 关联到当前规则组
  if (!currentRule.value.task_refs) currentRule.value.task_refs = [];
  currentRule.value.task_refs.push(name);

  toastr.success(`任务 "${name}" 已创建并关联`);

  // 创建后直接打开编辑器
  openTaskEditor(name);
};

// 2. 关联已有任务
const linkTask = (taskName: string) => {
  if (!currentRule.value) return;
  if (!currentRule.value.task_refs) currentRule.value.task_refs = [];

  if (currentRule.value.task_refs.includes(taskName)) {
    toastr.warning('该任务已关联');
    return;
  }

  currentRule.value.task_refs.push(taskName);
  toastr.success(`已关联任务: ${taskName}`);
  showLinkModal.value = false;
};

// 3. 移除任务 (解绑)
const handleRemoveTask = async (taskName?: string) => {
  const targetName = taskName || currentTaskName.value;
  if (!currentRule.value || !currentRule.value.task_refs || !targetName) return;

  const confirmed = await Modal.confirm(
    '移除确认',
    `确定要从当前规则组中移除任务 "${targetName}" 吗？\n(注意：这只会解除引用，任务配置仍保留在全局池中)`
  );

  if (!confirmed) return;

  // 过滤掉该引用
  currentRule.value.task_refs = currentRule.value.task_refs.filter(ref => ref !== targetName);

  // 如果是从弹窗触发的，关闭弹窗
  if (showTaskModal.value && currentTaskName.value === targetName) {
    showTaskModal.value = false;
    currentTaskName.value = '';
  }

  toastr.success('任务已移除');
};

const openTaskEditor = (taskKey: string) => {
  currentTaskName.value = taskKey;
  showTaskModal.value = true;
};

</script>

<style scoped lang="scss">
.rule-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  color: #000000;
  position: relative; /* For modal positioning */
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
  background: #f3f4f6;
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
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border-color: #d1d5db;

    .btn-icon-remove {
      opacity: 1;
    }
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

/* Remove Button on Card */
.btn-icon-remove {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #fee2e2;
  color: #991b1b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s, background 0.2s;
  font-size: 16px;
  line-height: 1;
  z-index: 2;

  &:hover {
    background: #ef4444;
    color: white;
  }
}

/* Global Card Special Style */
.global-card {
  background: linear-gradient(to bottom right, #fff7ed, #ffffff);
  border-color: #fed7aa;
  grid-column: 1 / -1;

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
  padding-right: 20px; /* Space for remove button */
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

  &.event-trigger {
    background: #e0e7ff;
    color: #3730a3;
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

  &.secondary {
    background: #fff;
    border: 1px solid #d1d5db;
    color: #374151;
    &:hover {
      background: #f3f4f6;
    }
  }

  &.small {
    padding: 4px 10px;
    font-size: 12px;
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

/* --- Modal Overlay Styles --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow: hidden;

  h3 {
    padding: 16px 20px;
    margin: 0;
    border-bottom: 1px solid #e5e7eb;
    font-size: 18px;
    color: #111827;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f9fafb;
    }

    .name {
      font-weight: 600;
      color: #374151;
    }
    .comment {
      font-size: 12px;
      color: #9ca3af;
      margin-left: 10px;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.no-data {
  text-align: center;
  color: #9ca3af;
  padding: 20px;
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
    background: #111827;
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
  .status-badge.event-trigger { background: #312e81; color: #c7d2fe; }

  .card-body { color: #9ca3af; }
  .info-row .label { color: #6b7280 !important; }
  .info-row .value { color: #d1d5db; }

  /* Dark Mode for Modal */
  .modal-content {
    background: #1f2937;
    color: #e2e8f0;

    h3 {
      border-bottom-color: #374151;
      color: #e2e8f0;
    }

    .modal-footer {
      border-top-color: #374151;
    }
  }

  .link-list li {
    border-bottom-color: #374151;
    &:hover {
      background: #374151;
    }
    .name { color: #e2e8f0; }
  }

  .btn.secondary {
    background: #374151;
    border-color: #4b5563;
    color: #e2e8f0;
    &:hover {
      background: #4b5563;
    }
  }
}
@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-start; /* 顶部对齐，防止键盘顶起时居中计算错误 */
  }

  .modal-content {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  .editor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-controls {
    width: 100%;
    button {
      width: 100%;
      margin-left: 0 !important;
    }
  }

  .task-grid {
    grid-template-columns: 1fr;
  }
}
</style>
