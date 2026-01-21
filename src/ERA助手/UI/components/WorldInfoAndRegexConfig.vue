<template>
  <div class="config-container" :class="{ 'dark-mode': uiStore.darkMode }">
    <!-- 世界书配置部分 -->
    <div class="collapsible-section">
      <div class="section-header" @click="toggleWorldInfoSection">
        <h4>世界书配置</h4>
      </div>
      <div v-show="isWorldInfoOpen" class="section-content">
        <div class="world-info-config">
          <div class="config-section">
            <div class="subsection-header" @click="toggleAnalyzeList">
              <h5>AnalyzeList</h5>
              <span class="toggle-icon">{{ isAnalyzeListOpen ? '−' : '+' }}</span>
            </div>
            <div v-show="isAnalyzeListOpen" class="entry-list">
              <div v-for="(entry, index) in localAnalyzeEntries" :key="index" class="entry-item">
                <select v-model="localAnalyzeEntries[index]" class="entry-select">
                  <option value="">请选择世界书条目</option>
                  <option v-for="name in worldBookNames" :key="name" :value="name">{{ name }}</option>
                </select>
                <button class="btn remove-btn" @click="removeAnalyzeEntry(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addAnalyzeEntry">添加条目</button>
            </div>
          </div>

          <div class="config-section">
            <div class="subsection-header" @click="toggleUpdateList">
              <h5>UpdateList</h5>
              <span class="toggle-icon">{{ isUpdateListOpen ? '−' : '+' }}</span>
            </div>
            <div v-show="isUpdateListOpen" class="entry-list">
              <div v-for="(entry, index) in localUpdateEntries" :key="index" class="entry-item">
                <select v-model="localUpdateEntries[index]" class="entry-select">
                  <option value="">请选择世界书条目</option>
                  <option v-for="name in worldBookNames" :key="name" :value="name">{{ name }}</option>
                </select>
                <button class="btn remove-btn" @click="removeUpdateEntry(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addUpdateEntry">添加条目</button>
            </div>
          </div>

          <div class="config-section">
            <div class="subsection-header" @click="toggleIgnoreList">
              <h5>IgnoreList</h5>
              <span class="toggle-icon">{{ isIgnoreListOpen ? '−' : '+' }}</span>
            </div>
            <div v-show="isIgnoreListOpen" class="entry-list">
              <div v-for="(entry, index) in localIgnoreEntries" :key="index" class="entry-item">
                <select v-model="localIgnoreEntries[index]" class="entry-select">
                  <option value="">请选择世界书条目</option>
                  <option v-for="name in worldBookNames" :key="name" :value="name">{{ name }}</option>
                </select>
                <button class="btn remove-btn" @click="removeIgnoreEntry(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addIgnoreEntry">添加条目</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 正则表达式配置部分 -->
    <div class="collapsible-section">
      <div class="section-header" @click="toggleRegexSection">
        <h4>正则表达式配置</h4>
        <span class="toggle-icon">{{ isRegexOpen ? '−' : '+' }}</span>
      </div>
      <div v-show="isRegexOpen" class="section-content">
        <div class="regex-config">
          <div class="config-section">
            <div class="subsection-header" @click="toggleRegexList">
              <h5>正则表达式列表</h5>
              <span class="toggle-icon">{{ isRegexListOpen ? '−' : '+' }}</span>
            </div>
            <div v-show="isRegexListOpen" class="entry-list">
              <div v-for="(regex, index) in localRegexList" :key="index" class="entry-item">
                <input v-model="localRegexList[index]" type="text" class="regex-input" placeholder="请输入正则表达式" />
                <button class="btn remove-btn" @click="removeRegex(index)">×</button>
              </div>
              <button class="btn add-btn" @click="addRegex">添加正则</button>
            </div>
            <h6>（请不要导入来源未知的json，以避免遭到恶意攻击）</h6>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn primary" @click="refreshWorldBooks">刷新世界书列表</button>
      <button class="btn danger" @click="handleClear">清空配置</button>
      <FileImportExport
        import-text="导入配置"
        export-text="导出配置"
        confirm-title="导入配置确认"
        confirm-content="导入新配置将覆盖当前配置，确定要继续吗？"
        @import-confirmed="handleImport"
        @export-data="handleExport"
      />
      <button class="btn primary" @click="handleSave">保存配置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as toastr from 'toastr';
import { useAsyncAnalyzeStore } from '../../stores/AsyncAnalyzeStore';
import { storeToRefs } from 'pinia';
import { WorldInfoUtil } from '../../../Utils/WorldInfoUtil';
import FileImportExport from './File/FileImportExport.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

const asyncAnalyzeStore = useAsyncAnalyzeStore();
const { analyzeRores, updateRores, ignoreRores, regexList } = storeToRefs(asyncAnalyzeStore);

// 可展开/收起状态
const isWorldInfoOpen = ref(false);
const isRegexOpen = ref(false);
const isAnalyzeListOpen = ref(false);
const isUpdateListOpen = ref(false);
const isIgnoreListOpen = ref(false);
const isRegexListOpen = ref(false);

// 本地数据副本
const localAnalyzeEntries = ref<string[]>([]);
const localUpdateEntries = ref<string[]>([]);
const localIgnoreEntries = ref<string[]>([]);
const localRegexList = ref<string[]>([]);

// 世界书名称列表
const worldBookNames = ref<string[]>([]);

// 切换世界书配置区域展开/收起
const toggleWorldInfoSection = () => {
  isWorldInfoOpen.value = !isWorldInfoOpen.value;
};

// 切换正则配置区域展开/收起
const toggleRegexSection = () => {
  isRegexOpen.value = !isRegexOpen.value;
};

// 切换子列表展开/收起
const toggleAnalyzeList = () => {
  isAnalyzeListOpen.value = !isAnalyzeListOpen.value;
};

const toggleUpdateList = () => {
  isUpdateListOpen.value = !isUpdateListOpen.value;
};

const toggleIgnoreList = () => {
  isIgnoreListOpen.value = !isIgnoreListOpen.value;
};

const toggleRegexList = () => {
  isRegexListOpen.value = !isRegexListOpen.value;
};

// 获取世界书名称列表
const loadWorldBookNames = async () => {
  try {
    worldBookNames.value = await WorldInfoUtil.getAllWorldBookNames();
  } catch (error) {
    console.error('获取世界书名称失败:', error);
    toastr.error('获取世界书名称失败');
  }
};

// 刷新世界书列表
const refreshWorldBooks = async () => {
  await loadWorldBookNames();
  toastr.info('世界书列表已刷新');
};

// 添加世界书条目
const addAnalyzeEntry = () => {
  localAnalyzeEntries.value.push('');
};

const addUpdateEntry = () => {
  localUpdateEntries.value.push('');
};

const addIgnoreEntry = () => {
  localIgnoreEntries.value.push('');
};

// 删除世界书条目
const removeAnalyzeEntry = (index: number) => {
  localAnalyzeEntries.value.splice(index, 1);
};

const removeUpdateEntry = (index: number) => {
  localUpdateEntries.value.splice(index, 1);
};

const removeIgnoreEntry = (index: number) => {
  localIgnoreEntries.value.splice(index, 1);
};

// 正则表达式操作
const addRegex = () => {
  localRegexList.value.push(
    '<(variable(?:insert|edit|delete))>\\s*(?=[\\s\\S]*?\\S[\\s\\S]*?</\\1>)((?:(?!<(?:era_data|variable(?:think|insert|edit|delete))>|</\\1>)[\\s\\S])*?)\\s*</\\1>',
  );
};

const removeRegex = (index: number) => {
  localRegexList.value.splice(index, 1);
};

// 保存配置
const handleSave = async () => {
  // 更新 store 中的值
  analyzeRores.value = [...localAnalyzeEntries.value];
  updateRores.value = [...localUpdateEntries.value];
  ignoreRores.value = [...localIgnoreEntries.value];
  regexList.value = [...localRegexList.value];

  await asyncAnalyzeStore.saveWorldInfoFilterConfig();
  await asyncAnalyzeStore.saveRegexConfig();

  toastr.success('配置已保存');
};

// 清空配置
const handleClear = async () => {
  if (confirm('确定要清空所有配置吗？')) {
    localAnalyzeEntries.value = [];
    localUpdateEntries.value = [];
    localIgnoreEntries.value = [];
    localRegexList.value = [];

    await asyncAnalyzeStore.clearWorldInfoFilterConfig();
    await asyncAnalyzeStore.clearRegexConfig();

    toastr.info('配置已清空');
  }
};

// 导出配置
const handleExport = () => {
  try {
    // 创建要导出的数据对象
    const exportData = {
      analyzeEntries: localAnalyzeEntries.value,
      updateEntries: localUpdateEntries.value,
      ignoreEntries: localIgnoreEntries.value,
      regexList: localRegexList.value.map(regex => {
        // 保持正则表达式原样，避免双重转义
        return regex;
      }),
    };

    // 创建 Blob 对象
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worldinfo-regex-config-${new Date().toISOString().slice(0, 10)}.json`;

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理 URL 对象
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出配置失败:', error);
    toastr.error('导出配置失败');
  }
};

// 导入配置
const handleImport = (content: string) => {
  try {
    const importedData = JSON.parse(content);

    // 验证导入的数据结构
    if (typeof importedData !== 'object' || importedData === null) {
      toastr.error('无效的配置文件格式');
      return;
    }

    // 更新本地数据
    if (Array.isArray(importedData.analyzeEntries)) {
      localAnalyzeEntries.value = [...importedData.analyzeEntries];
    }

    if (Array.isArray(importedData.updateEntries)) {
      localUpdateEntries.value = [...importedData.updateEntries];
    }

    if (Array.isArray(importedData.ignoreEntries)) {
      localIgnoreEntries.value = [...importedData.ignoreEntries];
    }

    if (Array.isArray(importedData.regexList)) {
      // 导入时保持数据原样，不需要额外处理
      localRegexList.value = [...importedData.regexList];
    }

    toastr.success('配置导入成功');
  } catch (error) {
    console.error('导入配置失败:', error);
    toastr.error('导入配置失败: ' + (error instanceof Error ? error.message : '无效的配置文件'));
  }
};

// 初始化数据
onMounted(async () => {
  // 加载世界书名称
  await loadWorldBookNames();

  // 从 store 初始化本地值
  localAnalyzeEntries.value = [...analyzeRores.value];
  localUpdateEntries.value = [...updateRores.value];
  localIgnoreEntries.value = [...ignoreRores.value];
  localRegexList.value = [...regexList.value];
});

// 监听store变化并同步到本地
watch(
  () => [
    // 监听 store 中的值变化
    analyzeRores.value,
    updateRores.value,
    ignoreRores.value,
    regexList.value,
  ],
  () => {
    // 同步 store 值到本地
    localAnalyzeEntries.value = [...analyzeRores.value];
    localUpdateEntries.value = [...updateRores.value];
    localIgnoreEntries.value = [...ignoreRores.value];
    localRegexList.value = [...regexList.value];
  },
);
</script>

<style scoped lang="scss">
.config-container {
  margin-top: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.collapsible-section {
  margin-bottom: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  color: #111827;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  display: flex;
  align-items: center;

  &:hover {
    background: #e5e7eb;
  }
}

.refresh-icon {
  font-size: 14px;
}

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  color: #4b5563;
}

.toggle-icon {
  font-size: 18px;
  font-weight: bold;
}

.section-content {
  padding: 12px;
  background: #f9fafb;
}

.config-section {
  margin-bottom: 15px;

  &:last-child {
    margin-bottom: 0;
  }

  h5 {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #4b5563;
  }
}

.entry-list {
  .entry-item {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;

    &:last-child {
      margin-bottom: 10px;
    }
  }

  .entry-select,
  .regex-input {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;

    /* 强制浅色模式 (白天) */
    background: #ffffff !important;
    color: #111827 !important;
  }

  /* 确保 option 也是浅色 */
  .entry-select option {
    background: #ffffff !important;
    color: #111827 !important;
  }

  .regex-input {
    font-weight: 600; // 加深字体
  }

  .btn {
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;

    &.add-btn {
      background: #6366f1;
      color: white;

      &:hover {
        background: #4f46e5;
      }
    }

    &.remove-btn {
      background: #ef4444;
      color: white;
      width: 24px;
      padding: 0;

      &:hover {
        background: #dc2626;
      }
    }
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 15px;

  .btn {
    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    background: #f3f4f6;
    color: #111827;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 3px;

    &.primary {
      background: #4f46e5;
      color: #ffffff;
      font-weight: 500;

      &:hover:not(:disabled) {
        background: #4338ca;
        color: #ffffff;
      }
    }

    &.danger {
      background: #ef4444;
      color: white;

      &:hover:not(:disabled) {
        background: #dc2626;
      }
    }

    &:hover:not(.disabled) {
      background: #e5e7eb;
      color: #000000;
    }

    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

/* 黑夜模式 */
.dark-mode {
  .config-container {
    background: #1f2937;
    color: #e2e8f0;
  }

  .collapsible-section {
    border: 1px solid #4b5563;
  }

  .section-header {
    background: #374151;
    color: #e2e8f0;
    border-color: #4b5563;
  }

  .subsection-header {
    color: #cbd5e1;
  }

  .section-content {
    background: #374151;
  }

  .config-section {
    h5 {
      color: #cbd5e1;
    }
  }

  .entry-list {
    .entry-select,
    .regex-input {
      /* 强制深色模式 */
      background: #374151 !important;
      color: #e2e8f0 !important;
      border-color: #4b5563 !important;
    }

    /* 确保 option 也是深色 */
    .entry-select option {
      background: #374151 !important;
      color: #e2e8f0 !important;
    }

    .btn {
      &.add-btn {
        background: #4f46e5;
        color: #f8fafc;

        &:hover {
          background: #6366f1;
        }
      }

      &.remove-btn {
        background: #dc2626;
        color: #f8fafc;

        &:hover {
          background: #ef4444;
        }
      }
    }
  }

  .actions {
    .btn {
      background: #4b5563;
      color: #e2e8f0;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);

      &:hover:not(.disabled) {
        background: #6b7280;
        color: #f8fafc;
      }

      &.primary {
        background: #4f46e5;
        color: #f8fafc;

        &:hover:not(:disabled) {
          background: #6366f1;
          color: #f8fafc;
        }
      }

      &.danger {
        background: #dc2626;
        color: #f8fafc;

        &:hover:not(:disabled) {
          background: #ef4444;
        }
      }
    }
  }
}
</style>
