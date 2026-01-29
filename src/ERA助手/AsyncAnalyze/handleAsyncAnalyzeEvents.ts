import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { PromptUtil } from '@/Utils/PromptUtil';
import { MessageUtil } from '@/Utils/MessageUtil';
import { ERAEvents } from '@/Constants/ERAEvent';
import { useAsyncAnalyzeStore, AnalyzeBackupState } from '../stores/AsyncAnalyzeStore';
import { eraLogger } from '../utils/EraHelperLogger';
import { EraDataHandler } from '../EraDataHandler/EraDataHandler';
import { useEraDataStore } from '../stores/EraDataStore';
import { useEraEditStore } from '../stores/EraEditStore';
import { JsonUtil } from '@/Utils/JsonUtil';
import { ref, watch } from 'vue';
import { RegexUtils } from '@/Utils/RegexUtils';

const getAsyncAnalyzeStore = () => (window as any).AsyncAnalyzeStore as ReturnType<typeof useAsyncAnalyzeStore>;
const getEraDataStore = () => (window as any).EraDataStore as ReturnType<typeof useEraDataStore>;
const getEraEditStore = () => (window as any).EraEditStore as ReturnType<typeof useEraEditStore>;

// [核心修改] 使用 blacklistLores 缓存计算结果，避免在事件中进行 IO 操作
const blacklistLores = ref<string[]>([]);

// Global lock for analysis
let isAnalyzing = false;
let watcherInitialized = false;

/**
 * 初始化监听器
 */
const initWatcher = () => {
  if (watcherInitialized) return;
  const store = getAsyncAnalyzeStore();
  if (!store) return;

  // 监听配置变化，在空闲时预计算黑名单
  watch(
    [() => store.activeRuleName, () => store.asyncAnalyzeSetting],
    () => {
      if (!isAnalyzing) {
        updateGlobalBlacklist();
      }
    },
    { deep: true }
  );

  watcherInitialized = true;
  updateGlobalBlacklist(); // 初始同步
};

/**
 * [核心修复] 预计算黑名单
 * 这个函数负责所有的 IO 操作和正则匹配。
 * 它计算出所有“属于目标世界书”但“不符合保留条件”的条目。
 */
const updateGlobalBlacklist = async () => {
  console.info('updateGlobalBlacklist: ', '开始计算黑名单');
  const store = getAsyncAnalyzeStore();
  if (!store || !store.activeRuleName) {
    blacklistLores.value = [];
    return;
  }

  const rule = store.asyncAnalyzeSetting[store.activeRuleName];
  if (!rule || !rule.world_book) {
    blacklistLores.value = [];
    return;
  }

  try {
    const calculatedBlacklist: string[] = [];

    // 遍历配置的每一本世界书
    for (const [bookName, wbConfig] of Object.entries(rule.world_book)) {
      const config = wbConfig as any;

      // 1. 获取该书的所有条目 (IO 操作在这里进行，此时不在事件死锁区)
      let allEntriesInBook: string[] = [];
      try {
        allEntriesInBook = await WorldInfoUtil.getWorldBookLoresByName(bookName);
      } catch (e) {
        eraLogger.warn(`无法获取世界书 [${bookName}] 的条目，可能不存在。`);
        continue;
      }

      if (!allEntriesInBook || allEntriesInBook.length === 0) {
        continue;
      }

      // 2. 计算白名单 (允许存在的条目)
      const whitelistForBook = new Set<string>();

      // 2.1 添加显式配置的 lores
      if (config.lores && Array.isArray(config.lores)) {
        config.lores.forEach((lore: string) => whitelistForBook.add(lore));
      }

      // 2.2 [修复] 处理 lore_regex (支持数组)
      if (config.lore_regex) {
        // 兼容 string 和 string[]
        const regexList = Array.isArray(config.lore_regex) ? config.lore_regex : [config.lore_regex];

        for (const regexStr of regexList) {
          try {
            const regex = new RegExp(regexStr);
            // 在内存中匹配，不涉及 IO
            const matchedEntries = allEntriesInBook.filter(name => regex.test(name));
            matchedEntries.forEach(lore => whitelistForBook.add(lore));
          } catch (e) {
            eraLogger.error(`Regex error in world book config [${bookName}]: ${regexStr}`, e);
          }
        }
      }

      // 3. 计算该书的黑名单：(全量 - 白名单)
      const blacklistForBook = allEntriesInBook.filter(entry => !whitelistForBook.has(entry));
      calculatedBlacklist.push(...blacklistForBook);
    }

    // 更新缓存
    blacklistLores.value = [...new Set(calculatedBlacklist)];

  } catch (e) {
    eraLogger.error('Failed to update global blacklist:', e);
    blacklistLores.value = [];
  }
};

/**
 * [新增] 创建备份快照
 */
const createBackup = async (message_id: number, ruleName: string) => {
  const store = getAsyncAnalyzeStore();
  const currentRule = store.asyncAnalyzeSetting[ruleName];
  if (!currentRule || !currentRule.staged_setting) return;

  const backup: AnalyzeBackupState = {
    ruleName,
    messageId: message_id,
    timestamp: Date.now(),
    triggerHistory: {},
    worldBookData: {},
    messageData: {}
  };

  try {
    const msgContent = MessageUtil.getMessageById(message_id);
    backup.messageData[message_id] = msgContent;
  } catch (e) {
    eraLogger.warn(`Backup: Failed to get message ${message_id}`);
  }

  for (const [taskName, taskConfig] of Object.entries(currentRule.staged_setting)) {
    backup.triggerHistory[taskName] = taskConfig.trigger_history || 0;

    if (taskConfig.merge_setting) {
      for (const setting of Object.values(taskConfig.merge_setting)) {
        const { is_inject, world_book, target_lore } = setting as any;
        if (!is_inject && world_book && target_lore) {
          const key = `${world_book}:${target_lore}`;
          if (!(key in backup.worldBookData)) {
            try {
              const content = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
              backup.worldBookData[key] = content || null;
            } catch (e) {
              backup.worldBookData[key] = null;
            }
          }
        }
      }
    }
  }

  store.savedBackupState = backup;
  await store.saveModelSettings();
  eraLogger.info('分步分析：已创建数据备份');
};

/**
 * [新增] 执行回滚
 */
export const performRollback = async (currentMessageId?: number) => {
  const store = getAsyncAnalyzeStore();
  const backup = store.savedBackupState;

  if (!backup) {
    toastr.warning('没有可用的备份数据');
    return;
  }

  const actualCurrentMessageId = currentMessageId !== undefined ? currentMessageId : getLastMessageId();

  if (actualCurrentMessageId !== backup.messageId) {
    toastr.info(`当前楼层 (${actualCurrentMessageId}) 与备份楼层 (${backup.messageId}) 不同，跳过回滚`);
    eraLogger.info(`当前楼层 (${actualCurrentMessageId}) 与备份楼层 (${backup.messageId}) 不同，跳过回滚`);
    return;
  }

  toastr.info('正在回滚分步分析数据...');
  eraLogger.info('开始回滚分步分析数据...');

  try {
    const rule = store.asyncAnalyzeSetting[backup.ruleName];
    if (rule && rule.staged_setting) {
      for (const [taskName, historyFloor] of Object.entries(backup.triggerHistory)) {
        if (rule.staged_setting[taskName]) {
          rule.staged_setting[taskName].trigger_history = historyFloor;
        }
      }
    }

    for (const [key, content] of Object.entries(backup.worldBookData)) {
      const [bookName, loreName] = key.split(':');
      if (bookName && loreName) {
        const finalContent = content || '';
        await WorldInfoUtil.updateOrCreateEntry(bookName, loreName, finalContent);
      }
    }

    const messagesToUpdate = [];
    for (const [msgIdStr, content] of Object.entries(backup.messageData)) {
      messagesToUpdate.push({
        message_id: parseInt(msgIdStr),
        message: content
      });
    }
    if (messagesToUpdate.length > 0) {
      await setChatMessages(messagesToUpdate);
    }

    await store.saveModelSettings();
    toastr.success('回滚完成');
    eraLogger.info('分步分析数据回滚完成');
    await eventEmit(ERAEvents.FORCE_SYNC);

  } catch (e) {
    eraLogger.error('回滚失败:', e);
    toastr.error('回滚失败，请检查日志');
  }
};

/**
 * 处理接收到的massage_received事件
 */
export const handleMessageReceived = async (message_id: number) => {
  try {
    initWatcher();

    if (getLastMessageId() == 0 || message_id == 0) {
      return;
    }

    const store = getAsyncAnalyzeStore();
    if (!store.activeRuleName || !store.asyncAnalyzeSetting[store.activeRuleName]) {
      return;
    }

    if (isAnalyzing) {
      toastr.warning('上一个分析任务尚未完成');
      return;
    }

    isAnalyzing = true;
    toastr.info('开始执行分步分析规则...');
    eraLogger.info(`开始执行分步分析规则: ${store.activeRuleName}`);

    handleAsyncAnalyzeTasks(message_id);

  } catch (e) {
    eraLogger.error('分步分析主流程异常:', e);
    toastr.error('分步分析执行出错');
  } finally {
    isAnalyzing = false;
    // 任务结束后，重新计算一次黑名单，确保最新的世界书变动被捕获
    await updateGlobalBlacklist();
    await eventEmit(ERAEvents.FORCE_SYNC);
    await eventEmit('kat:handle_era_finished');
  }
};

/**
 * 核心：处理分步分析任务队列
 */
export const handleAsyncAnalyzeTasks = async (message_id: number) => {
  const store = getAsyncAnalyzeStore();
  const ruleName = store.activeRuleName;
  const currentRule = store.asyncAnalyzeSetting[ruleName];

  if (!currentRule || !currentRule.staged_setting) return;

  await createBackup(message_id, ruleName);

  const tasks = Object.entries(currentRule.staged_setting).map(([taskName, config]) => ({
    taskName,
    ...config
  }));
  const enabledTasks = tasks.filter(t => t.enable);
  const sortedTasks = enabledTasks.sort((a, b) => a.order - b.order);

  const taskGroups = new Map<number, typeof sortedTasks>();
  sortedTasks.forEach(task => {
    if (!taskGroups.has(task.order)) {
      taskGroups.set(task.order, []);
    }
    taskGroups.get(task.order)!.push(task);
  });

  const sortedOrders = Array.from(taskGroups.keys()).sort((a, b) => a - b);
  const pendingTriggerUpdates: Map<string, number> = new Map();

  try {
    for (const order of sortedOrders) {
      const groupTasks = taskGroups.get(order)!;
      eraLogger.log(`正在执行第 ${order} 阶任务组，共 ${groupTasks.length} 个任务`);
      toastr.info(`正在执行第 ${order} 阶任务组，共 ${groupTasks.length} 个任务`);

      const promises = groupTasks.map(async (task, index) => {
        const currentFloor = message_id;
        const lastTrigger = task.trigger_history || 0;

        if (task.trigger_index > 1 && (currentFloor - lastTrigger) < task.trigger_index) {
          eraLogger.log(`任务 [${task.taskName}] 跳过: 未达到触发间隔`);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, index * 1000));

        try {
          await executeSingleTask(task, message_id);
          pendingTriggerUpdates.set(task.taskName, currentFloor);
        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 执行失败:`, e);

          let retrySuccess = false;
          if (task.reroll_count > 0) {
            for(let i=0; i<task.reroll_count; i++){
              try {
                eraLogger.log(`任务 [${task.taskName}] 重试第 ${i+1} 次`);
                await executeSingleTask(task, message_id);
                pendingTriggerUpdates.set(task.taskName, currentFloor);
                retrySuccess = true;
                break;
              } catch(retryE) {
                eraLogger.error(`任务 [${task.taskName}] 重试失败:`, retryE);
              }
            }
          }

          if (!retrySuccess) {
            throw new Error(`任务 [${task.taskName}] 最终执行失败`);
          }
        }
      });

      await Promise.all(promises);
    }

    if (pendingTriggerUpdates.size > 0) {
      let hasUpdates = false;
      pendingTriggerUpdates.forEach((floor, taskName) => {
        if (store.asyncAnalyzeSetting[ruleName]?.staged_setting?.[taskName]) {
          store.asyncAnalyzeSetting[ruleName].staged_setting[taskName].trigger_history = floor;
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        await store.saveModelSettings();
      }
    }
    toastr.success('所有分步分析任务执行完成');

  } catch (err) {
    eraLogger.error('分步分析流程发生严重错误，正在回滚...', err);
    toastr.error('执行出错，正在回滚数据...');
    await performRollback();
  }
};

/**
 * 执行单个任务
 */
async function executeSingleTask(task: any, message_id: number) {
  const store = getAsyncAnalyzeStore();
  eraLogger.info(`>>> 开始执行任务: ${task.taskName}`);
  toastr.info(`正在执行分步任务: ${task.taskName}`);

  const apiConfigName = task.api_config;
  const apiConfig = store.apiConfigSettings[apiConfigName];
  if (!apiConfig) throw new Error(`找不到 API 配置: ${apiConfigName}`);

  // [修改] 任务执行时，如果任务本身有 world_book 配置，需要临时更新黑名单
  // 这里我们复用 updateGlobalBlacklist 的逻辑，但针对任务配置
  if (task.world_book) {
    try {
      // 临时构建一个类似 rule 的对象来复用逻辑，或者直接提取逻辑
      // 这里简单起见，手动计算一下任务的黑名单
      const taskBlacklist: string[] = [];
      for (const [bookName, wbConfig] of Object.entries(task.world_book)) {
        const config = wbConfig as any;
        let allEntries: string[] = [];
        allEntries = await WorldInfoUtil.getWorldBookLoresByName(bookName);

        if(allEntries.length > 0) {
          const whitelist = new Set<string>();
          if(config.lores) config.lores.forEach((l:string) => whitelist.add(l));
          if(config.lore_regex) {
            const regexList = Array.isArray(config.lore_regex) ? config.lore_regex : [config.lore_regex];
            for(const rStr of regexList) {
                const regex = new RegExp(rStr);
                allEntries.filter(n => regex.test(n)).forEach(l => whitelist.add(l));
            }
          }
          taskBlacklist.push(...allEntries.filter(e => !whitelist.has(e)));
        }
      }
      blacklistLores.value = [...new Set(taskBlacklist)];
    } catch(e) {
      eraLogger.error('Task world_book processing failed', e);
      blacklistLores.value = [];
    }
  } else {
    // 任务没有指定世界书配置，清空黑名单（即不拦截任何内容）
    blacklistLores.value = [];
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

  const originalPresetName = getLoadedPresetName();
  let tempPresetLoaded = false;

  try {
    if (apiConfig.model_source === 'sample' && apiConfig.simple_preset_name && apiConfig.simple_preset_name !== 'in_use') {
      if (originalPresetName !== apiConfig.simple_preset_name) {
        loadPreset(apiConfig.simple_preset_name);
        tempPresetLoaded = true;
      }
    } else if (apiConfig.model_source === 'external' && apiConfig.custom_model_settings?.presetName && apiConfig.custom_model_settings.presetName !== 'in_use') {
      if (originalPresetName !== apiConfig.custom_model_settings.presetName) {
        loadPreset(apiConfig.custom_model_settings.presetName);
        tempPresetLoaded = true;
      }
    }

    let result = '';
    const is_should_stream = false;

    if (apiConfig.model_source === 'sample') {
      result = await PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, null, null);
    } else if (apiConfig.model_source === 'profile') {
      result = await PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, null, apiConfig.profileSetting);
    } else {
      result = await PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, apiConfig.custom_model_settings, null);
    }

    eraLogger.log(`任务 [${task.taskName}] 原始输出:`, result);
    await handleTaskResultMerge(task, result, message_id);

  } finally {
    if (tempPresetLoaded) {
      loadPreset(originalPresetName);
    }
  }
}

/**
 * 处理任务结果的合并逻辑
 */
async function handleTaskResultMerge(task: any, result: string, message_id: number) {
  if (!task.merge_setting) return;

  const mergeSettings = task.merge_setting;

  for (const [mergeKey, setting] of Object.entries(mergeSettings)) {
    const { is_inject, world_book, target_lore, content_regex, replace_regex } = setting as any;

    let finalExtractedContent = '';

    if (content_regex && Array.isArray(content_regex) && content_regex.length > 0) {
      const extractedParts: string[] = [];
      for (const regexStr of content_regex) {
        const parts = RegexUtils.extractContentByRegex(result, regexStr);
        if (parts.length > 0) {
          extractedParts.push(...parts);
        } else {
          eraLogger.warn(`任务 [${task.taskName}] 合并 [${mergeKey}]: 正则未匹配到内容 "${regexStr}"`);
        }
      }
      if (extractedParts.length > 0) {
        finalExtractedContent = extractedParts.join('\n');
      } else {
        continue;
      }
    } else {
      finalExtractedContent = result;
    }

    if (is_inject) {
      if (replace_regex) {
        try {
          const currentMessageContent = MessageUtil.getMessageById(message_id);
          const regex = new RegExp(replace_regex, 'g');
          if (regex.test(currentMessageContent)) {
            const newMessageContent = currentMessageContent.replace(regex, finalExtractedContent);
            await setChatMessages([{ message_id, message: newMessageContent }]);
            eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 正文内容已根据正则替换`);
          }
        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 正文替换执行出错:`, e);
        }
      } else {
        await MessageUtil.mergeContentToMessage(message_id, `\n${finalExtractedContent}`);
        eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 内容已追加到正文`);
      }
    } else if (world_book && target_lore) {
      if (replace_regex) {
        const oldContent = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
        if (oldContent) {
          try {
            const regex = new RegExp(replace_regex, 'g');
            if (regex.test(oldContent)) {
              const newContent = oldContent.replace(regex, finalExtractedContent);
              await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, newContent);
              eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 内容已替换更新`);
            }
          } catch (e) {
            eraLogger.error(`任务 [${task.taskName}] 世界书替换执行出错:`, e);
          }
        }
      } else if (finalExtractedContent && finalExtractedContent.trim().length > 0) {
        await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, finalExtractedContent);
        eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 已覆盖更新`);
      }
    }

    if (finalExtractedContent.includes('<VariableEdit>')) {
      await handleEraRules(finalExtractedContent);
    }
  }
}

async function handleEraRules(result: string) {
  const regexInnermost = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>/g;
  const matches = Array.from(result.matchAll(regexInnermost));
  if (matches.length === 0) return result;
  let mergedEditData: Record<string, any> = {};
  let hasValidData = false;
  for (const match of matches) {
    const content = match[1];
    if (!content || !content.trim()) continue;
    try {
      const editData = JSON.parse(content);
      mergedEditData = JsonUtil.mergeDeep(mergedEditData, editData);
      hasValidData = true;
    } catch (e) {
      console.warn('忽略无效的 VariableEdit 内容:', content);
    }
  }
  if (!hasValidData) return result;
  try {
    const snapshotData = await getEraEditStore().getStatData();
    if (snapshotData == null) return result;
    const rules = getEraDataStore().eraDataRule;
    const { data: updatedData } = await EraDataHandler.applyRule(mergedEditData, snapshotData, rules);
    const updatedContent = JSON.stringify(updatedData);
    const newTag = `<VariableEdit>\n${updatedContent}\n</VariableEdit>`;
    let isFirstMatch = true;
    result = result.replace(regexInnermost, () => {
      if (isFirstMatch) {
        isFirstMatch = false;
        return newTag;
      } else {
        return '';
      }
    });
  } catch (e) {
    eraLogger.error('变量更新失败：', e);
    toastr.error('变量更新失败');
  }
  return result;
}

export const reSendEraUpdate = async () => {
  const currentMessageId = getLastMessageId();
  if (currentMessageId == 0) {
    toastr.warning('请不要重算0层变量');
    return;
  }

  const store = getAsyncAnalyzeStore();
  const backup = store.savedBackupState;

  if (backup && backup.messageId === currentMessageId) {
    eraLogger.info('重算检测：发现当前楼层存在历史备份，正在回滚以重置状态...');
    await performRollback(currentMessageId);
  }

  toastr.info('开始重算分步分析');
  await handleAsyncAnalyzeTasks(currentMessageId);
};

/**
 * [核心修复] 处理世界书过滤
 * 绝对不在此函数中调用任何 WorldInfoUtil 的查询方法 (getWorldBookLoresByName 等)
 * 仅使用预先计算好的 blacklistLores 进行过滤
 */
export const handleLoresFilter = async (lores: any) => {
  // 移除 initWatcher()，防止触发不必要的更新

  console.info('handleLoresFilter: ', '接收到过滤请求');
  if (blacklistLores.value.length === 0) {
    return;
  }

  try {
    // 直接使用预计算的黑名单进行移除
    // isReversed = false: 移除数组中存在的条目
    await WorldInfoUtil.removeLoresByArray(lores, blacklistLores.value, false);

    // eraLogger.log('Scoped WorldInfo Filter Applied. Removed entries:', blacklistLores.value.length);
  } catch (e) {
    eraLogger.error('Error during handleLoresFilter:', e);
  }
};

/**
 * [修复初始化顺序问题]
 * 启动一个轮询检查，等待 AsyncAnalyzeStore 在 window 上挂载完成后再初始化监听器。
 * 避免因脚本加载早于 Store 初始化导致 initWatcher 失败。
 */
const waitForStoreAndInit = () => {
  const store = getAsyncAnalyzeStore();

  if (store) {
    // Store 已就绪，执行初始化
    initWatcher();
    console.info('AsyncAnalyzeStore detected, watcher initialized.');
  } else {
    // Store 尚未就绪，200ms 后重试
    setTimeout(waitForStoreAndInit, 200);
  }
};

// 启动等待循环
waitForStoreAndInit();
