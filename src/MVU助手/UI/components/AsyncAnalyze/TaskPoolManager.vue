<template>
  <div class="task-pool-manager" :class="{ 'dark-mode': uiStore.darkMode }">
    <!-- 顶部操作栏 -->
    <div class="header-actions">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input v-model="searchQuery" placeholder="搜索任务名称或备注..." />
      </div>
      <div class="action-buttons">
        <button class="btn primary" @click="createNewTask">+ 新建全局任务</button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span>总任务数: <strong>{{ allTasks.length }}</strong></span>
      <span class="separator">|</span>
      <span>未被引用的闲置任务: <strong>{{ orphanedTasksCount }}</strong></span>
    </div>

    <!-- 任务列表网格 -->
    <div v-if="filteredTasks.length === 0" class="empty-state">
      没有找到匹配的任务。
    </div>

    <div v-else class="task-grid custom-scrollbar">
      <div
        v-for="taskName in filteredTasks"
        :key="taskName"
        class="task-card"
        :class="{ 'is-orphaned': taskUsage[taskName].length === 0 }"
      >
        <div class="card-header">
          <div class="title-area">
            <span class="task-name" :title="taskName">{{ taskName }}</span>
            <span class="status-badge" :class="{ active: store.taskConfigSettings[taskName].enable }">
              {{ store.taskConfigSettings[taskName].enable ? '启用' : '禁用' }}
            </span>
          </div>
          <div class="card-actions">
            <button class="btn icon-btn" title="编辑任务" @click="editTask(taskName)">✏️</button>
            <button class="btn icon-btn" title="复制任务" @click="copyTask(taskName)">📄</button>
            <button class="btn icon-btn danger-text" title="删除任务" @click="deleteTask(taskName)">🗑️</button>
          </div>
        </div>

        <div class="card-body">
          <div class="comment-text" :title="store.taskConfigSettings[taskName].comment">
            {{ store.taskConfigSettings[taskName].comment || '暂无备注' }}
          </div>

          <!-- 引用情况展示 -->
          <div class="usage-section">
            <div class="usage-title">
              引用 ({{ taskUsage[taskName].length }}):
            </div>
            <div v-if="taskUsage[taskName].length > 0" class="usage-tags">
              <span v-for="rule in taskUsage[taskName].slice(0, 3)" :key="rule" class="usage-tag" :title="rule">
                {{ rule }}
              </span>
              <span v-if="taskUsage[taskName].length > 3" class="usage-tag more">
                +{{ taskUsage[taskName].length - 3 }}
              </span>
            </div>
            <div v-else class="usage-tags">
              <span class="usage-tag orphaned">未被引用</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 复用任务编辑器弹窗 -->
    <TaskEditorModal
      v-if="showTaskModal"
      rule-name=""
      :task-name="currentEditingTask"
      @close="closeTaskModal"
      @update:task-name="handleTaskRenamed"
      @delete-task="handleModalDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAsyncAnalyzeStore } from '@/MVU助手/stores/AsyncAnalyzeStore';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { Modal } from '@/MVU助手/utils/modal';
import TaskEditorModal from '@/MVU助手/UI/components/AsyncAnalyze/TaskEditorModal.vue';

const store = useAsyncAnalyzeStore();
const uiStore = useUiStore();

const searchQuery = ref('');
const showTaskModal = ref(false);
const currentEditingTask = ref('');

// 获取所有任务名称
const allTasks = computed(() => Object.keys(store.taskConfigSettings));

// 计算每个任务被哪些规则组引用了 (反向查找)
const taskUsage = computed(() => {
  const usage: Record<string, string[]> = {};

  // 初始化空数组
  allTasks.value.forEach(taskName => {
    usage[taskName] = [];
  });

  // 遍历规则组，填充引用
  Object.entries(store.asyncAnalyzeSetting).forEach(([ruleName, rule]) => {
    if (rule.task_refs && Array.isArray(rule.task_refs)) {
      rule.task_refs.forEach(taskName => {
        if (usage[taskName]) {
          usage[taskName].push(ruleName);
        }
      });
    }
  });

  return usage;
});

// 计算闲置任务数量
const orphanedTasksCount = computed(() => {
  return allTasks.value.filter(name => taskUsage.value[name].length === 0).length;
});

// 过滤后的任务列表 (支持搜索)
const filteredTasks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return allTasks.value;

  return allTasks.value.filter(taskName => {
    const task = store.taskConfigSettings[taskName];
    const matchName = taskName.toLowerCase().includes(query);
    const matchComment = (task.comment || '').toLowerCase().includes(query);
    return matchName || matchComment;
  });
});

// --- 操作方法 ---

// 1. 新建全局任务
const createNewTask = async () => {
  const name = await Modal.prompt('新建全局任务', '请输入新任务名称 (例如: GlobalAnalyze)');
  if (!name) return;

  if (store.taskConfigSettings[name]) {
    toastr.error('该任务名称已存在');
    return;
  }

  // 初始化默认配置
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

  await store.saveModelSettings();
  toastr.success(`全局任务 "${name}" 已创建`);

  // 创建后直接打开编辑
  editTask(name);
};

// 2. 编辑任务
const editTask = (taskName: string) => {
  currentEditingTask.value = taskName;
  showTaskModal.value = true;
};

// 3. 复制任务
const copyTask = async (taskName: string) => {
  const originalTask = store.taskConfigSettings[taskName];
  if (!originalTask) return;

  const newName = await Modal.prompt('复制任务', '请输入新任务名称', `${taskName}_copy`);
  if (!newName) return;

  if (store.taskConfigSettings[newName]) {
    toastr.error('该任务名称已存在');
    return;
  }

  // 深拷贝
  store.taskConfigSettings[newName] = JSON.parse(JSON.stringify(originalTask));
  await store.saveModelSettings();
  toastr.success(`任务已复制为 "${newName}"`);
};

// 4. 删除任务
const deleteTask = async (taskName: string) => {
  const usageCount = taskUsage.value[taskName].length;
  let warningMsg = `确定要彻底删除全局任务 "${taskName}" 吗？此操作不可恢复。`;

  if (usageCount > 0) {
    warningMsg = `⚠️ 警告：该任务目前被 ${usageCount} 个规则组引用！\n删除它将导致这些规则组丢失此任务。\n\n确定要强行删除吗？`;
  }

  const confirmed = await Modal.confirm('删除确认', warningMsg);
  if (!confirmed) return;

  // 1. 从全局池删除
  delete store.taskConfigSettings[taskName];

  // 2. 清理所有规则组中的引用
  for (const ruleKey in store.asyncAnalyzeSetting) {
    const rule = store.asyncAnalyzeSetting[ruleKey];
    if (rule.task_refs) {
      rule.task_refs = rule.task_refs.filter(ref => ref !== taskName);
    }
  }

  await store.saveModelSettings();
  toastr.success('任务已彻底删除');
};

// --- 弹窗事件处理 ---

const closeTaskModal = async () => {
  showTaskModal.value = false;
  currentEditingTask.value = '';
  await store.saveModelSettings();
};

const handleTaskRenamed = (newName: string) => {
  currentEditingTask.value = newName;
};

// 弹窗内部点击了"移除关联" (在全局库中，我们将其视为关闭弹窗，因为没有当前规则组的概念)
const handleModalDelete = () => {
  closeTaskModal();
};
</script>

<style scoped lang="scss">
.task-pool-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: #ffffff;
  color: #111827;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;

  .search-bar {
    display: flex;
    align-items: center;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 12px;
    flex: 1;
    max-width: 400px;
    transition: border-color 0.2s;

    &:focus-within {
      border-color: #6366f1;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }

    .search-icon {
      margin-right: 8px;
      color: #9ca3af;
      font-size: 14px;
    }

    input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 14px;
      color: #111827;
    }
  }
}

.stats-bar {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;

  strong {
    color: #111827;
    font-weight: 600;
  }

  .separator {
    margin: 0 12px;
    color: #d1d5db;
  }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  margin-top: 20px;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); /* 减小最小宽度 */
  gap: 12px; /* 减小网格间距 */
  overflow-y: auto;
  padding-bottom: 20px;
  align-content: start;
}

.task-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px; /* 减小内边距 */
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border-color: #d1d5db;
  }

  &.is-orphaned {
    border-style: dashed;
    background: #fafafa;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center; /* 垂直居中对齐 */
  margin-bottom: 8px; /* 减小下边距 */
  gap: 8px;

  .title-area {
    display: flex;
    flex-direction: row; /* 水平排列 */
    align-items: center;
    gap: 8px;
    overflow: hidden;
  }

  .task-name {
    font-size: 15px; /* 稍微减小字号 */
    font-weight: 600;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-badge {
    flex-shrink: 0; /* 防止被挤压 */
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 10px;
    background: #e5e7eb;
    color: #4b5563;
    line-height: 1.2;

    &.active {
      background: #dcfce7;
      color: #166534;
    }
  }
}

.card-actions {
  display: flex;
  gap: 2px; /* 减小按钮间距 */
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.comment-text {
  font-size: 12px; /* 减小字号 */
  color: #6b7280;
  margin-bottom: 8px; /* 减小下边距 */
  display: -webkit-box;
  -webkit-line-clamp: 1; /* 改为单行显示，节省空间 */
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.usage-section {
  background: #f9fafb;
  border-radius: 6px;
  padding: 6px 8px; /* 减小内边距 */
  border: 1px solid #f3f4f6;
  display: flex; /* 改为 Flex 布局 */
  align-items: center; /* 垂直居中 */
  gap: 8px;

  .usage-title {
    font-size: 12px;
    color: #4b5563;
    font-weight: 500;
    white-space: nowrap; /* 防止换行 */
    flex-shrink: 0;
  }

  .usage-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px; /* 减小标签间距 */
  }

  .usage-tag {
    font-size: 11px;
    background: #e0e7ff;
    color: #3730a3;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    max-width: 80px; /* 稍微减小最大宽度 */
    overflow: hidden;
    text-overflow: ellipsis;

    &.more {
      background: #f3f4f6;
      color: #4b5563;
      cursor: help;
    }

    &.orphaned {
      background: #fee2e2;
      color: #991b1b;
      max-width: none;
    }
  }
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
    &:hover { background: #4338ca; }
  }

  &.icon-btn {
    padding: 4px;
    background: transparent;
    border-radius: 4px;
    font-size: 13px; /* 稍微减小图标大小 */
    line-height: 1;
    &:hover { background: #f3f4f6; }
    &.danger-text:hover { background: #fee2e2; }
  }
}

/* Custom Scrollbar */
.custom-scrollbar {
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
}

/* Dark Mode */
.dark-mode {
  background: #111827;
  color: #e2e8f0;

  .header-actions .search-bar {
    background: #1f2937;
    border-color: #374151;
    input { color: #e2e8f0; }
    &:focus-within {
      border-color: #818cf8;
      background: #111827;
    }
  }

  .stats-bar {
    border-bottom-color: #374151;
    color: #9ca3af;
    strong { color: #e2e8f0; }
    .separator { color: #4b5563; }
  }

  .empty-state {
    background: #1f2937;
    border-color: #374151;
    color: #9ca3af;
  }

  .task-card {
    background: #1f2937;
    border-color: #374151;
    &:hover { border-color: #4b5563; background: #2d3748; }
    &.is-orphaned { background: #1a202c; border-color: #4b5563; }
  }

  .task-name { color: #e2e8f0; }
  .status-badge { background: #374151; color: #9ca3af; }
  .status-badge.active { background: #064e3b; color: #6ee7b7; }

  .comment-text { color: #9ca3af; }

  .usage-section {
    background: #111827;
    border-color: #374151;
    .usage-title { color: #9ca3af; }
    .usage-tag {
      background: #312e81;
      color: #c7d2fe;
      &.more { background: #374151; color: #d1d5db; }
      &.orphaned { background: #7f1d1d; color: #fecaca; }
    }
  }

  .btn.icon-btn {
    &:hover { background: #374151; }
    &.danger-text:hover { background: #7f1d1d; }
  }
}
</style>
