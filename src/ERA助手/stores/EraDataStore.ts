import { defineStore } from 'pinia';
import { ref } from 'vue';
import { EraDataRule } from '../EraDataHandler/types/EraDataRule';
import { eraLogger } from '../utils/EraHelperLogger';
import { EraMetaRule } from '@/ERA助手/UI/view/EraDataHandle.vue';


export const useEraDataStore = defineStore('KatEraData', () => {
  // 储存的EraData规则
  const eraDataRule = ref<EraDataRule>({});

  // 储存的EraMeta规则
  const eraMetaRule = ref<EraMetaRule>({
    EditRefuse: {},
    DeleteRefuse: {},
    InsertRefuse: {},
  });

  /**
   * 尝试从变量中获取EraData规则
   */
  const getEraDataRules = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    const era_data_rule = variables.era_data_rule;
    eraDataRule.value = era_data_rule || {};
    eraLogger.log('获取更新规则设置: ', eraDataRule.value);
  };

  /**
   * 尝试从变量中获取EraMeta规则
   */
  const getEraMetaRules = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    const era_meta_rule = variables.era_meta_rule;

    // 确保结构完整
    eraMetaRule.value = era_meta_rule || {
      EditRefuse: {},
      DeleteRefuse: {},
      InsertRefuse: {},
    };
    eraLogger.log('获取元规则设置: ', eraMetaRule.value);
  };

  /**
   * 保存模型设置 (EraDataRule)
   */
  const saveEraDataRules = async () => {
    const saveVariables = eraDataRule.value;
    const cleaned = JSON.parse(JSON.stringify(saveVariables));
    await updateVariablesWith(
      vars => ({
        ...vars,
        era_data_rule: cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };

  /**
   * 保存元规则设置 (EraMetaRule)
   */
  const saveEraMetaRules = async () => {
    const saveVariables = eraMetaRule.value;
    const cleaned = JSON.parse(JSON.stringify(saveVariables));
    await updateVariablesWith(
      vars => ({
        ...vars,
        era_meta_rule: cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };

  /**
   * 清空模型设置
   */
  const clearEraDataRules = async () => {
    eraDataRule.value = {};
    await saveEraDataRules();
  };

  /**
   * 清空元规则设置
   */
  const clearEraMetaRules = async () => {
    eraMetaRule.value = {
      EditRefuse: {},
      DeleteRefuse: {},
      InsertRefuse: {},
    };
    await saveEraMetaRules();
  };

  return {
    eraDataRule,
    eraMetaRule,
    getEraDataRules,
    getEraMetaRules,
    saveEraDataRules,
    saveEraMetaRules,
    clearEraDataRules,
    clearEraMetaRules,
  };
});
