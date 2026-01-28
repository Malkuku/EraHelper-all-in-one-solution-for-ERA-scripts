<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-container" :class="{ 'dark-mode': uiStore.darkMode }">
      <div class="task-editor">
        <!-- 标题栏 -->
        <div class="task-header">
          <div class="task-title-edit">
            <span class="label">{{ isGlobalSettings ? '规则组名称:' : '任务名称:' }}</span>
            <span v-if="isGlobalSettings" class="name-static">{{ ruleName }}</span>
            <input v-else :value="taskName" @change="renameTask($event)" class="name-input" />
          </div>
          <div class="task-actions">
            <template v-if="!isGlobalSettings">
              <label class="toggle-switch">
                <input type="checkbox" v-model="editingData.enable" />
                <span class="slider"></span>
                <span class="text">{{ editingData.enable ? '已启用' : '已禁用' }}</span>
              </label>
              <button class="btn danger small" @click="handleDeleteTask">删除任务</button>
            </template>
            <button class="btn icon-btn close-btn" @click="closeModal">×</button>
          </div>
        </div>

        <!-- 内部标签页导航 -->
        <div class="inner-tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'basic' }" @click="activeTab = 'basic'">
            {{ isGlobalSettings ? '规则说明' : '基础与提示词' }}
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'worldbook' }" @click="activeTab = 'worldbook'">
            {{ isGlobalSettings ? '正文世界书配置' : '任务世界书提取' }} ({{ Object.keys(editingData.world_book || {}).length }})
          </button>
          <button v-if="!isGlobalSettings" class="tab-btn" :class="{ active: activeTab === 'merge' }" @click="activeTab = 'merge'">
            结果处理 ({{ Object.keys(editingData.merge_setting || {}).length }})
          </button>
        </div>

        <!-- 标签页内容 -->
        <div class="tab-content custom-scrollbar">
          <!-- 1. 基础设置 -->
          <div v-show="activeTab === 'basic'" class="tab-pane">
            <div class="form-grid" :class="{ 'one-col': isGlobalSettings }">
              <div class="form-group full-width">
                <label>{{ isGlobalSettings ? '规则组注释' : '任务备注' }}</label>
                <input v-model="editingData.comment" placeholder="在此输入用途或说明..." />
              </div>

              <!-- 仅任务模式显示 -->
              <template v-if="!isGlobalSettings">
                <div class="form-group">
                  <label>执行顺序</label>
                  <input type="number" v-model.number="editingData.order" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>API 配置</label>
                  <SearchableSelect
                    v-model="editingData.api_config"
                    :options="Object.keys(store.apiConfigSettings)"
                    placeholder="-- 请选择 API --"
                  />
                </div>
                <div class="form-group">
                  <label>触发间隔</label>
                  <input type="number" v-model.number="editingData.trigger_index" min="1" />
                </div>
                <div class="form-group">
                  <label>上下文楼层</label>
                  <input type="number" v-model.number="editingData.chat_history" min="0" />
                </div>
                <div class="form-group">
                  <label>重试次数</label>
                  <input type="number" v-model.number="editingData.reroll_count" min="0" />
                </div>
              </template>
            </div>

            <div v-if="!isGlobalSettings" class="form-group full-height">
              <label>提示词</label>
              <textarea
                v-model="editingData.prompt"
                class="prompt-area"
                placeholder="请输入发送给 AI 的提示词..."
              ></textarea>
            </div>
          </div>

          <!-- 2. 世界书配置 (通用) -->
          <div v-show="activeTab === 'worldbook'" class="tab-pane">
            <div class="list-editor">
              <div class="list-sidebar">
                <!-- 添加模式 -->
                <div v-if="isAddingWb" class="add-panel">
                  <SearchableSelect
                    v-model="newWbName"
                    :options="availableNewBooks"
                    placeholder="选择世界书..."
                    class="mb-2"
                  />
                  <div class="add-actions">
                    <button class="btn small primary" @click="confirmAddWb" :disabled="!newWbName">确定</button>
                    <button class="btn small" @click="cancelAddWb">取消</button>
                  </div>
                </div>
                <!-- 默认按钮 -->
                <button v-else class="btn small primary full" @click="startAddWb">+ 添加配置</button>

                <div class="scroll-list custom-scrollbar">
                  <div
                    v-for="(wb, key) in editingData.world_book"
                    :key="key"
                    class="sub-item"
                    :class="{ active: currentWbKey === String(key) }"
                    @click="selectWbKey(String(key))"
                  >
                    {{ key }}
                  </div>
                </div>
              </div>
              <div class="list-content custom-scrollbar">
                <div v-if="currentWbKey && editingData.world_book?.[currentWbKey]" class="sub-form">
                  <div class="sub-header">
                    <strong>{{ currentWbKey }}</strong>
                    <button class="btn danger small" @click="deleteWorldBookItem(currentWbKey)">删除</button>
                  </div>
                  <div class="form-group">
                    <label>正则匹配 (Lore Regex)</label>
                    <input v-model="editingData.world_book[currentWbKey].lore_regex" placeholder="正则表达式..." />
                  </div>

                  <!-- 自定义多选下拉框 -->
                  <div class="form-group">
                    <label>收集的条目 (Lores)</label>
                    <div class="tip">从下拉框选择条目，或手动输入</div>

                    <SearchableSelect
                      v-model="editingData.world_book[currentWbKey].lores"
                      :options="currentBookLores"
                      :multiple="true"
                      :loading="loadingLores"
                      placeholder="点击选择条目..."
                    />
                  </div>
                </div>
                <div v-else class="empty-sub">请选择左侧规则或添加新规则</div>
              </div>
            </div>
          </div>

          <!-- 3. 结果处理 (仅任务) -->
          <div v-if="!isGlobalSettings" v-show="activeTab === 'merge'" class="tab-pane">
            <div class="list-editor">
              <div class="list-sidebar">
                <button class="btn small primary full" @click="addMergeItem">+ 添加处理规则</button>
                <div class="scroll-list custom-scrollbar">
                  <div
                    v-for="(item, key) in editingData.merge_setting"
                    :key="key"
                    class="sub-item"
                    :class="{ active: currentMergeKey === String(key) }"
                    @click="currentMergeKey = String(key)"
                  >
                    {{ key }}
                  </div>
                </div>
              </div>
              <div class="list-content custom-scrollbar">
                <div v-if="currentMergeKey && editingData.merge_setting?.[currentMergeKey]" class="sub-form">
                  <div class="sub-header">
                    <strong>{{ currentMergeKey }}</strong>
                    <button class="btn danger small" @click="deleteMergeItem(currentMergeKey)">删除</button>
                  </div>

                  <div class="form-group checkbox-row">
                    <label>
                      <input v-model="editingData.merge_setting[currentMergeKey].is_inject" type="checkbox" />
                      写入正文 (Is Inject)
                    </label>
                  </div>

                  <div class="form-grid two-col">
                    <div class="form-group">
                      <label>目标世界书 (Target WB)</label>
                      <SearchableSelect
                        v-model="editingData.merge_setting[currentMergeKey].world_book"
                        :options="allWorldBooks"
                        placeholder="-- 选择世界书 --"
                        @change="onMergeWbChange(currentMergeKey)"
                      />
                    </div>

                    <div class="form-group">
                      <label>目标条目 (Target Lore)</label>
                      <SearchableSelect
                        v-model="editingData.merge_setting[currentMergeKey].target_lore"
                        :options="getCachedLores(editingData.merge_setting[currentMergeKey].world_book)"
                        placeholder="-- 选择条目 --"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>替换正则 (Replace Regex)</label>
                    <input v-model="editingData.merge_setting[currentMergeKey].replace_regex" />
                  </div>

                  <div class="form-group">
                    <label>内容捕获正则 (Content Regex)</label>
                    <div class="tip">每行一个正则表达式，用于从AI回复中提取内容</div>
                    <textarea
                      :value="editingData.merge_setting[currentMergeKey].content_regex.join('\n')"
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
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useAsyncAnalyzeStore } from '@/ERA助手/stores/AsyncAnalyzeStore';
import { useUiStore } from '@/ERA助手/stores/UIStore';
import { Modal } from '@/ERA助手/utils/modal';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import SearchableSelect from '@/ERA助手/UI/components/Dialog/SearchableSelect.vue';
import type { StagedSetting } from '@/ERA助手/AsyncAnalyze/types/AsyncAnalyzeSetting';

const props = defineProps<{
  ruleName: string;
  taskName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:taskName', newName: string): void;
  (e: 'delete-task'): void;
}>();

const store = useAsyncAnalyzeStore();
const uiStore = useUiStore();

const GLOBAL_ID = '__GLOBAL__';
const activeTab = ref<'basic' | 'worldbook' | 'merge'>('basic');

// 子列表选中状态
const currentWbKey = ref<string>('');
const currentMergeKey = ref<string>('');

// --- API 数据相关状态 ---
const allWorldBooks = ref<string[]>([]);
const loreCache = reactive<Record<string, string[]>>({});
const loadingLores = ref(false);

// --- 新增：添加世界书的状态 ---
const isAddingWb = ref(false);
const newWbName = ref('');

// 计算属性
const isGlobalSettings = computed(() => props.taskName === GLOBAL_ID);

const currentRule = computed(() => {
  if (!props.ruleName) return null;
  return store.asyncAnalyzeSetting[props.ruleName];
});

const editingData = computed((): any => {
  if (!currentRule.value) return null;
  if (isGlobalSettings.value) {
    return currentRule.value;
  }
  return currentRule.value.staged_setting?.[props.taskName];
});

// 初始化
onMounted(async () => {
  await fetchWorldBooks();
});

// 监听任务切换，重置Tab
watch(() => props.taskName, () => {
  activeTab.value = 'basic';
  currentWbKey.value = '';
  currentMergeKey.value = '';
});

const closeModal = () => {
  emit('close');
};

// --- 逻辑方法 (从原文件迁移) ---

const fetchWorldBooks = async () => {
  try {
    if (typeof window.getWorldbookNames === 'function') {
      allWorldBooks.value = window.getWorldbookNames();
    }
  } catch (e) {
    console.error('获取世界书列表失败', e);
  }
};

const fetchLoresForBook = async (bookName: string) => {
  if (!bookName) return;
  if (loreCache[bookName]) return;

  loadingLores.value = true;
  try {
    const lores = await WorldInfoUtil.getWorldBookLoresByName(bookName);
    loreCache[bookName] = lores || [];
  } catch (e) {
    console.error(`获取世界书 [${bookName}] 条目失败`, e);
    loreCache[bookName] = [];
  } finally {
    loadingLores.value = false;
  }
};

const currentBookLores = computed(() => {
  if (!currentWbKey.value) return [];
  return loreCache[currentWbKey.value] || [];
});

const getCachedLores = (bookName: string) => {
  if (!bookName) return [];
  if (!loreCache[bookName]) {
    fetchLoresForBook(bookName);
    return [];
  }
  return loreCache[bookName];
};

const availableNewBooks = computed(() => {
  if (!editingData.value?.world_book) return allWorldBooks.value;
  const existingKeys = Object.keys(editingData.value.world_book);
  return allWorldBooks.value.filter(wb => !existingKeys.includes(wb));
});

// --- 任务操作 ---

const renameTask = (event: Event) => {
  if (!currentRule.value || !props.taskName || isGlobalSettings.value) return;
  const newName = (event.target as HTMLInputElement).value.trim();
  if (!newName || newName === props.taskName) return;

  const tasks = currentRule.value.staged_setting;
  if (tasks[newName]) {
    toastr.error('该名称已存在');
    (event.target as HTMLInputElement).value = props.taskName;
    return;
  }
  // 重命名逻辑：复制数据到新Key，删除旧Key
  tasks[newName] = tasks[props.taskName];
  delete tasks[props.taskName];

  // 通知父组件更新选中的任务名
  emit('update:taskName', newName);
};

const handleDeleteTask = async () => {
  if (!currentRule.value || !props.taskName || isGlobalSettings.value) return;
  const confirmed = await Modal.confirm('删除任务', `确定要删除任务 "${props.taskName}" 吗？`);
  if (!confirmed) return;

  delete currentRule.value.staged_setting[props.taskName];
  emit('delete-task'); // 通知父组件关闭弹窗并刷新列表
};

// --- World Book 管理 ---

const startAddWb = () => {
  isAddingWb.value = true;
  newWbName.value = '';
};

const cancelAddWb = () => {
  isAddingWb.value = false;
  newWbName.value = '';
};

const confirmAddWb = () => {
  if (!editingData.value || !newWbName.value) return;
  if (!editingData.value.world_book) editingData.value.world_book = {};

  editingData.value.world_book[newWbName.value] = {
    lores: [],
    lore_regex: '',
  };

  selectWbKey(newWbName.value);
  isAddingWb.value = false;
  newWbName.value = '';
};

const selectWbKey = (key: string) => {
  currentWbKey.value = key;
  fetchLoresForBook(key);
};

const deleteWorldBookItem = (key: string) => {
  if (!editingData.value?.world_book) return;
  delete editingData.value.world_book[key];
  if (currentWbKey.value === key) currentWbKey.value = '';
};
// --- Merge Setting 管理 ---

const addMergeItem = async () => {
  if (!editingData.value || isGlobalSettings.value) return;
  const name = await Modal.prompt('添加处理规则', '请输入处理规则名称');
  if (!name) return;

  const taskData = editingData.value as StagedSetting[string];
  if (!taskData.merge_setting) taskData.merge_setting = {};

  taskData.merge_setting[name] = {
    is_inject: false,
    world_book: '',
    target_lore: '',
    content_regex: [],
    replace_regex: '',
  };
  currentMergeKey.value = name;
};

const deleteMergeItem = (key: string) => {
  if (!editingData.value?.merge_setting) return;
  const taskData = editingData.value as StagedSetting[string];
  delete taskData.merge_setting[key];
  if (currentMergeKey.value === key) currentMergeKey.value = '';
};

const onMergeWbChange = (key: string) => {
  const taskData = editingData.value as StagedSetting[string];
  const setting = taskData?.merge_setting[key];
  if (setting && setting.world_book) {
    setting.target_lore = '';
    fetchLoresForBook(setting.world_book);
  }
};

const updateContentRegex = (key: string, event: Event) => {
  const text = (event.target as HTMLTextAreaElement).value;
  const taskData = editingData.value as StagedSetting[string];
  if (taskData?.merge_setting[key]) {
    taskData.merge_setting[key].content_regex = text.split('\n');
  }
};
</script>

<style scoped lang="scss">
/* Modal Styles */
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

.modal-container {
  width: 90%;
  max-width: 1000px;
  height: 85vh;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #111827;

  /* --- 深色模式覆盖 --- */
  &.dark-mode {
    background: #1f2937;
    color: #e2e8f0;

    .task-header { border-bottom-color: #374151; }
    .inner-tabs { border-bottom-color: #4b5563; }
    .tab-btn { color: #9ca3af; &.active { color: #818cf8; border-bottom-color: #818cf8; } }

    /* 强制深色模式下的输入框颜色 */
    .form-group input,
    .form-group textarea {
      background: #111827 !important;
      color: #e2e8f0 !important;
      border-color: #4b5563 !important;
    }

    /* 强制深色模式下的标题输入框 */
    .name-input {
      color: #e2e8f0 !important;
      &:hover, &:focus {
        background: #374151 !important;
        border-color: #4b5563 !important;
      }
    }

    .list-sidebar { background: #111827; border-right-color: #4b5563; }
    .list-editor { border-color: #4b5563; }
    .sub-item { color: #9ca3af; border-bottom-color: #4b5563; &.active { background: #1f2937; color: #818cf8; } &:hover { background: #374151; } }
    .sub-header { border-bottom-color: #4b5563; strong { color: #e2e8f0; } }
    .close-btn { color: #e2e8f0; &:hover { background: #374151; } }
  }
}

.task-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.close-btn {
  font-size: 24px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #4b5563;
  &:hover {
    background: #f3f4f6;
  }
}

/* Header */
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

  .label {
    font-size: 14px;
    color: #4b5563;
  }
  .name-input {
    font-size: 16px;
    font-weight: 600;
    border: 1px solid transparent;
    padding: 4px 8px;
    border-radius: 4px;
    /* 默认浅色模式强制样式 */
    color: #111827 !important;
    background: transparent;

    &:hover,
    &:focus {
      border-color: #e5e7eb;
      background: #ffffff !important;
    }
  }
  .name-static {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
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
    width: 36px; height: 20px; background: #d1d5db; border-radius: 10px; position: relative; transition: 0.3s;
    &::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: 0.3s; }
  }
  input:checked + .slider { background: #4f46e5; }
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
  color: #4b5563;
  font-size: 13px;
  &:hover { color: #111827; }
  &.active { color: #4f46e5; border-bottom-color: #4f46e5; font-weight: 600; }
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
  &.one-col { grid-template-columns: 1fr; }
}

.form-group {
  margin-bottom: 12px;
  label { display: block; font-size: 12px; color: #4b5563; margin-bottom: 4px; font-weight: 600; }

  input, textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 13px;

    /* 默认浅色模式：强制白色背景，深色文字 */
    background: #ffffff !important;
    color: #111827 !important;

    &:focus { border-color: #4f46e5; outline: none; }
  }

  &.full-height { flex: 1; display: flex; flex-direction: column; textarea { flex: 1; resize: none; } }
  &.full-width { grid-column: 1 / -1; }
  .tip { font-size: 11px; color: #4b5563; margin-bottom: 4px; }
}

.checkbox-row {
  display: flex; align-items: center;
  label { display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0; color: #111827; }
  input { width: auto; }
}

/* List Editor */
.list-editor {
  display: flex; height: 100%; border: 1px solid #e5e7eb; border-radius: 6px;
}

.list-sidebar {
  width: 180px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; background: #f9fafb;
  border-top-left-radius: 6px; border-bottom-left-radius: 6px;
  .scroll-list { flex: 1; overflow-y: auto; }
  .sub-item {
    padding: 8px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #e5e7eb; color: #111827;
    &:hover { background: #e5e7eb; }
    &.active { background: #ffffff; color: #4f46e5; font-weight: 600; border-left: 3px solid #4f46e5; }
  }
}

.add-panel {
  padding: 8px; border-bottom: 1px solid #e5e7eb; background: #ffffff;
  .mb-2 { margin-bottom: 6px; }
  .add-actions { display: flex; gap: 4px; .btn { flex: 1; } }
}

.list-content {
  flex: 1; padding: 12px; overflow-y: auto; background: #ffffff;
  border-top-right-radius: 6px; border-bottom-right-radius: 6px;
}

.sub-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6;
  strong { color: #111827; }
}

.empty-sub { display: flex; height: 100%; align-items: center; justify-content: center; color: #4b5563; font-size: 13px; }

.manual-edit-details {
  margin-top: 8px; font-size: 12px; color: #4b5563;
  summary { cursor: pointer; &:hover { color: #111827; } }
  textarea { width: 100%; margin-top: 4px; }
}

.mt-2 { margin-top: 8px; }

/* Buttons */
.btn {
  padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 13px;
  &.primary { background: #4f46e5; color: white; &:hover { background: #4338ca; } }
  &.danger { background: #fee2e2; color: #991b1b; &:hover { background: #fecaca; } }
  &.small { padding: 4px 8px; font-size: 12px; }
  &.icon-btn { font-size: 16px; line-height: 1; padding: 0 8px; }
  &.full { width: 100%; border-radius: 0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* Custom Scrollbar */
.custom-scrollbar {
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #4b5563; }
}
</style>

