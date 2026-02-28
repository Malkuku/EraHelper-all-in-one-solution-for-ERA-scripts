<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-container" :class="{ 'dark-mode': uiStore.darkMode }">
      <div class="task-editor">
        <!-- 标题栏 -->
        <div class="task-header">
          <div class="task-title-edit">
            <span class="label">{{ isGlobalSettings ? '规则组名称:' : '全局任务名称:' }}</span>
            <span v-if="isGlobalSettings" class="name-static">{{ ruleName }}</span>
            <input v-else :value="taskName" class="name-input" @change="renameTask($event)" title="修改名称将同步更新所有引用了此任务的规则组" />
          </div>
          <div class="task-actions">
            <template v-if="!isGlobalSettings">
              <label class="toggle-switch">
                <input v-model="editingData.enable" type="checkbox" />
                <span class="slider"></span>
                <span class="text">{{ editingData.enable ? '已启用' : '已禁用' }}</span>
              </label>
              <button class="btn primary small" title="复制当前任务配置" @click="handleCopyTask">复制任务</button>
              <button class="btn warning small" title="仅从当前规则组中解除关联，不删除全局配置" @click="handleRemoveRef">移除关联</button>
              <button class="btn danger small" title="从全局彻底删除此任务，并清理所有引用" @click="handleDeleteGlobalTask">删除全局任务</button>
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
                <label>
                  {{ isGlobalSettings ? '规则组注释' : '任务备注' }}
                  <Tooltip content="注释文本内容" placement="top" />
                </label>
                <textarea
                  v-model="editingData.comment"
                  class="comment-textarea"
                  placeholder="在此输入用途或说明..."
                  rows="3"
                ></textarea>
              </div>

              <!-- 仅任务模式显示 -->
              <template v-if="!isGlobalSettings">
                <div class="form-group">
                  <label>
                    执行顺序
                    <Tooltip content="任务的处理顺序，按照从小到大的顺序处理，如果相同则会并行处理。" placement="top" />
                  </label>
                  <input v-model.number="editingData.order" type="number" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>
                    事件名称
                    <Tooltip content="监听额外的触发事件名称，这代表你可以通过手动发送自定义事件来触发一些任务（在该状态下，即使任务处于关闭状态也会被执行）" placement="top" />
                  </label>
                  <input v-model="editingData.event_name" placeholder="输入事件名称..." />
                </div>
                <div class="form-group">
                  <label>
                    API 配置
                    <Tooltip content="使用的api配置名称，此处关联“API配置”部分" placement="top" />
                  </label>
                  <SearchableSelect
                    v-model="editingData.api_config"
                    :options="Object.keys(store.apiConfigSettings)"
                    placeholder="-- 请选择 API --"
                  />
                </div>
                <div class="form-group">
                  <label>
                    触发间隔
                    <Tooltip content="触发的间隔楼层数，当前楼层与上次触发楼层的差值>=触发间隔时，该任务才会被触发" placement="top" />
                  </label>
                  <input v-model.number="editingData.trigger_index" type="number" min="1" />
                </div>
                <div class="form-group">
                  <label>
                    上下文楼层
                    <Tooltip content="AI读取的最大上下文楼层数" placement="top" />
                  </label>
                  <input v-model.number="editingData.chat_history" type="number" min="0" />
                </div>
                <div class="form-group">
                  <label>
                    重试次数
                    <Tooltip content="AI回复失败时的重试次数" placement="top" />
                  </label>
                  <input v-model.number="editingData.reroll_count" type="number" min="0" />
                </div>
                <div class="form-group checkbox-row">
                  <label>
                    <input v-model="editingData.whiteListModel" type="checkbox" />
                    白名单模式
                    <Tooltip content="开启后，将只使用在此任务中配置的世界书，自动过滤掉其他来源（如全局设置）的世界书。" placement="top" />
                  </label>
                </div>
              </template>
            </div>

            <div v-if="!isGlobalSettings" class="form-group full-height">
              <label>
                提示词
                <Tooltip content="发送给AI的提示词" placement="top" />
              </label>
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
                    <button class="btn small primary" :disabled="!newWbName" @click="confirmAddWb">确定</button>
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
                    <label>
                      正则匹配条目
                      <Tooltip content="通过正则匹配条目,它会将匹配到的条目发送给AI (满足任一正则即可)" placement="top" />
                    </label>
                    <div class="tip">每行一条正则，可手动输入或选择预设</div>

                    <div class="regex-list-container">
                      <div
                        v-for="(regex, index) in (ensureArray(editingData.world_book[currentWbKey].lore_regex))"
                        :key="index"
                        class="regex-row"
                      >
                        <input
                          :value="regex"
                          placeholder="输入正则表达式..."
                          @input="updateLoreRegexItem(currentWbKey, index, $event)"
                        />
                        <div class="preset-select-wrapper small">
                          <SearchableSelect
                            :model-value="''"
                            :options="regexPresetOptions"
                            placeholder="预设"
                            @update:model-value="(name) => applyRegexPresetToLoreRegexItem(currentWbKey, index, name)"
                          />
                        </div>
                        <button class="btn danger icon-btn" @click="removeLoreRegexItem(currentWbKey, index)">×</button>
                      </div>
                    </div>
                    <div class="regex-actions">
                      <button class="btn small primary" @click="addEmptyLoreRegex(currentWbKey)">+ 添加一行</button>
                    </div>
                  </div>

                  <!-- 自定义多选下拉框 -->
                  <div class="form-group">
                    <label>
                      名称匹配条目
                      <Tooltip content="根据名称来匹配条目，匹配的条目将发送给AI" placement="top" />
                    </label>
                    <div class="tip">从下拉框选择条目，或手动输入</div>

                    <div class="lore-filter-container mb-2">
                      <div class="filter-row">
                        <input
                          v-model="loreFilterText"
                          class="lore-filter-input"
                          placeholder="输入关键词筛选条目..."
                        />
                        <div class="filter-actions">
                          <button
                            class="btn small secondary"
                            :disabled="!filteredLores.length || loadingLores"
                            @click="selectAllLores(currentWbKey)"
                            title="全选当前筛选结果"
                          >
                            ✓ 全选
                          </button>
                          <button
                            class="btn small secondary"
                            :disabled="!filteredLores.length || loadingLores"
                            @click="invertSelection(currentWbKey)"
                            title="反选当前筛选结果"
                          >
                            ↻ 反选
                          </button>
                        </div>
                      </div>
                      <div class="filter-info">
                        <span class="info-item">共 {{ currentBookLores.length }} 条</span>
                        <span v-if="loreFilterText" class="info-item highlight">筛选: {{ filteredLores.length }} 条</span>
                        <span class="info-item selected">已选: {{ getSelectedCount(currentWbKey) }}</span>
                      </div>
                    </div>

                    <SearchableSelect
                      v-model="editingData.world_book[currentWbKey].lores"
                      :options="filteredLores"
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
                      写入正文
                      <Tooltip content="是否写入正文中，如果为否，则需要配置写入的世界书条目位置" placement="top" />
                    </label>
                  </div>

                  <div class="form-grid two-col">
                    <div class="form-group">
                      <label>
                        目标世界书
                        <Tooltip content="AI写入的目标世界书名称" placement="top" />
                      </label>
                      <SearchableSelect
                        v-model="editingData.merge_setting[currentMergeKey].world_book"
                        :options="allWorldBooks"
                        :disabled="editingData.merge_setting[currentMergeKey].is_inject"
                        placeholder="-- 选择世界书 --"
                        @change="onMergeWbChange(currentMergeKey)"
                      />
                    </div>

                    <div class="form-group">
                      <label>
                        目标条目
                        <Tooltip content="AI写入的目标条目名称" placement="top" />
                      </label>
                      <SearchableSelect
                        v-model="editingData.merge_setting[currentMergeKey].target_lore"
                        :options="getCachedLores(editingData.merge_setting[currentMergeKey].world_book)"
                        :disabled="editingData.merge_setting[currentMergeKey].is_inject"
                        placeholder="-- 选择条目 --"
                      />
                    </div>
                  </div>

                  <!-- 内容捕获正则 -->
                  <div class="form-group">
                    <label>
                      内容捕获正则
                      <Tooltip content="内容正则匹配,将从AI输出中文本中捕获相应的内容" placement="top" />
                    </label>
                    <div class="tip">每行一条正则，可手动输入或选择预设</div>

                    <div class="regex-list-container">
                      <div
                        v-for="(regex, index) in (editingData.merge_setting[currentMergeKey].content_regex || [])"
                        :key="index"
                        class="regex-row"
                      >
                        <input
                          :value="regex"
                          placeholder="输入正则表达式..."
                          @input="updateRegexItem(currentMergeKey, index, $event)"
                        />
                        <div class="preset-select-wrapper small">
                          <SearchableSelect
                            :model-value="''"
                            :options="regexPresetOptions"
                            placeholder="预设"
                            @update:model-value="(name) => applyRegexPresetToItem(currentMergeKey, index, name)"
                          />
                        </div>
                        <button class="btn danger icon-btn" @click="removeRegexItem(currentMergeKey, index)">×</button>
                      </div>
                    </div>
                    <div class="regex-actions">
                      <button class="btn small primary" @click="addEmptyRegex(currentMergeKey)">+ 添加一行</button>
                    </div>

                    <!-- 替换正则 -->
                    <div class="form-group">
                      <label>
                        替换正则
                        <Tooltip content="替换正则匹配,会将匹配到的内容替换为“内容捕获正则”的匹配内容，为空则默认在尾部添加内容" placement="top" />
                      </label>
                      <div class="regex-input-group">
                        <input
                          v-model="editingData.merge_setting[currentMergeKey].replace_regex"
                          placeholder="输入正则..."
                          class="flex-grow"
                        />
                        <div class="preset-select-wrapper">
                          <SearchableSelect
                            :model-value="''"
                            :options="regexPresetOptions"
                            placeholder="选择预设..."
                            @update:model-value="(name) => applyRegexPreset(currentMergeKey, 'replace', name)"
                          />
                        </div>
                      </div>
                    </div>

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
import { useAsyncAnalyzeStore } from '@/MVU助手/stores/AsyncAnalyzeStore';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { Modal } from '@/MVU助手/utils/modal';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import SearchableSelect from '@/MVU助手/UI/components/Dialog/SearchableSelect.vue';
import type { TaskConfigSetting } from '@/MVU助手/AsyncAnalyze/types/AsyncAnalyzeSetting';
import Tooltip from '../Common/Tooltip.vue';

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

// --- 新增：世界书条目筛选状态 ---
const loreFilterText = ref('');

// 计算属性
const isGlobalSettings = computed(() => props.taskName === GLOBAL_ID);

const currentRule = computed(() => {
  if (!props.ruleName) return null;
  return store.asyncAnalyzeSetting[props.ruleName];
});

// [修改] 数据源指向全局任务池
const editingData = computed((): any => {
  if (isGlobalSettings.value) {
    if (!currentRule.value) return null;
    return currentRule.value;
  }
  return store.taskConfigSettings[props.taskName];
});

// 获取正则预设的名称列表
const regexPresetOptions = computed(() => {
  return store.savedRegexConfigs.map(c => c.name);
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

// 监听世界书切换，重置筛选
watch(() => currentWbKey.value, () => {
  loreFilterText.value = '';
});

const closeModal = () => {
  emit('close');
};

// --- 逻辑方法 ---

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

const filteredLores = computed(() => {
  const text = loreFilterText.value.trim().toLowerCase();
  if (!text) return currentBookLores.value;
  return currentBookLores.value.filter(lore => lore.toLowerCase().includes(text));
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

// [修改] 重命名全局任务，并同步更新所有规则组的引用
const renameTask = (event: Event) => {
  if (!props.taskName || isGlobalSettings.value) return;
  const newName = (event.target as HTMLInputElement).value.trim();
  if (!newName || newName === props.taskName) return;

  if (store.taskConfigSettings[newName]) {
    toastr.error('该任务名称已存在于全局池中');
    (event.target as HTMLInputElement).value = props.taskName;
    return;
  }

  // 1. 在全局池中重命名
  store.taskConfigSettings[newName] = store.taskConfigSettings[props.taskName];
  delete store.taskConfigSettings[props.taskName];

  // 2. 更新所有引用了该任务的规则组
  for (const ruleKey in store.asyncAnalyzeSetting) {
    const rule = store.asyncAnalyzeSetting[ruleKey];
    if (rule.task_refs) {
      const index = rule.task_refs.indexOf(props.taskName);
      if (index !== -1) {
        rule.task_refs[index] = newName;
      }
    }
  }

  // 通知父组件更新选中的任务名
  emit('update:taskName', newName);
  toastr.success(`任务已重命名为: ${newName}`);
};

// [修改] 复制任务到全局池，并自动关联到当前规则组
const handleCopyTask = () => {
  if (!props.taskName || isGlobalSettings.value) return;

  const baseName = props.taskName + '_copy';
  let newName = baseName;
  let counter = 1;

  // 确保名称唯一
  while (store.taskConfigSettings[newName]) {
    newName = `${baseName}${counter}`;
    counter++;
  }

  // 深拷贝数据到全局池
  store.taskConfigSettings[newName] = JSON.parse(JSON.stringify(editingData.value));

  // 自动关联到当前规则组
  if (currentRule.value) {
    if (!currentRule.value.task_refs) currentRule.value.task_refs = [];
    currentRule.value.task_refs.push(newName);
  }

  emit('update:taskName', newName); // 切换到新任务
  toastr.success(`已复制并关联新任务: ${newName}`);
};

// [新增] 仅移除关联
const handleRemoveRef = () => {
  emit('delete-task'); // 父组件会处理移除引用的逻辑
};

// [修改] 彻底删除全局任务
const handleDeleteGlobalTask = async () => {
  if (!props.taskName || isGlobalSettings.value) return;
  const confirmed = await Modal.confirm(
    '删除全局任务',
    `确定要彻底删除全局任务 "${props.taskName}" 吗？\n警告：这会将其从所有使用该任务的规则组中移除，此操作不可恢复！`
  );
  if (!confirmed) return;

  // 1. 从全局池中删除
  delete store.taskConfigSettings[props.taskName];

  // 2. 从所有规则组的引用中移除
  for (const ruleKey in store.asyncAnalyzeSetting) {
    const rule = store.asyncAnalyzeSetting[ruleKey];
    if (rule.task_refs) {
      rule.task_refs = rule.task_refs.filter(ref => ref !== props.taskName);
    }
  }

  toastr.success('全局任务已彻底删除');
  emit('close'); // 关闭弹窗
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
    lore_regex: [],
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

  // [修改] 类型断言
  const taskData = editingData.value as TaskConfigSetting[string];
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
  const taskData = editingData.value as TaskConfigSetting[string];
  delete taskData.merge_setting[key];
  if (currentMergeKey.value === key) currentMergeKey.value = '';
};

const onMergeWbChange = (key: string) => {
  const taskData = editingData.value as TaskConfigSetting[string];
  const setting = taskData?.merge_setting[key];
  if (setting && setting.world_book) {
    setting.target_lore = '';
    fetchLoresForBook(setting.world_book);
  }
};

// --- 正则管理 (应用预设) ---

const getPatternByName = (name: string) => {
  try {
    const config = store.savedRegexConfigs.find(c => c.name === name);
    return config ? config.regex : '';
  } catch (error) {
    console.error('获取正则预设失败:', error);
    return '';
  }
};

const validateRegex = (regexStr: string) => {
  if (!regexStr) return true;

  try {
    if (regexStr.startsWith('/') && regexStr.length > 1) {
      const lastSlashIndex = regexStr.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        const pattern = regexStr.substring(1, lastSlashIndex);
        const flags = regexStr.substring(lastSlashIndex + 1);

        if (flags && /[^gimsuv]/.test(flags)) {
          console.warn(`Invalid regex flags: ${flags}`);
          return false;
        }

        new RegExp(pattern);
        return true;
      }
    } else {
      new RegExp(regexStr);
      return true;
    }
  } catch (e) {
    console.warn(`Invalid regex pattern: ${regexStr}`, e);
    return false;
  }

  return true;
};

const applyRegexPreset = (key: string, field: 'replace', presetName: string) => {
  if (!presetName) return;
  const pattern = getPatternByName(presetName);
  if (pattern && validateRegex(pattern)) {
    const taskData = editingData.value as TaskConfigSetting[string];
    if (field === 'replace' && taskData.merge_setting && taskData.merge_setting[key]) {
      taskData.merge_setting[key].replace_regex = pattern;
    }
  } else {
    console.error(`Invalid regex pattern for preset: ${presetName}`);
  }
};

const applyRegexPresetToItem = (key: string, index: number, presetName: string) => {
  if (!presetName) return;
  const pattern = getPatternByName(presetName);
  if (pattern && validateRegex(pattern) && editingData.value?.merge_setting?.[key]?.content_regex) {
    const taskData = editingData.value as TaskConfigSetting[string];
    if (taskData.merge_setting[key].content_regex) {
      taskData.merge_setting[key].content_regex[index] = pattern;
    }
  } else {
    console.error(`Invalid regex pattern for preset: ${presetName}`);
  }
};

const applyRegexPresetToLoreRegexItem = (wbKey: string, index: number, presetName: string) => {
  if (!presetName) return;
  const pattern = getPatternByName(presetName);
  if (pattern && validateRegex(pattern)) {
    if (!editingData.value?.world_book?.[wbKey]) return;
    const wbConfig = editingData.value.world_book[wbKey];

    if (!Array.isArray(wbConfig.lore_regex)) {
      wbConfig.lore_regex = wbConfig.lore_regex ? [wbConfig.lore_regex] : [];
    }

    wbConfig.lore_regex[index] = pattern;
  } else {
    console.error(`Invalid regex pattern for preset: ${presetName}`);
  }
};

const addEmptyRegex = (key: string) => {
  const taskData = editingData.value as TaskConfigSetting[string];
  if (!taskData.merge_setting[key].content_regex) {
    taskData.merge_setting[key].content_regex = [];
  }
  taskData.merge_setting[key].content_regex.push('');
};

const removeRegexItem = (key: string, index: number) => {
  const taskData = editingData.value as TaskConfigSetting[string];
  if (taskData.merge_setting[key].content_regex) {
    taskData.merge_setting[key].content_regex.splice(index, 1);
  }
};

const updateRegexItem = (key: string, index: number, event: Event) => {
  const val = (event.target as HTMLInputElement).value;
  const taskData = editingData.value as TaskConfigSetting[string];
  if (taskData.merge_setting[key].content_regex) {
    taskData.merge_setting[key].content_regex[index] = val;
  }
};

const ensureArray = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  return [];
};

const addEmptyLoreRegex = (wbKey: string) => {
  if (!editingData.value?.world_book?.[wbKey]) return;
  const wbConfig = editingData.value.world_book[wbKey];

  if (!Array.isArray(wbConfig.lore_regex)) {
    wbConfig.lore_regex = [];
  }

  wbConfig.lore_regex.push('');
};

const removeLoreRegexItem = (wbKey: string, index: number) => {
  if (!editingData.value?.world_book?.[wbKey]) return;
  const wbConfig = editingData.value.world_book[wbKey];

  if (Array.isArray(wbConfig.lore_regex)) {
    wbConfig.lore_regex.splice(index, 1);
  }
};

const updateLoreRegexItem = (wbKey: string, index: number, event: Event) => {
  if (!editingData.value?.world_book?.[wbKey]) return;
  const val = (event.target as HTMLInputElement).value;
  const wbConfig = editingData.value.world_book[wbKey];

  if (!Array.isArray(wbConfig.lore_regex)) {
    wbConfig.lore_regex = [];
  }

  wbConfig.lore_regex[index] = val;
};

const selectAllLores = (wbKey: string) => {
  if (!editingData.value?.world_book?.[wbKey]) return;

  const currentSelected = new Set(editingData.value.world_book[wbKey].lores || []);
  filteredLores.value.forEach(lore => currentSelected.add(lore));
  editingData.value.world_book[wbKey].lores = Array.from(currentSelected);
};

const invertSelection = (wbKey: string) => {
  if (!editingData.value?.world_book?.[wbKey]) return;

  const currentSelected = new Set(editingData.value.world_book[wbKey].lores || []);
  filteredLores.value.forEach(lore => {
    if (currentSelected.has(lore)) {
      currentSelected.delete(lore);
    } else {
      currentSelected.add(lore);
    }
  });

  editingData.value.world_book[wbKey].lores = Array.from(currentSelected);
};

const getSelectedCount = (wbKey: string) => {
  if (!editingData.value?.world_book?.[wbKey]) return 0;
  const selected = editingData.value.world_book[wbKey].lores || [];
  return Array.isArray(selected) ? selected.length : 0;
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
  color: #000000;

  /* --- 深色模式覆盖 --- */
  &.dark-mode {
    background: #1f2937;
    color: #e2e8f0;

    .task-header { border-bottom-color: #374151; }
    .inner-tabs { border-bottom-color: #4b5563; }
    .tab-btn {
      color: #9ca3af;
      &:hover { color: #e2e8f0; }
      &.active { color: #818cf8; border-bottom-color: #818cf8; }
    }

    .form-group {
      label { color: #e2e8f0 !important; }
      .tip { color: #9ca3af; }

      input,
      textarea,
      select {
        background: #374151 !important;
        color: #e2e8f0 !important;
        border-color: #4b5563 !important;
        &:focus { border-color: #818cf8 !important; }
      }

      .comment-textarea {
        background: #374151 !important;
        color: #e2e8f0 !important;
        border-color: #4b5563 !important;
        &:focus { border-color: #818cf8 !important; }
      }
    }

    .name-input {
      color: #e2e8f0 !important;
      background: #374151 !important;
      &:hover, &:focus {
        background: #4b5563 !important;
        border-color: #4b5563 !important;
      }
    }

    .name-static {
      color: #e2e8f0 !important;
    }

    .list-sidebar { background: #111827; border-right-color: #4b5563; }
    .list-editor { border-color: #4b5563; }

    .sub-item {
      color: #9ca3af;
      border-bottom-color: #4b5563;
      &.active { background: #1f2937; color: #818cf8; }
      &:hover { background: #374151; }
    }

    .add-panel {
      background: #1f2937;
      border-bottom-color: #4b5563;
    }

    .list-content {
      background: #1f2937;
    }

    .sub-header { border-bottom-color: #4b5563; strong { color: #e2e8f0; } }
    .empty-sub { color: #9ca3af; }
    .close-btn { color: #e2e8f0; &:hover { background: #374151; } }

    .label { color: #e2e8f0 !important; }
    .text { color: #e2e8f0; }

    .toggle-switch {
      .slider { background: #4b5563; }
      input:checked + .slider { background: #6366f1; }
      .text { color: #e2e8f0; }
    }

    .checkbox-row label { color: #e2e8f0; }

    .btn.danger {
      background: #7f1d1d;
      color: #fecaca;
      &:hover { background: #991b1b; }
    }

    .btn.warning {
      background: #78350f;
      color: #fde68a;
      &:hover { background: #92400e; }
    }

    .btn.secondary {
      background: #374151;
      color: #e2e8f0;
      border: 1px solid #4b5563;
      &:hover:not(:disabled) {
        background: #4b5563;
        border-color: #6b7280;
      }
      &:disabled {
        background: #1f2937;
        color: #6b7280;
        border-color: #374151;
        opacity: 0.6;
      }
    }

    .custom-scrollbar {
      &::-webkit-scrollbar-thumb { background: #4b5563; }
      &::-webkit-scrollbar-thumb:hover { background: #6b7280; }
    }

    .lore-filter-container {
      background: #1f2937;
      border-color: #4b5563;

      .lore-filter-input {
        background: #374151 !important;
        color: #e2e8f0 !important;
        border-color: #4b5563 !important;
        &:focus { border-color: #818cf8 !important; }
      }

      .filter-info {
        color: #9ca3af;
        .info-item.highlight { color: #818cf8; }
        .info-item.selected { color: #34d399; }
      }
    }
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
  color: #111827;
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
  border-bottom: 1px solid #e5e7eb;
}

.task-title-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  .label {
    font-size: 14px;
    color: #111827;
    font-weight: 600;
  }
  .name-input {
    font-size: 16px;
    font-weight: 600;
    border: 1px solid transparent;
    padding: 4px 8px;
    border-radius: 4px;
    color: #000000 !important;
    background: transparent;

    &:hover,
    &:focus {
      border-color: #9ca3af;
      background: #ffffff !important;
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

  input { display: none; }
  .slider {
    width: 36px; height: 20px; background: #9ca3af; border-radius: 10px; position: relative; transition: 0.3s;
    &::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: 0.3s; }
  }
  input:checked + .slider { background: #4f46e5; }
  input:checked + .slider::after { left: 18px; }
  .text { font-size: 12px; color: #111827; font-weight: 500; }
}

/* Inner Tabs */
.inner-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #d1d5db;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  &:hover { color: #000000; }
  &.active { color: #4f46e5; border-bottom-color: #4f46e5; font-weight: 700; }
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
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #000000 !important;
    margin-bottom: 4px;
    font-weight: 700;
  }

  input, textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    background: #ffffff !important;
    color: #000000 !important;

    &:focus { border-color: #4f46e5; outline: none; }
  }

  .comment-textarea {
    min-height: 80px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
  }

  &.full-height { flex: 1; display: flex; flex-direction: column; textarea { flex: 1; resize: none; } }
  &.full-width { grid-column: 1 / -1; }
  .tip { font-size: 11px; color: #4b5563; margin-bottom: 4px; font-weight: 500; }
  .inline-tip { margin-left: 8px; color: #dc2626; }
}

.checkbox-row {
  display: flex; align-items: center;
  label { display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0; color: #000000; font-weight: 600; }
  input { width: auto; }
}

/* List Editor */
.list-editor {
  display: flex; height: 100%; border: 1px solid #d1d5db; border-radius: 6px;
}

.list-sidebar {
  width: 180px; border-right: 1px solid #d1d5db; display: flex; flex-direction: column; background: #f3f4f6;
  border-top-left-radius: 6px; border-bottom-left-radius: 6px;
  .scroll-list { flex: 1; overflow-y: auto; }
  .sub-item {
    padding: 8px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;
    &:hover { background: #e5e7eb; }
    &.active { background: #ffffff; color: #4f46e5; font-weight: 700; border-left: 3px solid #4f46e5; }
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
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;
  strong { color: #000000; font-size: 14px; }
}

.empty-sub { display: flex; height: 100%; align-items: center; justify-content: center; color: #4b5563; font-size: 13px; font-weight: 500; }

/* Regex UI Styles */
.regex-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
  .flex-grow {
    flex: 1;
    font-weight: 600;
  }
  .preset-select-wrapper {
    width: 140px;
    flex-shrink: 0;
  }
}

input[placeholder*="正则"],
input[placeholder*="regex"] {
  font-weight: 600 !important;
}

.regex-list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.regex-row {
  display: flex;
  gap: 8px;
  align-items: center;
  input { flex: 1; }
  .preset-select-wrapper {
    width: 100px;
    flex-shrink: 0;
    &.small { width: 100px; }
  }
}
.regex-actions {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 13px; font-weight: 500;
  &.primary { background: #4f46e5; color: white; &:hover { background: #4338ca; } }
  &.danger { background: #fee2e2; color: #991b1b; &:hover { background: #fecaca; } }
  &.warning { background: #fef3c7; color: #92400e; &:hover { background: #fde68a; } }
  &.secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    &:hover:not(:disabled) {
      background: #e5e7eb;
      border-color: #9ca3af;
    }
    &:disabled {
      background: #f9fafb;
      color: #9ca3af;
      border-color: #e5e7eb;
      opacity: 0.6;
    }
  }
  &.small { padding: 4px 8px; font-size: 12px; }
  &.icon-btn { font-size: 16px; line-height: 1; padding: 0 8px; }
  &.full { width: 100%; border-radius: 0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* Custom Scrollbar */
.custom-scrollbar {
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #6b7280; }
}

/* New Styles for Lore Filter */
.lore-filter-container {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;

  .filter-row {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;

    .lore-filter-input {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 13px;
      &:focus { border-color: #4f46e5; outline: none; }
    }

    .filter-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
  }

  .filter-info {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #6b7280;
    align-items: center;

    .info-item {
      &.highlight { color: #4f46e5; font-weight: 600; }
      &.selected { color: #059669; font-weight: 600; margin-left: auto; }
    }
  }
}
</style>
