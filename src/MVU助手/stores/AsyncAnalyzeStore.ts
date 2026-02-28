// 文件路径: src/MVU助手/stores/AsyncAnalyzeStore.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { eraLogger } from '../utils/MvuHelperLogger';
import { AsyncAnalyzeSetting, ApiConfigSetting, TaskConfigSetting } from '@/MVU助手/AsyncAnalyze/types/AsyncAnalyzeSetting';

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
  // 所有的规则组集合
  const asyncAnalyzeSetting = ref<AsyncAnalyzeSetting>({});
  // [新增] 所有的独立任务(规则)集合
  const taskConfigSettings = ref<TaskConfigSetting>({});
  // 所有的API配置集合
  const apiConfigSettings = ref<ApiConfigSetting>({});
  // 当前激活的规则组名称
  const activeRuleName = ref<string>('');

  // 保存的正则配置列表
  const savedRegexConfigs = ref<SavedRegexConfig[]>([]);

  // 备份状态，用于回滚
  const savedBackupState = ref<AnalyzeBackupState | null>(null);

  /**
   * 尝试从变量中获取模型设置
   */
  const getModelSettings = async () => {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });

    // [新增] 兼容旧版本数据结构的迁移逻辑
    if (variables.async_analyze_setting) {
      const loadedSettings = variables.async_analyze_setting;
      let needsMigration = false;

      for (const groupName in loadedSettings) {
        // 如果发现旧版的 staged_setting，进行提取和迁移
        if (loadedSettings[groupName].staged_setting) {
          needsMigration = true;
          const staged = loadedSettings[groupName].staged_setting;

          // 将旧任务名存入引用数组
          loadedSettings[groupName].task_refs = Object.keys(staged);

          // 初始化全局任务池
          if (!variables.task_config_settings) {
            variables.task_config_settings = {};
          }
          // 将任务合并到全局任务池中
          Object.assign(variables.task_config_settings, staged);

          // 删除旧的嵌套结构
          delete loadedSettings[groupName].staged_setting;
        }

        // 确保 task_refs 字段存在
        if (!loadedSettings[groupName].task_refs) {
          loadedSettings[groupName].task_refs = [];
        }
      }

      asyncAnalyzeSetting.value = loadedSettings;

      if (needsMigration) {
        eraLogger.log('检测到旧版规则数据，已自动迁移至解耦结构');
      }
    }

    // [新增] 读取全局任务池配置
    if (variables.task_config_settings) {
      taskConfigSettings.value = variables.task_config_settings;
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

    // 读取备份状态
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
      task_config_settings: taskConfigSettings.value, // [新增] 保存全局任务池
      api_config_settings: apiConfigSettings.value,
      active_rule_name: activeRuleName.value,
      saved_regex_configs: savedRegexConfigs.value,
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
    taskConfigSettings.value = {}; // [新增] 清空全局任务池
    apiConfigSettings.value = {};
    activeRuleName.value = '';
    savedRegexConfigs.value = [];
    savedBackupState.value = null;
    await saveModelSettings();
  };

  return {
    asyncAnalyzeSetting,
    taskConfigSettings, // [新增] 暴露给组件
    apiConfigSettings,
    activeRuleName,
    savedRegexConfigs,
    savedBackupState,
    getModelSettings,
    saveModelSettings,
    clearModelSettings,
  };
});
