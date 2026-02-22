import { PromptUtil } from '@/Utils/PromptUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { eraLogger } from '../utils/EraHelperLogger';
import { EraDataProcessor } from '@/ERA助手/EraDataHandler/EraMetaHandler';
import { EraMetaRule } from '@/ERA助手/UI/view/EraDataHandle.vue';
import {
  getAsyncAnalyzeStore,
  getEraDataStore,
  blacklistLores,
  isWhitelistMode,
  generationLock,
  updateGenerationLock,
  getCurrentRunId,
} from './AsyncAnalyzeState';
import { extractAndFilterVariableEdits } from './AsyncAnalyzeResultHandler';
import { TaskResult } from './AsyncAnalyzeTypes';

/**
 * 执行单个任务 - 仅生成和提取，不修改数据
 */
export async function executeSingleTask(task: any, message_id: number, runId: number): Promise<TaskResult | null> {
  const store = getAsyncAnalyzeStore();
  eraLogger.info(`>>> 开始执行任务: ${task.taskName}`);
  toastr.info(`正在执行分步任务: ${task.taskName}`);

  const apiConfigName = task.api_config;
  const apiConfig = store.apiConfigSettings[apiConfigName];
  if (!apiConfig) throw new Error(`找不到 API 配置: ${apiConfigName}`);

  // 1. 在锁外先计算好当前任务需要的过滤列表
  let localFilterList: string[] = [];
  const isWhiteList = task.whiteListModel === true;

  if (task.world_book) {
    try {
      const tempFilterList: string[] = [];
      for (const [bookName, wbConfig] of Object.entries(task.world_book)) {
        const config = wbConfig as any;
        if (isWhiteList) {
          if (config.lores && Array.isArray(config.lores)) {
            tempFilterList.push(...config.lores);
          }
          if (config.lore_regex) {
            const allEntries = await WorldInfoUtil.getWorldBookLoresByName(bookName);
            if (allEntries.length > 0) {
              const regexList = Array.isArray(config.lore_regex) ? config.lore_regex : [config.lore_regex];
              for (const rStr of regexList) {
                const regex = new RegExp(rStr);
                allEntries.filter(n => regex.test(n)).forEach(l => tempFilterList.push(l));
              }
            }
          }
        } else {
          let allEntries: string[] = [];
          allEntries = await WorldInfoUtil.getWorldBookLoresByName(bookName);
          if (allEntries.length > 0) {
            const whitelist = new Set<string>();
            if (config.lores) config.lores.forEach((l: string) => whitelist.add(l));
            if (config.lore_regex) {
              const regexList = Array.isArray(config.lore_regex) ? config.lore_regex : [config.lore_regex];
              for (const rStr of regexList) {
                const regex = new RegExp(rStr);
                allEntries.filter(n => regex.test(n)).forEach(l => whitelist.add(l));
              }
            }
            tempFilterList.push(...allEntries.filter(e => !whitelist.has(e)));
          }
        }
      }
      localFilterList = [...new Set(tempFilterList)];
    } catch (e) {
      eraLogger.error('Task world_book processing failed', e);
      localFilterList = [];
    }
  } else {
    localFilterList = [];
  }

  const maxHistory = task.chat_history || 2;
  const user_input = task.prompt;
  const promptInjects = [
    {
      id: '1145141919',
      position: 'in_chat',
      depth: 0,
      should_scan: false,
      role: 'user',
      content: user_input,
    },
  ];

  let result = '';

  // 使用锁串行执行生成过程
  const taskExecutionPromise = generationLock.then(async () => {
    if (runId !== getCurrentRunId()) {
      throw new Error('任务已被中止');
    }

    // 应用过滤列表
    blacklistLores.value = localFilterList;
    isWhitelistMode.value = isWhiteList;

    console.log(`任务 [${task.taskName}] 过滤配置已应用. 模式: ${isWhiteList ? '白名单' : '黑名单'}, 列表条目数: ${blacklistLores.value.length}`);

    (window as any).SillyTavern.registerMacro('lastUserMessage', () => user_input);

    const originalPresetName = (window as any).getLoadedPresetName();
    let tempPresetLoaded = false;
    let tempProfileSetting = null;

    try {
      if (apiConfig.model_source === 'profile' && apiConfig.profileSetting) {
        tempProfileSetting = ((await (window as any).SillyTavern.executeSlashCommands('/profile')) as any).pipe;
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${apiConfig.profileSetting}`);
      }

      if (apiConfig.model_source === 'sample' && apiConfig.simple_preset_name && apiConfig.simple_preset_name !== 'in_use') {
        if (originalPresetName !== apiConfig.simple_preset_name) {
          (window as any).loadPreset(apiConfig.simple_preset_name);
          tempPresetLoaded = true;
        }
      } else if (apiConfig.model_source === 'external' && apiConfig.custom_model_settings?.presetName && apiConfig.custom_model_settings.presetName !== 'in_use') {
        if (originalPresetName !== apiConfig.custom_model_settings.presetName) {
          (window as any).loadPreset(apiConfig.custom_model_settings.presetName);
          tempPresetLoaded = true;
        }
      }

      const is_should_stream = false;
      if (apiConfig.model_source === 'sample') {
        result = await PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, null, null);
      } else if (apiConfig.model_source === 'profile') {
        result = await PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, null, null);
      } else {
        result = await PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, apiConfig.custom_model_settings, null);
      }

      eraLogger.log(`任务 [${task.taskName}] 原始输出:`, result);

    } finally {
      if (tempProfileSetting) {
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${tempProfileSetting}`);
      }
      if (tempPresetLoaded) {
        (window as any).loadPreset(originalPresetName);
      }
      (window as any).SillyTavern.unregisterMacro('lastUserMessage');
    }
  });

  updateGenerationLock(taskExecutionPromise.catch(() => {}));
  await taskExecutionPromise;

  const metaRules = getEraDataStore().eraMetaRule as EraMetaRule;
  const processor = metaRules ? new EraDataProcessor(metaRules) : null;

  const { cleanContent, variableEdits } = extractAndFilterVariableEdits(result, processor);

  return {
    taskName: task.taskName,
    extractedContent: cleanContent,
    mergeSettings: task.merge_setting,
    variableEdits: variableEdits
  };
}
