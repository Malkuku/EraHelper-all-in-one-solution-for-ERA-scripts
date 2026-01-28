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

    <div v-if="!currentRuleName" class="error-state">请先在“规则选择”页面选择一个规则组进行编辑。</div>

    <div v-else class="editor-body">
      <!-- 左侧：任务列表 -->
      <div class="sidebar">
        <div class="sidebar-title">
          <span>配置列表</span>
          <button class="btn small icon-btn" @click="createTask" title="新建任务">+</button>
        </div>

        <div class="task-list custom-scrollbar">
          <!-- 全局配置入口 -->
          <div
            class="task-item global-item"
            :class="{ active: currentTaskName === GLOBAL_ID }"
            @click="currentTaskName = GLOBAL_ID"
          >
            <div class="task-row">
              <span class="task-order">★</span>
              <span class="task-name">全局设置 (Global)</span>
            </div>
          </div>

          <div class="divider-line"></div>

          <div v-if="sortedTasks.length === 0" class="empty-tip">暂无任务，请新建</div>

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
        <div v-if="!editingData" class="no-selection">请选择一个项目进行编辑</div>

        <div v-else class="task-editor">
          <!-- 标题栏 -->
          <div class="task-header">
            <div class="task-title-edit">
              <span class="label">{{ isGlobalSettings ? '规则组名称:' : '任务名称:' }}</span>
              <span v-if="isGlobalSettings" class="name-static">{{ currentRuleName }}</span>
              <input v-else :value="currentTaskName" @change="renameTask($event)" class="name-input" />
            </div>
            <div class="task-actions" v-if="!isGlobalSettings">
              <label class="toggle-switch">
                <input type="checkbox" v-model="editingData.enable" />
                <span class="slider"></span>
                <span class="text">{{ editingData.enable ? '已启用' : '已禁用' }}</span>
              </label>
              <button class="btn danger small" @click="deleteTask">删除任务</button>
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
                    <select v-model="editingData.api_config">
                      <option value="">-- 请选择 API --</option>
                      <option v-for="(cfg, name) in store.apiConfigSettings" :key="name" :value="name">
                        {{ name }}
                      </option>
                    </select>
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
                    <select v-model="newWbName" class="mini-select">
                      <option value="" disabled>选择世界书...</option>
                      <option v-for="wb in availableNewBooks" :key="wb" :value="wb">{{ wb }}</option>
                    </select>
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

                      <div ref="multiselectRef" class="custom-multiselect">
                        <!-- 显示区域 -->
                        <div class="selected-tags" @click="toggleDropdown('wb_lores')">
                          <span v-if="editingData.world_book[currentWbKey].lores.length === 0" class="placeholder">
                            点击选择条目...
                          </span>
                          <span
                            v-for="(lore, index) in editingData.world_book[currentWbKey].lores"
                            :key="index"
                            class="tag"
                          >
                            {{ lore }}
                            <span class="remove-tag" @click.stop="removeLore(currentWbKey, index)">×</span>
                          </span>
                        </div>

                        <!-- 下拉选项区域 -->
                        <div v-if="activeDropdown === 'wb_lores'" class="dropdown-panel custom-scrollbar">
                          <div v-if="loadingLores" class="dropdown-loading">加载中...</div>
                          <div v-else-if="currentBookLores.length === 0" class="dropdown-empty">该世界书无条目</div>
                          <template v-else>
                            <label v-for="loreName in currentBookLores" :key="loreName" class="dropdown-item">
                              <input
                                type="checkbox"
                                :checked="editingData.world_book[currentWbKey].lores.includes(loreName)"
                                @change="toggleLoreSelection(currentWbKey, loreName)"
                              />
                              {{ loreName }}
                            </label>
                          </template>
                        </div>
                      </div>
                      <!-- 手动编辑入口 -->
                      <details class="manual-edit-details">
                        <summary>手动编辑文本模式</summary>
                        <textarea
                          :value="editingData.world_book[currentWbKey].lores.join('\n')"
                          @input="updateLores(currentWbKey, $event)"
                          rows="4"
                          class="mt-2"
                        ></textarea>
                      </details>
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
                    <!-- 修复：这里使用 String(key) 来避免 TS 认为 key 是 number 导致的类型不匹配 -->
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
                        <select
                          v-model="editingData.merge_setting[currentMergeKey].world_book"
                          @change="onMergeWbChange(currentMergeKey)"
                        >
                          <option value="">-- 选择世界书 --</option>
                          <option v-for="wb in allWorldBooks" :key="wb" :value="wb">{{ wb }}</option>
                        </select>
                      </div>

                      <div class="form-group">
                        <label>目标条目 (Target Lore)</label>
                        <select v-model="editingData.merge_setting[currentMergeKey].target_lore">
                          <option value="">-- 选择条目 --</option>
                          <option
                            v-for="lore in getCachedLores(editingData.merge_setting[currentMergeKey].world_book)"
                            :key="lore"
                            :value="lore"
                          >
                            {{ lore }}
                          </option>
                        </select>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncAnalyzeStore } from '@/ERA助手/stores/AsyncAnalyzeStore';
import { Modal } from '@/ERA助手/utils/modal';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';

// --- 类型定义 (修复类型错误) ---
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
const route = useRoute();
const router = useRouter();

const GLOBAL_ID = '__GLOBAL__';

// 状态
const currentRuleName = ref<string>('');
const currentTaskName = ref<string>(GLOBAL_ID); // 默认为全局设置
const activeTab = ref<'basic' | 'worldbook' | 'merge'>('basic');

// 子列表选中状态
const currentWbKey = ref<string>('');
const currentMergeKey = ref<string>('');

// --- API 数据相关状态 ---
const allWorldBooks = ref<string[]>([]);
const loreCache = reactive<Record<string, string[]>>({});
const loadingLores = ref(false);
const activeDropdown = ref<string | null>(null);

// --- 新增：添加世界书的状态 ---
const isAddingWb = ref(false);
const newWbName = ref('');

// 初始化
onMounted(async () => {
  const queryRule = route.query.rule as string;
  if (queryRule) {
    currentRuleName.value = queryRule;
  } else if (store.activeRuleName && store.asyncAnalyzeSetting[store.activeRuleName]) {
    currentRuleName.value = store.activeRuleName;
  }

  document.addEventListener('click', closeDropdown);
  await fetchWorldBooks();
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown);
});

// --- API 交互逻辑 ---
const fetchWorldBooks = async () => {
  try {
    if (typeof window.getWorldbookNames === 'function') {
      allWorldBooks.value = window.getWorldbookNames();
    } else {
      console.warn('无法找到 getWorldbookNames 全局函数');
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

// --- 下拉框交互逻辑 ---
const toggleDropdown = (id: string) => {
  if (activeDropdown.value === id) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = id;
    if (id === 'wb_lores' && currentWbKey.value) {
      fetchLoresForBook(currentWbKey.value);
    }
  }
};

const closeDropdown = (e: Event) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.custom-multiselect')) {
    activeDropdown.value = null;
  }
};

const toggleLoreSelection = (wbKey: string, loreName: string) => {
  if (!editingData.value?.world_book[wbKey]) return;
  const list = editingData.value.world_book[wbKey].lores;
  const idx = list.indexOf(loreName);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(loreName);
  }
};

const removeLore = (wbKey: string, index: number) => {
  if (!editingData.value?.world_book[wbKey]) return;
  editingData.value.world_book[wbKey].lores.splice(index, 1);
};

// --- 计算属性 ---
const currentRule = computed(() => {
  if (!currentRuleName.value) return null;
  return store.asyncAnalyzeSetting[currentRuleName.value];
});

const isGlobalSettings = computed(() => currentTaskName.value === GLOBAL_ID);

// 动态获取当前编辑的对象（是全局规则还是具体任务）
// 修复：使用 any 或联合类型来避免模板中访问 merge_setting 报错
const editingData = computed((): any => {
  if (!currentRule.value) return null;
  if (isGlobalSettings.value) {
    return currentRule.value; // 返回规则对象本身 (含 comment, world_book)
  }
  return currentRule.value.staged_setting?.[currentTaskName.value];
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

// --- 新增：计算可添加的世界书 ---
const availableNewBooks = computed(() => {
  if (!editingData.value?.world_book) return allWorldBooks.value;
  const existingKeys = Object.keys(editingData.value.world_book);
  return allWorldBooks.value.filter(wb => !existingKeys.includes(wb));
});

// 监听切换，重置子Tab
watch(currentTaskName, () => {
  activeTab.value = 'basic';
  currentWbKey.value = '';
  currentMergeKey.value = '';
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
  currentTaskName.value = name;
};

const renameTask = (event: Event) => {
  if (!currentRule.value || !currentTaskName.value || isGlobalSettings.value) return;
  const newName = (event.target as HTMLInputElement).value.trim();
  if (!newName || newName === currentTaskName.value) return;

  const tasks = currentRule.value.staged_setting;
  if (tasks[newName]) {
    toastr.error('该名称已存在');
    (event.target as HTMLInputElement).value = currentTaskName.value;
    return;
  }
  tasks[newName] = tasks[currentTaskName.value];
  delete tasks[currentTaskName.value];
  currentTaskName.value = newName;
};

const deleteTask = async () => {
  if (!currentRule.value || !currentTaskName.value || isGlobalSettings.value) return;
  const confirmed = await Modal.confirm('删除任务', `确定要删除任务 "${currentTaskName.value}" 吗？`);
  if (!confirmed) return;

  delete currentRule.value.staged_setting[currentTaskName.value];
  currentTaskName.value = GLOBAL_ID;
};

// --- World Book 管理 (通用) ---

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

  // 初始化
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

const updateLores = (key: string, event: Event) => {
  const text = (event.target as HTMLTextAreaElement).value;
  if (editingData.value?.world_book[key]) {
    editingData.value.world_book[key].lores = text.split('\n');
  }
};

// --- Merge Setting 管理 ---

const addMergeItem = async () => {
  if (!editingData.value || isGlobalSettings.value) return;
  const name = await Modal.prompt('添加处理规则', '请输入处理规则名称');
  if (!name) return;

  // 类型断言，确保TS知道这是 Task 设置
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
  // 类型断言
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
  padding: 10px 0;
  border-bottom: 1px solid #9ca3af;
  margin-bottom: 10px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 14px;

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
    margin: 0 8px;
    color: #333333;
  }
  .current-rule {
    font-weight: 600;
    color: #000000;
  }
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
  border-right: 1px solid #9ca3af;
  padding-right: 10px;
}

.sidebar-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 700;
  color: #000000;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.divider-line {
  height: 1px;
  background: #9ca3af;
  margin: 4px 0;
}

.task-item {
  padding: 8px 10px;
  border-radius: 6px;
  background: #f9fafb;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  color: #000000;

  &:hover {
    background: #f3f4f6;
  }

  &.active {
    background: #e0e7ff;
    border-color: #4f46e5;
    .task-name {
      color: #312e81;
      font-weight: 700;
    }
  }

  &.disabled {
    opacity: 0.6;
    .task-name {
      text-decoration: line-through;
    }
  }

  &.global-item {
    background: #fff7ed; /* Orange tint for global */
    border-color: #fed7aa;
    .task-order {
      background: #ffedd5;
      color: #c2410c;
    }
    &.active {
      background: #ffedd5;
      border-color: #f97316;
      .task-name { color: #9a3412; }
    }
  }
}

.task-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-order {
  font-size: 11px;
  background: #e5e7eb;
  color: #000000;
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
  color: #000000;
}

.task-status {
  font-size: 10px;
  color: #333333;
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
  color: #333333;
  border: 2px dashed #9ca3af;
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

  .label {
    font-size: 14px;
    color: #333333;
  }
  .name-input {
    font-size: 16px;
    font-weight: 600;
    border: 1px solid transparent;
    padding: 4px 8px;
    border-radius: 4px;
    color: #000000;
    background: transparent;
    &:hover,
    &:focus {
      border-color: #9ca3af;
      background: #ffffff;
    }
  }
  .name-static {
    font-size: 16px;
    font-weight: 600;
    color: #000000;
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

  input {
    display: none;
  }

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

  input:checked + .slider {
    background: #4f46e5;
  }
  input:checked + .slider::after {
    left: 18px;
  }

  .text {
    font-size: 12px;
    color: #333333;
  }
}

/* Inner Tabs */
.inner-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #9ca3af;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #333333;
  font-size: 13px;

  &:hover {
    color: #000000;
  }

  &.active {
    color: #4f46e5;
    border-bottom-color: #4f46e5;
    font-weight: 600;
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

  &.two-col {
    grid-template-columns: 1fr 1fr;
  }
  &.one-col {
    grid-template-columns: 1fr;
  }
}

.form-group {
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 12px;
    color: #333333;
    margin-bottom: 4px;
    font-weight: 600;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #9ca3af;
    border-radius: 4px;
    font-size: 13px;
    background: #ffffff;
    color: #000000;
    &:focus {
      border-color: #4f46e5;
      outline: none;
    }
  }

  /* 修复：强制下拉框颜色 */
  select {
    color: #000000 !important;
    background-color: #ffffff !important;
    option {
      color: #000000 !important;
      background-color: #ffffff !important;
    }
  }

  &.full-height {
    flex: 1;
    display: flex;
    flex-direction: column;
    textarea {
      flex: 1;
      resize: none;
    }
  }

  &.full-width {
    grid-column: 1 / -1;
  }

  .tip {
    font-size: 11px;
    color: #333333;
    margin-bottom: 4px;
  }
}

.checkbox-row {
  display: flex;
  align-items: center;
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    margin: 0;
    color: #000000;
  }
  input {
    width: auto;
  }
}

/* Sub-List Editor (WorldBook / Merge) */
.list-editor {
  display: flex;
  height: 100%;
  border: 1px solid #9ca3af;
  border-radius: 6px;
  overflow: hidden;
}

.list-sidebar {
  width: 180px;
  border-right: 1px solid #9ca3af;
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
    border-bottom: 1px solid #9ca3af;
    color: #000000;
    &:hover {
      background: #9ca3af;
    }
    &.active {
      background: #ffffff;
      color: #4f46e5;
      font-weight: 600;
      border-left: 3px solid #4f46e5;
    }
  }
}

/* Add Panel in Sidebar */
.add-panel {
  padding: 8px;
  border-bottom: 1px solid #9ca3af;
  background: #ffffff;

  .mini-select {
    width: 100%;
    margin-bottom: 6px;
    font-size: 12px;
    padding: 4px;
  }

  .add-actions {
    display: flex;
    gap: 4px;
    .btn {
      flex: 1;
    }
  }
}

.list-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  background: #ffffff;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
  strong {
    color: #000000;
  }
}

.empty-sub {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #333333;
  font-size: 13px;
}

/* Custom Multi-Select */
.custom-multiselect {
  position: relative;
  border: 1px solid #9ca3af;
  border-radius: 4px;
  background: #ffffff;
  min-height: 36px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  cursor: pointer;
  min-height: 36px;
  align-items: center;

  .placeholder {
    color: #333333;
    font-size: 13px;
    padding-left: 4px;
  }
}

.tag {
  background: #e0e7ff;
  color: #312e81;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #c7d2fe;

  .remove-tag {
    cursor: pointer;
    font-weight: bold;
    &:hover {
      color: #1e1b4b;
    }
  }
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: -1px;
  right: -1px;
  background: #ffffff;
  border: 1px solid #9ca3af;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  font-size: 13px;
  cursor: pointer;
  color: #000000;
  gap: 8px;

  &:hover {
    background: #f3f4f6;
  }

  input[type='checkbox'] {
    width: auto;
    margin: 0;
  }
}

.dropdown-loading,
.dropdown-empty {
  padding: 8px;
  text-align: center;
  color: #333333;
  font-size: 12px;
}

.manual-edit-details {
  margin-top: 8px;
  font-size: 12px;
  color: #333333;

  summary {
    cursor: pointer;
    &:hover {
      color: #000000;
    }
  }

  textarea {
    width: 100%;
    margin-top: 4px;
  }
}

.mt-2 {
  margin-top: 8px;
}

/* Buttons */
.btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 13px;

  &.primary {
    background: #4f46e5;
    color: white;
    &:hover {
      background: #4338ca;
    }
  }
  &.danger {
    background: #fee2e2;
    color: #991b1b;
    &:hover {
      background: #fecaca;
    }
  }
  &.small {
    padding: 4px 8px;
    font-size: 12px;
  }
  &.icon-btn {
    font-size: 16px;
    line-height: 1;
    padding: 0 8px;
  }
  &.full {
    width: 100%;
    border-radius: 0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* Custom Scrollbar */
.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #333333;
  }
}

/* --- Dark Mode Overrides (Forced Colors) --- */
:global(.dark-mode) {
  .rule-editor-container,
  .editor-body,
  .main-content,
  .list-content,
  .tab-pane,
  .add-panel {
    background: #1f2937;
    color: #f3f4f6;
  }

  .editor-header {
    border-bottom-color: #4b5563;
  }
  .breadcrumb .text-btn {
    color: #818cf8;
  }
  .breadcrumb .current-rule {
    color: #f3f4f6;
  }
  .breadcrumb .separator {
    color: #9ca3af;
  }

  .sidebar {
    border-right-color: #4b5563;
  }
  .sidebar-title {
    color: #f3f4f6;
  }
  .divider-line {
    background: #4b5563;
  }

  .task-item {
    background: #111827;
    color: #f3f4f6;
    &:hover {
      background: #374151;
    }
    &.active {
      background: #312e81;
      border-color: #818cf8;
      .task-name {
        color: #e0e7ff;
      }
    }
    &.global-item {
      background: #431407; /* Dark orange bg */
      border-color: #9a3412;
      .task-order {
        background: #7c2d12;
        color: #ffedd5;
      }
      &.active {
        background: #7c2d12;
        border-color: #f97316;
        .task-name { color: #ffedd5; }
      }
    }
  }
  .task-order {
    background: #4b5563;
    color: #f3f4f6;
  }
  .task-name {
    color: #f3f4f6;
  }
  .task-status {
    color: #9ca3af;
  }

  .no-selection {
    border-color: #4b5563;
    color: #9ca3af;
  }

  .task-header {
    border-bottom-color: #374151;
  }
  .task-title-edit .label {
    color: #9ca3af;
  }
  .task-title-edit .name-input, .task-title-edit .name-static {
    color: #f3f4f6;
  }
  .task-title-edit .name-input:hover,
  .task-title-edit .name-input:focus {
    border-color: #4b5563;
    background: #374151;
  }

  .toggle-switch .slider {
    background: #4b5563;
  }
  .toggle-switch input:checked + .slider {
    background: #818cf8;
  }
  .toggle-switch .text {
    color: #9ca3af;
  }

  .inner-tabs {
    border-bottom-color: #4b5563;
  }
  .tab-btn {
    color: #9ca3af;
    &:hover {
      color: #f3f4f6;
    }
    &.active {
      color: #818cf8;
      border-bottom-color: #818cf8;
    }
  }

  .form-group {
    label {
      color: #9ca3af;
    }
    input,
    select,
    textarea {
      background: #111827;
      border-color: #4b5563;
      color: #f3f4f6;
      &:focus {
        border-color: #818cf8;
      }
    }
    /* 修复：强制暗色模式下拉框颜色 */
    select {
      color: #f3f4f6 !important;
      background-color: #111827 !important;
      option {
        color: #f3f4f6 !important;
        background-color: #111827 !important;
      }
    }
    .tip {
      color: #9ca3af;
    }
  }

  .checkbox-row label {
    color: #f3f4f6;
  }

  .list-editor {
    border-color: #4b5563;
  }
  .list-sidebar {
    background: #111827;
    border-right-color: #4b5563;
    .sub-item {
      border-bottom-color: #4b5563;
      color: #9ca3af;
      &:hover {
        background: #374151;
      }
      &.active {
        background: #1f2937;
        color: #818cf8;
      }
    }
  }
  .sub-header {
    border-bottom-color: #4b5563;
    strong {
      color: #f3f4f6;
    }
  }

  .btn.danger {
    background: #7f1d1d;
    color: #fecaca;
    &:hover {
      background: #991b1b;
    }
  }

  /* Custom Select Dark */
  .custom-multiselect {
    background: #111827;
    border-color: #4b5563;
  }
  .selected-tags .placeholder {
    color: #9ca3af;
  }

  .tag {
    background: #312e81;
    color: #e0e7ff;
    border-color: #818cf8;
    .remove-tag:hover {
      color: #fff;
    }
  }

  .dropdown-panel {
    background: #111827;
    border-color: #4b5563;
  }

  .dropdown-item {
    color: #f3f4f6;
    &:hover {
      background: #374151;
    }
  }

  .manual-edit-details {
    color: #9ca3af;
    summary:hover {
      color: #f3f4f6;
    }
  }

  /* Scrollbar Dark */
  .custom-scrollbar {
    &::-webkit-scrollbar-thumb {
      background: #4b5563;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  }
}
</style>
