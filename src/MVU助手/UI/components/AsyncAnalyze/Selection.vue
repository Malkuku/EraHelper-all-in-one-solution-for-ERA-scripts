<template>
  <div :class="{ 'dark-mode': uiStore.darkMode }" class="rule-selector">
    <div class="header-actions">
      <!-- 包裹一下 FileImportExport 以便控制布局 -->
      <div class="action-left">
        <FileImportExport
          accept=".json"
          import-text="导入配置"
          export-text="导出配置"
          confirm-title="导入配置确认"
          confirm-content="导入新配置将合并到当前配置中，重名规则组和任务将被覆盖，确定要继续吗？"
          @import-confirmed="handleImportConfirmed"
          @export-data="handleExportData"
        />
      </div>

      <div class="input-group">
        <input v-model="newRuleName" placeholder="输入新规则组名称..." @keyup.enter="createNewRule" />
        <button class="btn primary small" @click="createNewRule">新建规则组</button>
      </div>
    </div>

    <div v-if="Object.keys(store.asyncAnalyzeSetting).length === 0" class="empty-state">暂无规则配置，请新建一个。</div>

    <div class="rule-list">
      <div
        v-for="(setting, key, index) in store.asyncAnalyzeSetting"
        :key="key"
        class="rule-card"
        :class="{ 'active-card': store.activeRuleName === key }"
      >
        <div class="card-header">
          <div class="rule-info">
            <span class="rule-name">{{ key }}</span>
            <div class="rule-tags">
              <span v-if="store.activeRuleName === key" class="tag success">当前启用</span>
              <!-- 使用新的 task_refs 数组长度 -->
              <span class="tag info">{{ setting.task_refs?.length || 0 }} 个任务</span>
            </div>
          </div>
          <div class="card-actions">
            <!-- 移动位置按钮 -->
            <button
              class="btn small secondary btn-move"
              :disabled="index === 0"
              @click="moveRule(key as string, -1)"
              title="上移"
            >
              ↑
            </button>
            <button
              class="btn small secondary btn-move"
              :disabled="index === Object.keys(store.asyncAnalyzeSetting).length - 1"
              @click="moveRule(key as string, 1)"
              title="下移"
            >
              ↓
            </button>

            <button v-if="store.activeRuleName !== key" class="btn small primary" @click="activateRule(key as string)">
              启用
            </button>
            <!-- 复制按钮 -->
            <button class="btn small secondary" @click="copyRule(key as string)">复制</button>
            <!-- 编辑按钮 -->
            <button class="btn small info" @click="editRule(key as string)">编辑</button>
            <button class="btn small danger" @click="deleteRule(key as string)">删除</button>
          </div>
        </div>

        <!-- 显示规则注释 -->
        <div v-if="setting.comment" class="rule-comment">
          {{ setting.comment }}
        </div>

        <div class="card-preview">
          <!-- 简单预览该规则组下的任务名称 (从 task_refs 中读取) -->
          <span v-for="taskName in setting.task_refs || []" :key="taskName" class="task-pill" :class="{ 'missing-task': !store.taskConfigSettings[taskName] }">
            {{ taskName }}
            <span v-if="!store.taskConfigSettings[taskName]" title="该任务在全局任务池中不存在"> (丢失)</span>
          </span>
          <span v-if="!(setting.task_refs?.length)" class="no-task-tip">暂无任务</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAsyncAnalyzeStore } from '@/MVU助手/stores/AsyncAnalyzeStore';
import { AsyncAnalyzeSetting } from '@/MVU助手/AsyncAnalyze/types/AsyncAnalyzeSetting';
import FileImportExport from '@/MVU助手/UI/components/File/FileImportExport.vue';
import { Modal } from '@/MVU助手/utils/modal';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { updateGlobalBlacklist } from '@/MVU助手/AsyncAnalyze/AsyncAnalyzeFilter';

const store = useAsyncAnalyzeStore();
const router = useRouter();
const newRuleName = ref('');

const uiStore = useUiStore();

// 创建新规则组
const createNewRule = async () => {
  const name = newRuleName.value.trim();
  if (!name) {
    toastr.warning('请输入规则组名称');
    return;
  }
  if (store.asyncAnalyzeSetting[name]) {
    toastr.error('该名称已存在');
    return;
  }

  // 初始化新结构：包含注释、任务引用数组、全局世界书配置
  store.asyncAnalyzeSetting[name] = {
    comment: '',
    task_refs: [], // [修改] 使用 task_refs 替代 staged_setting
    world_book: {},
  };
  newRuleName.value = '';

  // 如果是第一个，自动激活
  if (!store.activeRuleName) {
    store.activeRuleName = name;
    await updateGlobalBlacklist();
  }

  await store.saveModelSettings();
  toastr.success(`规则组 "${name}" 已创建`);
};

// 复制规则组
const copyRule = async (key: string) => {
  const originalSetting = store.asyncAnalyzeSetting[key];
  if (!originalSetting) return;

  // 使用 Modal.prompt 获取新名称
  const newName = await Modal.prompt(
    '复制规则组',
    '请输入新规则组名称',
    `${key}_copy`, // 默认值
  );

  // 用户取消或未输入
  if (!newName) return;

  const trimmedName = newName.trim();
  if (!trimmedName) {
    toastr.warning('名称不能为空');
    return;
  }

  // 检查重名
  if (store.asyncAnalyzeSetting[trimmedName]) {
    toastr.error(`规则组 "${trimmedName}" 已存在，请使用其他名称`);
    return;
  }

  // 深拷贝配置 (只会复制引用 task_refs，不会复制实际的全局任务)
  try {
    store.asyncAnalyzeSetting[trimmedName] = JSON.parse(JSON.stringify(originalSetting));

    await store.saveModelSettings();
    toastr.success(`成功复制为 "${trimmedName}"`);
  } catch (e) {
    console.error(e);
    toastr.error('复制失败');
  }
};

// 调整规则组位置
const moveRule = async (key: string, direction: number) => {
  const keys = Object.keys(store.asyncAnalyzeSetting);
  const index = keys.indexOf(key);
  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= keys.length) return;

  // 交换键顺序
  const newKeys = [...keys];
  [newKeys[index], newKeys[newIndex]] = [newKeys[newIndex], newKeys[index]];

  // 重建对象以保持顺序
  const newSettings: any = {};
  for (const k of newKeys) {
    newSettings[k] = store.asyncAnalyzeSetting[k];
  }

  // 更新 store
  store.asyncAnalyzeSetting = newSettings;
  await store.saveModelSettings();
};

// 激活规则
const activateRule = async (key: string) => {
  store.activeRuleName = key;
  await store.saveModelSettings();
  toastr.success(`已启用规则组: ${key}`);
};

// 删除规则
const deleteRule = async (key: string) => {
  // 使用统一的 Modal.confirm 进行确认
  const confirmed = await Modal.confirm(
    '删除确认',
    `确定要删除规则组 "${key}" 吗？此操作不可恢复。\n(注：全局任务池中的任务不会被删除)`
  );

  if (!confirmed) return;

  delete store.asyncAnalyzeSetting[key];

  // 如果删除的是当前激活的，重置激活状态
  if (store.activeRuleName === key) {
    store.activeRuleName = '';
    await updateGlobalBlacklist();
  }

  await store.saveModelSettings();
  toastr.success('删除成功');
};

// 跳转到编辑页面
const editRule = (key: string) => {
  router.push({ name: 'RuleEditor', query: { rule: key } });
};

// 处理导入确认
const handleImportConfirmed = async (content: string, file: File) => {
  try {
    const importedData = JSON.parse(content);

    if (typeof importedData !== 'object' || importedData === null) {
      throw new Error('导入的文件格式不正确');
    }

    let rulesData = importedData;
    let tasksData = {};

    // [新增] 兼容新版导出格式：包含 rules 和 tasks
    if (importedData.rules && importedData.tasks) {
      rulesData = importedData.rules;
      tasksData = importedData.tasks;
    }

    // 合并全局任务池
    if (Object.keys(tasksData).length > 0) {
      Object.assign(store.taskConfigSettings, tasksData);
    }

    // 合并导入的数据到现有配置中，重名规则组将被覆盖
    for (const [ruleName, ruleSetting] of Object.entries(rulesData)) {
      if (isValidRuleSetting(ruleSetting)) {
        // [新增] 兼容旧版数据：如果存在 staged_setting，自动提取到全局任务池
        if ((ruleSetting as any).staged_setting) {
          const staged = (ruleSetting as any).staged_setting;
          ruleSetting.task_refs = Object.keys(staged);
          Object.assign(store.taskConfigSettings, staged);
          delete (ruleSetting as any).staged_setting;
        }

        // 确保 task_refs 存在
        if (!ruleSetting.task_refs) {
          ruleSetting.task_refs = [];
        }

        store.asyncAnalyzeSetting[ruleName as string] = ruleSetting;
      } else {
        console.warn(`规则组 "${ruleName}" 格式不正确，跳过导入`);
      }
    }

    await store.saveModelSettings();
    toastr.success(`成功导入配置`);
  } catch (error) {
    console.error('导入配置失败:', error);
    toastr.error(`导入失败: ${(error as Error).message}`);
  }
};

// 验证规则设置格式是否正确
function isValidRuleSetting(setting: any): setting is AsyncAnalyzeSetting[string] {
  return (
    typeof setting === 'object' &&
    setting !== null &&
    typeof setting.comment === 'string' &&
    typeof setting.world_book === 'object' &&
    // 兼容新版的 task_refs 或 旧版的 staged_setting
    (Array.isArray(setting.task_refs) || typeof setting.staged_setting === 'object')
  );
}

// 处理导出数据
const handleExportData = () => {
  try {
    // [修改] 准备导出的数据，同时导出规则组和全局任务池，防止任务丢失
    const exportData = {
      rules: store.asyncAnalyzeSetting,
      tasks: store.taskConfigSettings
    };

    // 转换为 JSON 字符串
    const jsonData = JSON.stringify(exportData, null, 2);

    // 创建下载链接
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `async-analyze-settings-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();

    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出配置失败:', error);
    toastr.error(`导出失败: ${(error as Error).message}`);
  }
};
</script>

<style scoped lang="scss">
.rule-selector {
  padding: 0 4px;
}

.header-actions {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
  align-items: center;

  .input-group {
    display: flex;
    gap: 10px;
    width: 100%;
    max-width: 400px;

    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      outline: none;
      transition: border-color 0.2s;
      color: #111827;
      min-width: 0; /* 防止 flex 子项溢出 */

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
      }
    }

    button {
      white-space: nowrap;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  &.active-card {
    border-color: #6366f1;
    background: #f5f7ff;
    box-shadow: 0 0 0 1px #6366f1;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 10px;
}

.rule-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  .rule-name {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    word-break: break-all;
  }

  .rule-tags {
    display: flex;
    gap: 6px;
  }
}

.rule-comment {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e5e7eb;
  white-space: pre-wrap;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.card-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-pill {
  font-size: 12px;
  background: #e5e7eb;
  color: #4b5563;
  padding: 2px 8px;
  border-radius: 12px;

  &.missing-task {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }
}

.no-task-tip {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

/* Tags */
.tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;

  &.success {
    background: #d1fae5;
    color: #065f46;
  }

  &.info {
    background: #e0f2fe;
    color: #1e40af;
  }
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &.small {
    padding: 4px 10px;
    font-size: 12px;
  }

  &.primary {
    background: #6366f1;
    color: white;
    &:hover {
      background: #4f46e5;
    }
  }

  &.info {
    background: #0ea5e9; /* Sky blue / Cyan */
    color: white;
    &:hover {
      background: #0284c7;
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

  &.danger {
    background: #fee2e2;
    color: #991b1b;
    &:hover {
      background: #fecaca;
    }
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      background: inherit;
      border-color: inherit;
      color: inherit;
    }
  }
}

/* Mobile Adaptation */
@media (max-width: 640px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;

    .input-group {
      max-width: 100%;
    }
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .rule-info {
    width: 100%;
    justify-content: space-between;
  }

  .card-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;

    .btn {
      flex: 1 0 auto; /* 按钮自动填充宽度 */
      min-width: 48px; /* 保证最小点击区域 */
      padding: 8px 12px; /* 增加移动端点击区域 */
    }

    /* 上下移按钮可以稍微窄一点 */
    .btn-move {
      flex: 0 0 auto;
      min-width: 36px;
    }
  }
}

/* Dark Mode Adaption */
.dark-mode {
  .header-actions input {
    background: #374151;
    border-color: #4b5563;
    color: #e2e8f0;
    &:focus {
      border-color: #818cf8;
    }
  }

  .empty-state {
    background: #374151;
    border-color: #4b5563;
    color: #9ca3af;
  }

  .rule-card {
    background: #1f2937;
    border-color: #4b5563;

    &.active-card {
      background: #312e81; /* Dark indigo */
      border-color: #818cf8;
      box-shadow: 0 0 0 1px #818cf8;
    }

    .rule-name {
      color: #e2e8f0;
    }
  }

  .rule-comment {
    color: #9ca3af;
    border-bottom-color: #4b5563;
  }

  .task-pill {
    background: #374151;
    color: #cbd5e1;

    &.missing-task {
      background: #450a0a;
      color: #fca5a5;
      border-color: #7f1d1d;
    }
  }

  .tag.success {
    background: #064e3b;
    color: #a7f3d0;
  }

  .tag.info {
    background: #1e3a8a;
    color: #bfdbfe;
  }

  /* Dark mode for new buttons */
  .btn.info {
    background: #0369a1;
    color: #e0f2fe;
    &:hover {
      background: #075985;
    }
  }

  .btn.secondary {
    background: #374151;
    border-color: #4b5563;
    color: #e2e8f0;
    &:hover {
      background: #4b5563;
    }
  }

  .btn.danger {
    background: #7f1d1d;
    color: #fecaca;
    &:hover {
      background: #991b1b;
    }
  }
}
</style>
