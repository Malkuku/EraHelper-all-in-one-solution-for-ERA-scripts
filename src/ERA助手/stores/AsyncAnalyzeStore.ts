import { defineStore } from 'pinia';
import { ref } from 'vue';
import { eraLogger } from '../utils/EraHelperLogger';
import { AsyncAnalyzeSetting, ApiConfigSetting } from '@/ERA助手/AsyncAnalyze/types/AsyncAnalyzeSetting';

export const useAsyncAnalyzeStore = defineStore('KatAsyncAnalyze', () => {
  // 所有的规则集合
  const asyncAnalyzeSetting = ref<AsyncAnalyzeSetting>({});
  // 所有的API配置集合
  const apiConfigSettings = ref<ApiConfigSetting>({});
  // 当前激活的规则名称（对应 asyncAnalyzeSetting 的 key）
  const activeRuleName = ref<string>('');

  /**
   * 尝试从变量中获取模型设置
   */
  const getModelSettings = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });

    // 读取规则设置
    if (variables.async_analyze_setting) {
      asyncAnalyzeSetting.value = variables.async_analyze_setting;
    }

    // 读取API配置
    if (variables.api_config_settings) {
      apiConfigSettings.value = variables.api_config_settings;
    }

    // 读取当前激活的规则名
    if (variables.active_rule_name) {
      activeRuleName.value = variables.active_rule_name;
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
      active_rule_name: activeRuleName.value
    };

    // 深拷贝去除响应式
    const cleaned = JSON.parse(JSON.stringify(saveVariables));

    updateVariablesWith(
      vars => ({
        ...vars,
        ...cleaned, // 将所有字段展开写入
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
    await saveModelSettings();
  };

  return {
    asyncAnalyzeSetting,
    apiConfigSettings,
    activeRuleName,
    getModelSettings,
    saveModelSettings,
    clearModelSettings,
  };
});
