<template>
  <div class="rule-selector">
    <div class="header-actions">
      <div class="input-group">
        <input
          v-model="newRuleName"
          placeholder="输入新规则组名称..."
          @keyup.enter="createNewRule"
        />
        <button class="btn primary small" @click="createNewRule">新建规则组</button>
      </div>

      <FileImportExport
        accept=".json"
        import-text="导入配置"
        export-text="导出配置"
        confirm-title="导入配置确认"
        confirm-content="导入新配置将合并到当前配置中，重名规则组将被覆盖，确定要继续吗？"
        @import-confirmed="handleImportConfirmed"
        @export-data="handleExportData"
      />
    </div>

    <div v-if="Object.keys(store.asyncAnalyzeSetting).length === 0" class="empty-state">
      暂无规则配置，请新建一个。
    </div>

    <div class="rule-list">
      <div
        v-for="(setting, key) in store.asyncAnalyzeSetting"
        :key="key"
        class="rule-card"
        :class="{ 'active-card': store.activeRuleName === key }"
      >
        <div class="card-header">
          <div class="rule-info">
            <span class="rule-name">{{ key }}</span>
            <span v-if="store.activeRuleName === key" class="tag success">当前启用</span>
            <!-- 兼容旧数据，使用 || {} -->
            <span class="tag info">{{ Object.keys(setting.staged_setting || {}).length }} 个任务</span>
          </div>
          <div class="card-actions">
            <button
              v-if="store.activeRuleName !== key"
              class="btn small primary"
              @click="activateRule(key as string)"
            >
              启用
            </button>
            <button
              class="btn small"
              @click="editRule(key as string)"
            >
              编辑
            </button>
            <button
              class="btn small danger"
              @click="deleteRule(key as string)"
            >
              删除
            </button>
          </div>
        </div>

        <!-- 显示规则注释 -->
        <div v-if="setting.comment" class="rule-comment">
          {{ setting.comment }}
        </div>

        <div class="card-preview">
          <!-- 简单预览该规则组下的任务名称 -->
          <span v-for="(task, taskName) in (setting.staged_setting || {})" :key="taskName" class="task-pill">
            {{ taskName }}
          </span>
          <span v-if="Object.keys(setting.staged_setting || {}).length === 0" class="no-task-tip">暂无任务</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAsyncAnalyzeStore } from '@/ERA助手/stores/AsyncAnalyzeStore';
import { AsyncAnalyzeSetting } from '@/ERA助手/AsyncAnalyze/types/AsyncAnalyzeSetting';

const store = useAsyncAnalyzeStore();
const router = useRouter();
const newRuleName = ref('');

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

  // 初始化新结构：包含注释、分步设置、全局世界书配置
  store.asyncAnalyzeSetting[name] = {
    comment: '',
    staged_setting: {},
    world_book: {}
  };
  newRuleName.value = '';

  // 如果是第一个，自动激活
  if (!store.activeRuleName) {
    store.activeRuleName = name;
  }

  await store.saveModelSettings();
  toastr.success(`规则组 "${name}" 已创建`);
};

// 激活规则
const activateRule = async (key: string) => {
  store.activeRuleName = key;
  await store.saveModelSettings();
  toastr.success(`已启用规则组: ${key}`);
};

// 删除规则
const deleteRule = async (key: string) => {
  if (!confirm(`确定要删除规则组 "${key}" 吗？此操作不可恢复。`)) return;

  delete store.asyncAnalyzeSetting[key];

  // 如果删除的是当前激活的，重置激活状态
  if (store.activeRuleName === key) {
    store.activeRuleName = '';
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

    // 检查导入的数据格式是否正确
    if (typeof importedData !== 'object' || importedData === null) {
      throw new Error('导入的文件格式不正确');
    }

    // 合并导入的数据到现有配置中，重名规则组将被覆盖
    for (const [ruleName, ruleSetting] of Object.entries(importedData)) {
      // 确保导入的规则符合 AsyncAnalyzeSetting 格式
      if (isValidRuleSetting(ruleSetting)) {
        store.asyncAnalyzeSetting[ruleName as string] = ruleSetting;
      } else {
        console.warn(`规则组 "${ruleName}" 格式不正确，跳过导入`);
      }
    }

    await store.saveModelSettings();
    toastr.success(`成功导入 ${Object.keys(importedData).length} 个规则组配置`);
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
    typeof setting.staged_setting === 'object' &&
    typeof setting.world_book === 'object'
  );
}

// 处理导出数据
const handleExportData = () => {
  try {
    // 准备导出的数据
    const exportData = { ...store.asyncAnalyzeSetting };

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

  .input-group {
    display: flex;
    gap: 10px;
    max-width: 400px;

    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
      }
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
}

.rule-comment {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e5e7eb;
  white-space: pre-wrap;
}

.rule-info {
  display: flex;
  align-items: center;
  gap: 10px;

  .rule-name {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }
}

.card-actions {
  display: flex;
  gap: 8px;
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

  &.small {
    padding: 4px 10px;
    font-size: 12px;
  }

  &.primary {
    background: #6366f1;
    color: white;
    &:hover { background: #4f46e5; }
  }

  &.danger {
    background: #fee2e2;
    color: #991b1b;
    &:hover { background: #fecaca; }
  }
}

/* Dark Mode Adaption */
:global(.dark-mode) {
  .header-actions input {
    background: #374151;
    border-color: #4b5563;
    color: #e2e8f0;
    &:focus { border-color: #818cf8; }
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

    .rule-name { color: #e2e8f0; }
  }

  .rule-comment {
    color: #9ca3af;
    border-bottom-color: #4b5563;
  }

  .task-pill {
    background: #374151;
    color: #cbd5e1;
  }

  .tag.success {
    background: #064e3b;
    color: #a7f3d0;
  }

  .tag.info {
    background: #1e3a8a;
    color: #bfdbfe;
  }

  .btn.danger {
    background: #7f1d1d;
    color: #fecaca;
    &:hover { background: #991b1b; }
  }
}
</style>
