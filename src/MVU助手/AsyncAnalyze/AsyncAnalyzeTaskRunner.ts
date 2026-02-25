import { PromptUtil } from '@/Utils/PromptUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { eraLogger } from '../utils/MvuHelperLogger';
import {
  getAsyncAnalyzeStore,
  blacklistLores,
  isWhitelistMode,
  generationLock,
  updateGenerationLock,
  getCurrentRunId,
} from './AsyncAnalyzeState';
import { TaskResult } from './AsyncAnalyzeTypes';

// 记录初始预设，用于流程结束后还原
let originalGlobalPreset: string | null = null;

/**
 * 还原到最初的预设 (在 Service 流程结束时调用)
 */
export const restoreGlobalPreset = async () => {
  const taskExecutionPromise = generationLock.then(async () => {
    if (originalGlobalPreset) {
      const current = (window as any).getLoadedPresetName();
      if (current !== originalGlobalPreset) {
        eraLogger.info(`[AsyncAnalyze] 流程结束，恢复初始预设: ${originalGlobalPreset}`);
        (window as any).loadPreset(originalGlobalPreset);
      }
      originalGlobalPreset = null;
    }
  });
  updateGenerationLock(taskExecutionPromise.catch(() => {}));
  await taskExecutionPromise;
};

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

    //(window as any).SillyTavern.registerMacro('lastUserMessage', () => user_input);

    let tempProfileSetting = null;

    try {
      // 如果是第一次执行，记录当前的全局预设
      const currentLoadedPreset = (window as any).getLoadedPresetName();
      if (originalGlobalPreset === null) {
        originalGlobalPreset = currentLoadedPreset;
      }

      // 处理 Profile (Profile 比较特殊，通常包含预设，暂时保持局部还原逻辑以防副作用，或者根据需求也可优化)
      if (apiConfig.model_source === 'profile' && apiConfig.profileSetting) {
        tempProfileSetting = ((await (window as any).SillyTavern.executeSlashCommands('/profile')) as any).pipe;
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${apiConfig.profileSetting}`);
      }

      // 处理预设切换 (优化逻辑：覆盖更新，不立即还原)
      let targetPreset = null;
      if (apiConfig.model_source === 'sample' && apiConfig.simple_preset_name && apiConfig.simple_preset_name !== 'in_use') {
        targetPreset = apiConfig.simple_preset_name;
      } else if (apiConfig.model_source === 'external' && apiConfig.custom_model_settings?.presetName && apiConfig.custom_model_settings.presetName !== 'in_use') {
        targetPreset = apiConfig.custom_model_settings.presetName;
      }

      // 只有当目标预设存在且与当前不同时才切换
      if (targetPreset && targetPreset !== (window as any).getLoadedPresetName()) {
        console.log(`[AsyncAnalyze] 切换预设: ${(window as any).getLoadedPresetName()} -> ${targetPreset}`);
        (window as any).loadPreset(targetPreset);
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
      // 注意：此处不再还原预设，预设还原移至 Service 的 finally 块中统一处理
      // (window as any).SillyTavern.unregisterMacro('lastUserMessage');
    }
  });

  updateGenerationLock(taskExecutionPromise.catch(() => {}));
  await taskExecutionPromise;

  return {
    taskName: task.taskName,
    extractedContent: result,
    mergeSettings: task.merge_setting
  };
}
