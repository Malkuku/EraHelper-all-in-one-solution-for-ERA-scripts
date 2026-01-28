<template>
  <div class="api-config-container">
    <!-- 左侧：配置列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <button class="btn primary full-width" @click="createNewConfig">
          + 新建配置
        </button>
      </div>

      <div class="config-list">
        <div v-if="Object.keys(store.apiConfigSettings).length === 0" class="empty-tip">
          暂无配置
        </div>

        <div
          v-for="(config, name) in store.apiConfigSettings"
          :key="name"
          class="config-item"
          :class="{ active: currentConfigName === name }"
          @click="selectConfig(name as string)"
        >
          <div class="config-name">{{ name }}</div>
          <div class="config-source">{{ getSourceLabel(config.model_source) }}</div>
        </div>
      </div>
    </div>

    <!-- 右侧：编辑区域 -->
    <div class="main-content">
      <!-- 修改处：这里改为判断 currentConfig 是否存在，而不是 currentConfigName -->
      <div v-if="!currentConfig" class="no-selection">
        <p>请从左侧选择一个配置或新建一个</p>
      </div>

      <div v-else class="editor-panel">
        <div class="panel-header">
          <h4>编辑配置: {{ currentConfigName }}</h4>
          <div class="header-actions">
            <button class="btn danger small" @click="deleteConfig">删除此配置</button>
            <button class="btn primary small" @click="saveChanges">保存所有更改</button>
          </div>
        </div>

        <div class="form-scroll-area">
          <!-- 新增：备注字段 -->
          <div class="form-group">
            <label>备注 (Comment)</label>
            <input v-model="currentConfig.comment" placeholder="在此输入配置说明..." />
          </div>
          <!-- 1. 模型来源选择 -->
          <div class="form-group">
            <label>模型来源</label>
            <SearchableSelect
              v-model="currentConfig.model_source"
              :options="['sample', 'profile', 'external']"
              :option-labels="{ sample: '当前模型 (Sample)', profile: '预设模型 (Profile)', external: '额外模型 (External)' }"
            />
          </div>

          <hr class="divider" />

          <!-- 2. 来源：Profile (预设模型) -->
          <div v-if="currentConfig?.model_source === 'profile'" class="source-settings">
            <div class="form-group">
              <label>选择预设 (Profile)</label>
              <div class="input-with-btn">
                <SearchableSelect
                  v-model="currentConfig.profileSetting"
                  :options="profileList"
                  :placeholder="'请选择...'"
                  style="flex: 1;"
                />
                <button class="btn icon-btn" title="刷新列表" @click="refreshProfileList">↻</button>
              </div>
            </div>
          </div>

          <!-- 3. 来源：Sample (当前模型) -->
          <div v-if="currentConfig?.model_source === 'sample'" class="source-settings">
            <div class="form-group">
              <label>使用的预设 (Preset)</label>
              <div class="input-with-btn">
                <SearchableSelect
                  v-model="currentConfig.simple_preset_name"
                  :options="presetList"
                  :placeholder="'请选择...'"
                  style="flex: 1;"
                />
                <button class="btn icon-btn" @click="refreshPresetList" title="刷新列表">↻</button>
              </div>
            </div>
          </div>

          <!-- 4. 来源：External (额外模型) -->
          <div v-if="currentConfig?.model_source === 'external'" class="source-settings">
            <div class="tip-card">
              ⚠️ 导出角色卡时，注意清除API密钥，否则将会泄露您的密钥。
            </div>

            <div class="form-group">
              <label>接口地址 (Base URL)</label>
              <input v-model="currentConfig.custom_model_settings.baseURL" placeholder="https://api.openai.com/v1" />
            </div>

            <div class="form-group">
              <label>API 密钥</label>
              <input
                v-model="currentConfig.custom_model_settings.apiKey"
                type="password"
                placeholder="sk-..."
              />
            </div>

            <div class="form-group">
              <label>模型名称</label>
              <div class="input-with-btn">
                <SearchableSelect
                  v-model="currentConfig.custom_model_settings.modelName"
                  :options="remoteModelList.concat(currentConfig.custom_model_settings?.modelName && !remoteModelList.includes(currentConfig.custom_model_settings.modelName) ? [currentConfig.custom_model_settings.modelName] : [])"
                  :placeholder="'选择或输入...'"
                  style="flex:1"
                />
                <button class="btn small" @click="getRemoteModels">获取列表</button>
              </div>
            </div>

            <div class="form-group">
              <label>使用的预设 (Preset)</label>
              <div class="input-with-btn">
                <SearchableSelect
                  v-model="currentConfig.custom_model_settings.presetName"
                  :options="presetList"
                  style="flex: 1;"
                />
                <button class="btn icon-btn" @click="refreshPresetList" title="刷新列表">↻</button>
              </div>
            </div>

            <div class="row-group">
              <div class="form-group half">
                <label>温度 (Temperature)</label>
                <input
                  v-model.number="currentConfig.custom_model_settings.temperature"
                  type="number" step="0.1" min="0" max="2"
                />
              </div>
              <div class="form-group half">
                <label>最大 Token (Max Tokens)</label>
                <input
                  v-model.number="currentConfig.custom_model_settings.maxTokens"
                  type="number" min="1"
                />
              </div>
            </div>
          </div>

          <hr class="divider" />

          <!-- 测试连接区域 -->
          <div class="test-area">
            <button class="btn" @click="testConnection">⚡ 测试连接 / 检查模型</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAsyncAnalyzeStore } from '@/ERA助手/stores/AsyncAnalyzeStore';
import { eraLogger } from '@/ERA助手/utils/EraHelperLogger';
// [新增] 引入组件
import SearchableSelect from '../Dialog/SearchableSelect.vue';

const store = useAsyncAnalyzeStore();
const currentConfigName = ref<string>('');

// 列表数据缓存
const profileList = ref<string[]>([]);
const presetList = ref<string[]>([]);
const remoteModelList = ref<string[]>([]);

// 计算属性：获取当前正在编辑的配置对象
const currentConfig = computed(() => {
  if (!currentConfigName.value) return null;
  return store.apiConfigSettings[currentConfigName.value];
});

// 辅助：显示来源名称
const getSourceLabel = (source: string) => {
  const map: Record<string, string> = {
    sample: '当前模型',
    profile: '预设模型',
    external: '额外API'
  };
  return map[source] || source;
};

// 动作：选择配置
const selectConfig = (name: string) => {
  currentConfigName.value = name;
  // 切换时尝试加载一次列表，避免下拉框为空
  if (presetList.value.length === 0) refreshPresetList();
  if (profileList.value.length === 0) refreshProfileList();
};

// 动作：新建配置
const createNewConfig = () => {
  const name = prompt('请输入新配置的名称');
  if (!name) return;
  if (store.apiConfigSettings[name]) {
    toastr.error('该名称已存在');
    return;
  }

  // 初始化默认结构
  store.apiConfigSettings[name] = {
    comment: '',
    model_source: 'sample',
    simple_preset_name: '',
    profileSetting: '',
    custom_model_settings: {
      baseURL: '',
      apiKey: '',
      modelName: '',
      temperature: 1.0,
      maxTokens: 50000,
      presetName: 'in_use'
    }
  };

  selectConfig(name);
  toastr.success('配置已创建');
};

// 动作：删除配置
const deleteConfig = () => {
  if (!currentConfigName.value) return;
  if (!confirm(`确定要删除配置 "${currentConfigName.value}" 吗？`)) return;

  delete store.apiConfigSettings[currentConfigName.value];
  currentConfigName.value = '';
  store.saveModelSettings();
};

// 动作：保存
const saveChanges = async () => {
  await store.saveModelSettings();
  toastr.success('所有配置已保存到变量');
};

// 获取预设列表
const refreshPresetList = async () => {
  try {
    const list = (window as any).getPresetNames ? (window as any).getPresetNames() : [];
    presetList.value = list;
    eraLogger.log('预设列表已更新', list);
  } catch (e) {
    console.error(e);
    toastr.error('获取预设列表失败');
  }
};

// 获取 Profile 列表
const refreshProfileList = async () => {
  try {
    const result = await (window as any).SillyTavern.executeSlashCommands('/profile-list');
    profileList.value = JSON.parse(result.pipe);
  } catch (e) {
    console.error(e);
    toastr.error('获取 Profile 列表失败');
  }
};

// 获取远程模型列表 (External)
const getRemoteModels = async () => {
  const cfg = currentConfig.value?.custom_model_settings;
  if (!cfg || !cfg.baseURL || !cfg.apiKey) {
    toastr.warning('请先填写接口地址与 API 密钥');
    return;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(`${cfg.baseURL.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cfg.apiKey.trim()}` },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(res.statusText);

    const body = await res.json();
    // 兼容 OpenAI 格式 { data: [{id: ...}] }
    remoteModelList.value = (body.data || []).map((m: any) => m.id).sort();
    toastr.success(`获取到 ${remoteModelList.value.length} 个模型`);
  } catch (e: any) {
    clearTimeout(timer);
    toastr.error(`获取模型失败: ${e.message}`);
  }
};

// 测试连接
const testConnection = async () => {
  const config = currentConfig.value;
  if (!config) return;

  /* 1. 内置模型（sample / profile）*/
  if (config.model_source === 'sample' || config.model_source === 'profile') {
    try {
      let tempProfileSetting;
      if (config.model_source === 'profile') {
        tempProfileSetting = ((await (window as any).SillyTavern.executeSlashCommands('/profile')) as any).pipe;
        eraLogger.log('当前预设名称:', tempProfileSetting);
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${config.profileSetting}`);
      }
      // 用 ST 自带指令检查当前模型是否在线
      const res = await (window as any).SillyTavern.executeSlashCommands('/model');
      if (!res.error) {
        toastr.success('模型连接正常 ✓');
        if (config.model_source === 'profile') {
          await (window as any).SillyTavern.executeSlashCommands(`/profile ${tempProfileSetting}`);
        }
      } else {
        toastr.error(`模型异常：${res.error}`);
      }
    } catch (e: any) {
      toastr.error(`检测失败：${e.message || '未知错误'}`);
    }
    return;
  }

  // 2. External 模式
  if (config.model_source === 'external') {
    const cfg = config.custom_model_settings;
    if (!cfg.baseURL || !cfg.apiKey) {
      toastr.warning('请填写完整信息');
      return;
    }

    // 简单的连通性测试
    try {
      const res = await fetch(`${cfg.baseURL.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${cfg.apiKey.trim()}` }
      });
      if (res.ok) {
        toastr.success('API 连接成功');
      } else {
        toastr.error(`API 连接失败: ${res.status}`);
      }
    } catch (e: any) {
      toastr.error(`网络错误: ${e.message}`);
    }
  }
};

onMounted(() => {
  refreshPresetList();
});
</script>

<style scoped lang="scss">
.api-config-container {
  display: flex;
  height: 100%; /* 填满父容器 */
  min-height: 500px;
  gap: 16px;
  overflow: hidden;
}

/* 左侧边栏 */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  padding-right: 10px;
}

.sidebar-header {
  margin-bottom: 10px;
}

.config-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-item {
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  background: #f9fafb;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  &.active {
    background: #e0e7ff;
    border-color: #6366f1;
    .config-name { color: #4338ca; font-weight: 600; }
  }
}

.config-name {
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-source {
  font-size: 11px;
  color: #6b7280;
}

.empty-tip {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  margin-top: 20px;
}

/* 右侧主内容 */
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

.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;

  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.form-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #000000 !important;
  }

  input, select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    /* 强制覆盖浏览器默认背景和颜色 */
    background: #fff !important;
    color: #000000 !important;

    &:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }
  }
}

.row-group {
  display: flex;
  gap: 12px;
  .half { flex: 1; }
}

.input-with-btn {
  display: flex;
  gap: 8px;

  select, input {
    flex: 1;
  }
}

.divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 20px 0;
}

.tip-card {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #b45309;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 16px;
}

.test-area {
  margin-top: 10px;
  padding-top: 10px;
}

/* 按钮通用 */
.btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;

  &:hover { background: #f3f4f6; }

  &.primary {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
    &:hover { background: #4f46e5; }
  }

  &.danger {
    background: #fee2e2;
    color: #991b1b;
    border-color: #fecaca;
    &:hover { background: #fecaca; }
  }

  &.full-width { width: 100%; }

  &.small { padding: 4px 8px; font-size: 12px; }

  &.icon-btn {
    padding: 0 10px;
    font-size: 16px;
    line-height: 1;
  }
}

/* Dark Mode */
:global(.dark-mode) {
  .sidebar { border-right-color: #4b5563; }

  .config-item {
    background: #374151;
    color: #e2e8f0;
    &:hover { background: #4b5563; }
    &.active {
      background: #312e81;
      border-color: #818cf8;
      .config-name { color: #e0e7ff; }
    }
  }

  .config-name { color: #e2e8f0; }
  .config-source { color: #9ca3af; }

  .no-selection { border-color: #4b5563; color: #6b7280; }

  .panel-header { border-bottom-color: #4b5563; h4 { color: #e2e8f0; } }

  .form-group {
    label { color: #cbd5e1; }
    input, select {
      /* 强制覆盖深色模式下的背景和颜色 */
      background: #374151 !important;
      border-color: #4b5563;
      color: #e2e8f0 !important;
      &:focus { border-color: #818cf8; }
    }
  }

  .divider { border-top-color: #4b5563; }

  .tip-card {
    background: #451a03;
    border-color: #92400e;
    color: #fcd34d;
  }

  .btn {
    background: #374151;
    border-color: #4b5563;
    color: #e2e8f0;
    &:hover { background: #4b5563; }

    &.primary {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #fff;
    }

    &.danger {
      background: #7f1d1d;
      border-color: #991b1b;
      color: #fecaca;
    }
  }
}
</style>

