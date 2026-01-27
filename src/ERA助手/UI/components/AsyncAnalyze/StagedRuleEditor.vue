<template>
  <div class="rule-editor-container">
    <!-- 顶部：当前规则组信息 -->
    <div class="editor-header">
      <div class="breadcrumb">
        <button class="btn text-btn" @click="goBack">← 返回选择</button>
        <span class="separator">/</span>
        <span class="current-rule">{{ currentRuleName || '未选择规则' }}</span>
      </div>
      <div class="header-controls">
        <button class="btn primary" @click="saveAll">保存所有更改</button>
      </div>
    </div>

    <div v-if="!currentRuleName" class="error-state">
      请先在“规则选择”页面选择一个规则组进行编辑。
    </div>

    <div v-else class="editor-body">
      <!-- 左侧：任务列表 -->
      <div class="sidebar">
        <div class="sidebar-title">
          <span>任务列表</span>
          <button class="btn small icon-btn" @click="createTask" title="新建任务">+</button>
        </div>

        <div class="task-list">
          <div v-if="sortedTasks.length === 0" class="empty-tip">
            暂无任务，请新建
          </div>

          <div
            v-for="task in sortedTasks"
            :key="task.key"
            class="task-item"
            :class="{ active: currentTaskName === task.key, disabled: !task.data.enable }"
            @click="currentTaskName = task.key"
          >
            <div class="task-row">
              <span class="task-order">#{{ task.data.order }}</span>
              <span class="task-name">{{ task.key }}</span>
            </div>
            <div class="task-status">
              {{ task.data.enable ? '启用' : '禁用' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：任务详情编辑器 -->
      <div class="main-content">
        <!-- 修改处：判断 currentTask 是否存在，而非 currentTaskName -->
        <div v-if="!currentTask" class="no-selection">
          请选择或新建一个任务
        </div>

        <div v-else class="task-editor">
          <!-- 任务标题栏 -->
          <div class="task-header">
            <div class="task-title-edit">
              <span class="label">任务名称:</span>
              <input
                :value="currentTaskName"
                @change="renameTask($event)"
                class="name-input"
              />
            </div>
            <div class="task-actions">
              <label class="toggle-switch">
                <!-- 修改处：v-model 不支持 ?. 写法，且外层已判断非空 -->
                <input type="checkbox" v-model="currentTask.enable">
                <span class="slider"></span>
                <span class="text">{{ currentTask.enable ? '已启用' : '已禁用' }}</span>
              </label>
              <button class="btn danger small" @click="deleteTask">删除任务</button>
            </div>
          </div>

          <!-- 内部标签页导航 -->
          <div class="inner-tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'basic' }"
              @click="activeTab = 'basic'"
            >
              基础与提示词
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'worldbook' }"
              @click="activeTab = 'worldbook'"
            >
              世界书提取 ({{ Object.keys(currentTask.world_book || {}).length }})
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'merge' }"
              @click="activeTab = 'merge'"
            >
              结果处理 ({{ Object.keys(currentTask.merge_setting || {}).length }})
            </button>
          </div>

          <!-- 标签页内容 -->
          <div class="tab-content">

            <!-- 1. 基础设置与提示词 -->
            <div v-show="activeTab === 'basic'" class="tab-pane">
              <div class="form-grid">
                <div class="form-group">
                  <label>执行顺序 (Order)</label>
                  <input type="number" v-model.number="currentTask.order" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>API 配置</label>
                  <!-- 修改处：移除 ?. -->
                  <select v-model="currentTask.api_config">
                    <option value="">-- 请选择 API --</option>
                    <option v-for="(cfg, name) in store.apiConfigSettings" :key="name" :value="name">
                      {{ name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>触发间隔 (Trigger Index)</label>
                  <input type="number" v-model.number="currentTask.trigger_index" min="1" />
                </div>
                <div class="form-group">
                  <label>上下文楼层 (Chat History)</label>
                  <!-- 这里的类型定义是 boolean 但注释是数字，这里按数字处理，如果报错请改为 checkbox -->
                  <input type="number" v-model.number="currentTask.chat_history" min="0" />
                </div>
                <div class="form-group">
                  <label>重试次数 (Reroll)</label>
                  <input type="number" v-model.number="currentTask.reroll_count" min="0" />
                </div>
              </div>

              <div class="form-group full-height">
                <label>提示词 (Prompt)</label>
                <textarea
                  v-model="currentTask.prompt"
                  class="prompt-area"
                  placeholder="请输入发送给 AI 的提示词..."
                ></textarea>
              </div>
            </div>

            <!-- 2. 世界书提取配置 -->
            <div v-show="activeTab === 'worldbook'" class="tab-pane">
              <div class="list-editor">
                <div class="list-sidebar">
                  <button class="btn small primary full" @click="addWorldBookItem">+ 添加提取规则</button>
                  <div class="scroll-list">
                    <div
                      v-for="(wb, key) in currentTask.world_book"
                      :key="key"
                      class="sub-item"
                      :class="{ active: currentWbKey === key }"
                      @click="currentWbKey = key"
                    >
                      {{ key }}
                    </div>
                  </div>
                </div>
                <div class="list-content">
                  <!-- 这里使用 ?. 是安全的，因为是读取属性 -->
                  <div v-if="currentWbKey && currentTask.world_book?.[currentWbKey]" class="sub-form">
                    <div class="sub-header">
                      <strong>{{ currentWbKey }}</strong>
                      <button class="btn danger small" @click="deleteWorldBookItem(currentWbKey)">删除</button>
                    </div>
                    <div class="form-group">
                      <label>正则匹配 (Lore Regex)</label>
                      <input v-model="currentTask.world_book[currentWbKey].lore_regex" placeholder="正则表达式..." />
                    </div>
                    <div class="form-group">
                      <label>收集的条目 (Lores)</label>
                      <div class="tip">每行一个条目，系统会自动匹配加入</div>
                      <textarea
                        :value="currentTask.world_book[currentWbKey].lores.join('\n')"
                        @input="updateLores(currentWbKey, $event)"
                        rows="6"
                      ></textarea>
                    </div>
                  </div>
                  <div v-else class="empty-sub">请选择左侧规则或添加新规则</div>
                </div>
              </div>
            </div>

            <!-- 3. 结果处理 (Merge Setting) -->
            <div v-show="activeTab === 'merge'" class="tab-pane">
              <div class="list-editor">
                <div class="list-sidebar">
                  <button class="btn small primary full" @click="addMergeItem">+ 添加处理规则</button>
                  <div class="scroll-list">
                    <div
                      v-for="(item, key) in currentTask.merge_setting"
                      :key="key"
                      class="sub-item"
                      :class="{ active: currentMergeKey === key }"
                      @click="currentMergeKey = key"
                    >
                      {{ key }}
                    </div>
                  </div>
                </div>
                <div class="list-content">
                  <div v-if="currentMergeKey && currentTask.merge_setting?.[currentMergeKey]" class="sub-form">
                    <div class="sub-header">
                      <strong>{{ currentMergeKey }}</strong>
                      <button class="btn danger small" @click="deleteMergeItem(currentMergeKey)">删除</button>
                    </div>

                    <div class="form-group checkbox-row">
                      <label>
                        <input type="checkbox" v-model="currentTask.merge_setting[currentMergeKey].is_inject" />
                        写入正文 (Is Inject)
                      </label>
                    </div>

                    <div class="form-grid two-col">
                      <div class="form-group">
                        <label>目标世界书 (Target WB)</label>
                        <input v-model="currentTask.merge_setting[currentMergeKey].world_book" />
                      </div>
                      <div class="form-group">
                        <label>目标条目 (Target Lore)</label>
                        <input v-model="currentTask.merge_setting[currentMergeKey].target_lore" />
                      </div>
                    </div>

                    <div class="form-group">
                      <label>替换正则 (Replace Regex)</label>
                      <input v-model="currentTask.merge_setting[currentMergeKey].replace_regex" />
                    </div>

                    <div class="form-group">
                      <label>内容捕获正则 (Content Regex)</label>
                      <div class="tip">每行一个正则表达式，用于从AI回复中提取内容</div>
                      <textarea
                        :value="currentTask.merge_setting[currentMergeKey].content_regex.join('\n')"
                        rows="5"
                        @input="updateContentRegex(currentMergeKey, $event)"
                      ></textarea>
                    </div>
                  </div>
                  <div v-else class="empty-sub">请选择左侧规则或添加新规则</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncAnalyzeStore } from '@/ERA助手/stores/AsyncAnalyzeStore';

const store = useAsyncAnalyzeStore();
const route = useRoute();
const router = useRouter();

// 状态
const currentRuleName = ref<string>('');
const currentTaskName = ref<string>('');
const activeTab = ref<'basic' | 'worldbook' | 'merge'>('basic');

// 子列表选中状态
const currentWbKey = ref<string>('');
const currentMergeKey = ref<string>('');

// 初始化：确定当前编辑的是哪个规则组
onMounted(() => {
  const queryRule = route.query.rule as string;
  // 修改后：直接赋值，移除 store.asyncAnalyzeSetting[queryRule] 的即时检查
  if (queryRule) {
    currentRuleName.value = queryRule;
  } else if (store.activeRuleName && store.asyncAnalyzeSetting[store.activeRuleName]) {
    currentRuleName.value = store.activeRuleName;
  }
});

// 计算属性：当前规则对象
const currentRule = computed(() => {
  if (!currentRuleName.value) return null;
  return store.asyncAnalyzeSetting[currentRuleName.value];
});

// 计算属性：排序后的任务列表
const sortedTasks = computed(() => {
  if (!currentRule.value) return [];
  return Object.entries(currentRule.value).map(([key, data]) => ({
    key,
    data
  })).sort((a, b) => a.data.order - b.data.order);
});

// 计算属性：当前任务对象
const currentTask = computed(() => {
  if (!currentRule.value || !currentTaskName.value) return null;
  return currentRule.value[currentTaskName.value];
});

// 导航
const goBack = () => {
  router.push({ name: 'RuleSelection' });
};

// 保存
const saveAll = async () => {
  await store.saveModelSettings();
  toastr.success('规则已保存');
};

// --- 任务管理 ---

const createTask = () => {
  if (!currentRule.value) return;
  const name = prompt('请输入新任务名称 (例如: AnalyzePersonality)');
  if (!name) return;
  if (currentRule.value[name]) {
    toastr.error('任务名称已存在');
    return;
  }

  // 初始化任务结构
  currentRule.value[name] = {
    enable: true,
    order: 0,
    chat_history: 2,
    trigger_index: 1,
    trigger_history: 0,
    reroll_count: 0,
    prompt: '',
    api_config: '',
    world_book: {},
    merge_setting: {}
  };

  currentTaskName.value = name;
};

const renameTask = (event: Event) => {
  if (!currentRule.value || !currentTaskName.value) return;
  const newName = (event.target as HTMLInputElement).value.trim();
  if (!newName || newName === currentTaskName.value) return;

  if (currentRule.value[newName]) {
    toastr.error('该名称已存在');
    (event.target as HTMLInputElement).value = currentTaskName.value; // 恢复
    return;
  }

  // 复制并删除旧的
  const taskData = currentRule.value[currentTaskName.value];
  currentRule.value[newName] = taskData;
  delete currentRule.value[currentTaskName.value];
  currentTaskName.value = newName;
};

const deleteTask = () => {
  if (!currentRule.value || !currentTaskName.value) return;
  if (!confirm(`确定要删除任务 "${currentTaskName.value}" 吗？`)) return;

  delete currentRule.value[currentTaskName.value];
  currentTaskName.value = '';
};

// --- World Book 管理 ---

const addWorldBookItem = () => {
  if (!currentTask.value) return;
  const name = prompt('请输入提取规则名称');
  if (!name) return;

  if (!currentTask.value.world_book) currentTask.value.world_book = {};

  currentTask.value.world_book[name] = {
    lores: [],
    lore_regex: ''
  };
  currentWbKey.value = name;
};

const deleteWorldBookItem = (key: string) => {
  if (!currentTask.value?.world_book) return;
  delete currentTask.value.world_book[key];
  if (currentWbKey.value === key) currentWbKey.value = '';
};

const updateLores = (key: string, event: Event) => {
  const text = (event.target as HTMLTextAreaElement).value;
  if (currentTask.value?.world_book[key]) {
    currentTask.value.world_book[key].lores = text.split('\n');
  }
};

// --- Merge Setting 管理 ---

const addMergeItem = () => {
  if (!currentTask.value) return;
  const name = prompt('请输入处理规则名称');
  if (!name) return;

  if (!currentTask.value.merge_setting) currentTask.value.merge_setting = {};

  currentTask.value.merge_setting[name] = {
    is_inject: false,
    world_book: '',
    target_lore: '',
    content_regex: [],
    replace_regex: ''
  };
  currentMergeKey.value = name;
};

const deleteMergeItem = (key: string) => {
  if (!currentTask.value?.merge_setting) return;
  delete currentTask.value.merge_setting[key];
  if (currentMergeKey.value === key) currentMergeKey.value = '';
};

const updateContentRegex = (key: string, event: Event) => {
  const text = (event.target as HTMLTextAreaElement).value;
  if (currentTask.value?.merge_setting[key]) {
    currentTask.value.merge_setting[key].content_regex = text.split('\n');
  }
};

</script>

<style scoped lang="scss">
.rule-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

/* Header */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 10px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 14px;

  .text-btn {
    background: none;
    border: none;
    color: #6366f1;
    cursor: pointer;
    padding: 0;
    font-weight: 500;
    &:hover { text-decoration: underline; }
  }

  .separator { margin: 0 8px; color: #9ca3af; }
  .current-rule { font-weight: 600; color: #1f2937; }
}

.error-state {
  padding: 40px;
  text-align: center;
  color: #ef4444;
}

/* Body Layout */
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 16px;
}

/* Sidebar (Task List) */
.sidebar {
  width: 200px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  padding-right: 10px;
}

.sidebar-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 600;
  color: #4b5563;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  padding: 8px 10px;
  border-radius: 6px;
  background: #f9fafb;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;

  &:hover { background: #f3f4f6; }

  &.active {
    background: #e0e7ff;
    border-color: #6366f1;
    .task-name { color: #4338ca; font-weight: 600; }
  }

  &.disabled {
    opacity: 0.6;
    .task-name { text-decoration: line-through; }
  }
}

.task-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-order {
  font-size: 11px;
  background: #d1d5db;
  color: #4b5563;
  padding: 1px 4px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
}

.task-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-status {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
  text-align: right;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
}

.task-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f3f4f6;
}

.task-title-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  .label { font-size: 14px; color: #6b7280; }
  .name-input {
    font-size: 16px;
    font-weight: 600;
    border: 1px solid transparent;
    padding: 4px 8px;
    border-radius: 4px;
    &:hover, &:focus { border-color: #d1d5db; background: #fff; }
    background: transparent;
  }
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Toggle Switch */
.toggle-switch {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 6px;

  input { display: none; }

  .slider {
    width: 36px;
    height: 20px;
    background: #d1d5db;
    border-radius: 10px;
    position: relative;
    transition: 0.3s;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: 0.3s;
    }
  }

  input:checked + .slider { background: #6366f1; }
  input:checked + .slider::after { left: 18px; }

  .text { font-size: 12px; color: #4b5563; }
}

/* Inner Tabs */
.inner-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #6b7280;
  font-size: 13px;

  &:hover { color: #1f2937; }

  &.active {
    color: #6366f1;
    border-bottom-color: #6366f1;
    font-weight: 500;
  }
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
}

.tab-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Forms */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  &.two-col { grid-template-columns: 1fr 1fr; }
}

.form-group {
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 12px;
    color: #4b5563;
    margin-bottom: 4px;
  }

  input, select, textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    background: #fff;
    &:focus { border-color: #6366f1; outline: none; }
  }

  &.full-height {
    flex: 1;
    display: flex;
    flex-direction: column;
    textarea { flex: 1; resize: none; }
  }

  .tip { font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
}

.checkbox-row {
  display: flex;
  align-items: center;
  label { display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0; }
  input { width: auto; }
}

/* Sub-List Editor (WorldBook / Merge) */
.list-editor {
  display: flex;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.list-sidebar {
  width: 160px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #f9fafb;

  .scroll-list {
    flex: 1;
    overflow-y: auto;
  }

  .sub-item {
    padding: 8px;
    font-size: 12px;
    cursor: pointer;
    border-bottom: 1px solid #f3f4f6;
    &:hover { background: #e5e7eb; }
    &.active { background: #fff; color: #6366f1; font-weight: 600; border-left: 3px solid #6366f1; }
  }
}

.list-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  background: #fff;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.empty-sub {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 13px;
}

/* Buttons */
.btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 13px;

  &.primary { background: #6366f1; color: white; &:hover { background: #4f46e5; } }
  &.danger { background: #fee2e2; color: #991b1b; &:hover { background: #fecaca; } }
  &.small { padding: 4px 8px; font-size: 12px; }
  &.icon-btn { font-size: 16px; line-height: 1; padding: 0 8px; }
  &.full { width: 100%; border-radius: 0; }
}

/* Dark Mode */
:global(.dark-mode) {
  .rule-editor-container, .editor-body, .main-content, .list-content, .tab-pane {
    background: #1f2937;
    color: #e2e8f0;
  }

  .editor-header { border-bottom-color: #4b5563; }
  .breadcrumb .current-rule { color: #e2e8f0; }

  .sidebar { border-right-color: #4b5563; }
  .sidebar-title { color: #cbd5e1; }

  .task-item {
    background: #374151;
    &:hover { background: #4b5563; }
    &.active { background: #312e81; border-color: #818cf8; .task-name { color: #e0e7ff; } }
  }
  .task-order { background: #4b5563; color: #cbd5e1; }
  .task-name { color: #e2e8f0; }

  .no-selection { border-color: #4b5563; color: #9ca3af; }

  .task-header { border-bottom-color: #374151; }
  .task-title-edit .name-input { color: #e2e8f0; &:hover { background: #374151; } }

  .inner-tabs { border-bottom-color: #4b5563; }
  .tab-btn {
    color: #9ca3af;
    &:hover { color: #e2e8f0; }
    &.active { color: #818cf8; border-bottom-color: #818cf8; }
  }

  .form-group {
    label { color: #cbd5e1; }
    input, select, textarea {
      background: #374151;
      border-color: #4b5563;
      color: #e2e8f0;
      &:focus { border-color: #818cf8; }
    }
  }

  .list-editor { border-color: #4b5563; }
  .list-sidebar {
    background: #111827;
    border-right-color: #4b5563;
    .sub-item {
      border-bottom-color: #374151;
      color: #9ca3af;
      &:hover { background: #374151; }
      &.active { background: #1f2937; color: #818cf8; }
    }
  }
  .sub-header { border-bottom-color: #374151; }
}
</style>
