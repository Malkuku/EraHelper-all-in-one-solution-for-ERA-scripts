import { defineStore } from 'pinia';
import { eraLogger } from '../utils/EraHelperLogger';

export const useAsyncAnalyzeStore = defineStore('KatAsyncAnalyze', () => {
  //是否为分布计算
  const isAsync = ref(false);
  //是否为分析模式
  const isUpdateEra = ref(false);
  const modelSource = ref('sample'); //sample | external | profile
  //simple模式下选择的预设设置
  const simplePresetName = ref(getLoadedPresetName());
  //自定义模型设置
  const customModelSettings = ref({
    baseURL: '',
    apiKey: '',
    modelName: '',
    temperature: 0.7,
    //frequencyPenalty: 0,
    //presencePenalty: 0,
    maxTokens: 20000,
    presetName: getLoadedPresetName(),
  });
  //预设模型设置
  const profileSetting = ref('');
  //最大上下文楼层
  const maxMessageFloor = ref(2);
  /**
   * 尝试从变量中获取模型设置
   */
  const getModelSettings = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    const era_api_config = variables.era_api_config;
    if (era_api_config) {
      modelSource.value = era_api_config.modelSource;
      customModelSettings.value = era_api_config.customModelSettings;
      isAsync.value = era_api_config.isAsync;
      profileSetting.value = era_api_config.profileSetting;
      simplePresetName.value = era_api_config.simplePresetName;
      maxMessageFloor.value = era_api_config.maxMessageFloor | 2;
    }
    eraLogger.log('获取异步分析设置: ', era_api_config);
  };
  /**
   * 保存模型设置
   */
  const saveModelSettings = async () => {
    const saveVariables = {
      isAsync: isAsync.value,
      modelSource: modelSource.value,
      customModelSettings: customModelSettings.value,
      profileSetting: profileSetting.value,
      simplePresetName: simplePresetName.value,
      maxMessageFloor: maxMessageFloor.value,
    };
    const cleaned = JSON.parse(JSON.stringify(saveVariables));
    await updateVariablesWith(
      vars => ({
        ...vars,
        era_api_config: cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };

  /**
   * 清空模型设置
   */
  const clearModelSettings = async () => {
    modelSource.value = 'sample';
    simplePresetName.value = getLoadedPresetName();
    customModelSettings.value = {
      baseURL: '',
      apiKey: '',
      modelName: '',
      temperature: 0.7,
      //frequencyPenalty: 0,
      //presencePenalty: 0,
      maxTokens: 20000,
      presetName: getLoadedPresetName(),
    };
    profileSetting.value = '';
    maxMessageFloor.value = 2;
    await saveModelSettings();
  };

  /**
   * 世界书相关数组
   */
  const analyzeRores = ref<string[]>([]);
  const updateRores = ref<string[]>([]);
  const ignoreRores = ref<string[]>([]);
  /**
   * 从变量中获取世界书过滤设置
   */
  const getWorldInfoFilterConfig = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    const era_world_info_filter_config = variables.era_world_info_filter_config;
    if (era_world_info_filter_config) {
      analyzeRores.value = era_world_info_filter_config.analyzeRores;
      updateRores.value = era_world_info_filter_config.updateRores;
      ignoreRores.value = era_world_info_filter_config.ignoreRores;
    }
    eraLogger.log('获取世界书过滤设置: ', era_world_info_filter_config);
  };

  /**
   * 保存世界书设置
   */
  const saveWorldInfoFilterConfig = async () => {
    const saveVariables = {
      analyzeRores: analyzeRores.value,
      updateRores: updateRores.value,
      ignoreRores: ignoreRores.value,
    };
    const cleaned = JSON.parse(JSON.stringify(saveVariables));
    await updateVariablesWith(
      vars => ({
        ...vars,
        era_world_info_filter_config: cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };

  /**
   * 清空世界书设置
   */
  const clearWorldInfoFilterConfig = async () => {
    analyzeRores.value = [];
    updateRores.value = [];
    ignoreRores.value = [];
    await saveWorldInfoFilterConfig();
  };

  /**
   * 生成正则配置相关数组
   */
  const regexList = ref<string[]>([]);
  /**
   * 从变量中获取正则配置
   */
  const getRegexConfig = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    const era_regex_config = variables.era_regex_config;
    if (era_regex_config) {
      regexList.value = era_regex_config.regexList;
    }
    eraLogger.log('获取正则配置: ', era_regex_config);
  };
  /**
   * 保存正则配置
   */
  const saveRegexConfig = async () => {
    const saveVariables = {
      regexList: regexList.value,
    };
    const cleaned = JSON.parse(JSON.stringify(saveVariables));
    await updateVariablesWith(
      vars => ({
        ...vars,
        era_regex_config: cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };
  /**
   * 清空正则配置
   */
  const clearRegexConfig = async () => {
    regexList.value = [];
    await saveRegexConfig();
  };

  return {
    isAsync,
    isUpdateEra,
    modelSource,
    customModelSettings,
    profileSetting,
    simplePresetName,
    maxMessageFloor,
    getModelSettings,
    saveModelSettings,
    clearModelSettings,
    analyzeRores,
    updateRores,
    ignoreRores,
    getWorldInfoFilterConfig,
    saveWorldInfoFilterConfig,
    clearWorldInfoFilterConfig,
    regexList,
    getRegexConfig,
    saveRegexConfig,
    clearRegexConfig,
  };
});
