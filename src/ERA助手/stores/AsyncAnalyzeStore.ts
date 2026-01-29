import { defineStore } from 'pinia';
import { ref } from 'vue';
import { eraLogger } from '../utils/EraHelperLogger';
import { AsyncAnalyzeSetting, ApiConfigSetting } from '@/ERA助手/AsyncAnalyze/types/AsyncAnalyzeSetting';

// 定义正则配置的类型接口
export interface SavedRegexConfig {
  id: string;      // 唯一标识 (保留，用于列表管理)
  name: string;    // 规则名称
  regex: string;   // 完整的正则字符串 (例如: "/abc/gi")
  note?: string;   // 备注
}

//备份状态接口
export interface AnalyzeBackupState {
  ruleName: string;       // 备份时的规则名
  messageId: number;      // 触发时的楼层
  timestamp: number;      // 备份时间戳
  triggerHistory: {       // 任务触发历史快照
    [taskName: string]: number
  };
  worldBookData: {        // 世界书内容快照 key="bookName:loreName"
    [compositeKey: string]: string | null
  };
  messageData: {          // 消息内容快照
    [msgId: number]: string
  };
}

export const useAsyncAnalyzeStore = defineStore('KatAsyncAnalyze', () => {
  // 所有的规则集合
  const asyncAnalyzeSetting = ref<AsyncAnalyzeSetting>({});
  // 所有的API配置集合
  const apiConfigSettings = ref<ApiConfigSetting>({});
  // 当前激活的规则名称
  const activeRuleName = ref<string>('');

  // 保存的正则配置列表
  const savedRegexConfigs = ref<SavedRegexConfig[]>([]);

  // [新增] 备份状态，用于回滚
  const savedBackupState = ref<AnalyzeBackupState | null>(null);

  /**
   * 尝试从变量中获取模型设置
   */
  const getModelSettings = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });

    if (variables.async_analyze_setting) {
      asyncAnalyzeSetting.value = variables.async_analyze_setting;
    }
    if (variables.api_config_settings) {
      apiConfigSettings.value = variables.api_config_settings;
    }
    if (variables.active_rule_name) {
      activeRuleName.value = variables.active_rule_name;
    }

    // 读取正则配置
    if (variables.saved_regex_configs) {
      savedRegexConfigs.value = Array.isArray(variables.saved_regex_configs)
        ? variables.saved_regex_configs
        : [];
    }

    // [新增] 读取备份状态
    if (variables.saved_analyze_backup) {
      savedBackupState.value = variables.saved_analyze_backup;
    }

    eraLogger.log('获取分步分析设置完成', asyncAnalyzeSetting.value);
  };

  /**
   * 保存模型设置
   */
  const saveModelSettings = async () => {
    const saveVariables = {
      async_analyze_setting: asyncAnalyzeSetting.value,
      api_config_settings: apiConfigSettings.value,
      active_rule_name: activeRuleName.value,
      saved_regex_configs: savedRegexConfigs.value,
      // [新增] 保存备份状态
      saved_analyze_backup: savedBackupState.value
    };

    const cleaned = JSON.parse(JSON.stringify(saveVariables));

    updateVariablesWith(
      vars => ({
        ...vars,
        ...cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };

  /**
   * 清空模型设置
   */
  const clearModelSettings = async () => {
    asyncAnalyzeSetting.value = {};
    apiConfigSettings.value = {};
    activeRuleName.value = '';
    savedRegexConfigs.value = [];
    savedBackupState.value = null;
    await saveModelSettings();
  };

  return {
    asyncAnalyzeSetting,
    apiConfigSettings,
    activeRuleName,
    savedRegexConfigs,
    savedBackupState,
    getModelSettings,
    saveModelSettings,
    clearModelSettings,
  };
});
