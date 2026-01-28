import { defineStore } from 'pinia';
import { ref } from 'vue';
import { eraLogger } from '../utils/EraHelperLogger';
import { AsyncAnalyzeSetting, ApiConfigSetting } from '@/ERA助手/AsyncAnalyze/types/AsyncAnalyzeSetting';

// 定义正则配置的类型接口
export interface SavedRegexConfig {
  id: string;      // 唯一标识
  name: string;    // 规则名称
  pattern: string; // 正则表达式
  flags: string;   // 修饰符
  note?: string;   // 备注（可选）
}

export const useAsyncAnalyzeStore = defineStore('KatAsyncAnalyze', () => {
  // 所有的规则集合
  const asyncAnalyzeSetting = ref<AsyncAnalyzeSetting>({});
  // 所有的API配置集合
  const apiConfigSettings = ref<ApiConfigSetting>({});
  // 当前激活的规则名称
  const activeRuleName = ref<string>('');

  // [新增] 保存的正则配置列表
  const savedRegexConfigs = ref<SavedRegexConfig[]>([]);

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

    // [新增] 读取正则配置
    if (variables.saved_regex_configs) {
      // 确保读取的是数组
      savedRegexConfigs.value = Array.isArray(variables.saved_regex_configs)
        ? variables.saved_regex_configs
        : [];
    }

    eraLogger.log('获取分步分析设置完成');
  };

  /**
   * 保存模型设置
   */
  const saveModelSettings = async () => {
    const saveVariables = {
      async_analyze_setting: asyncAnalyzeSetting.value,
      api_config_settings: apiConfigSettings.value,
      active_rule_name: activeRuleName.value,
      // [新增] 保存正则配置
      saved_regex_configs: savedRegexConfigs.value
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
    await saveModelSettings();
  };

  return {
    asyncAnalyzeSetting,
    apiConfigSettings,
    activeRuleName,
    savedRegexConfigs,
    getModelSettings,
    saveModelSettings,
    clearModelSettings,
  };
});
