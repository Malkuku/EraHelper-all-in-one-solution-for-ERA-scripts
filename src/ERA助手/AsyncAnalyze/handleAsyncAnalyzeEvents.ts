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

const getAsyncAnalyzeStore = () => (window as any).AsyncAnalyzeStore as ReturnType<typeof useAsyncAnalyzeStore>;
const getEraDataStore = () => (window as any).EraDataStore as ReturnType<typeof useEraDataStore>;
const getEraEditStore = () => (window as any).EraEditStore as ReturnType<typeof useEraEditStore>;

// Changed to ref to allow dynamic updates by tasks
const loreList = ref<string[]>([]);
const isReversed = ref(true);//反向过滤

// Global lock for analysis
let isAnalyzing = false;
let watcherInitialized = false;

/**
 * 初始化监听器，确保 loreList 与 Store 中的全局配置同步
 */
const initWatcher = () => {
  if (watcherInitialized) return;
  const store = getAsyncAnalyzeStore();
  if (!store) return;

  // 监听 activeRuleName 和 asyncAnalyzeSetting 的变化
  watch(
    [() => store.activeRuleName, () => store.asyncAnalyzeSetting],
    () => {
      // 只有在非分析状态下才同步全局配置，避免分析过程中被覆盖
      if (!isAnalyzing) {
        updateGlobalLoreList();
      }
    },
    { deep: true }
  );

  watcherInitialized = true;
  updateGlobalLoreList(); // 初始同步
};

/**
 * 更新全局 Lore List (基于当前激活规则的 world_book 配置)
 */
const updateGlobalLoreList = async () => {
  const store = getAsyncAnalyzeStore();
  if (!store || !store.activeRuleName) {
    loreList.value = [];
    return;
  }

  const rule = store.asyncAnalyzeSetting[store.activeRuleName];
  if (!rule || !rule.world_book) {
    loreList.value = [];
    return;
  }

  try {
    loreList.value = await processWorldBookConfig(rule.world_book);
  } catch (e) {
    eraLogger.error('Failed to update global lore list:', e);
    loreList.value = [];
  }
};

/**
 * 辅助函数：处理 WorldBook 配置并返回条目列表
 */
const processWorldBookConfig = async (worldBookConfig: any): Promise<string[]> => {
  const resultLores: string[] = [];

  for (const [bookName, wbConfig] of Object.entries(worldBookConfig)) {
    const config = wbConfig as any;
    const allEntries = await WorldInfoUtil.getWorldBookLoresByName(bookName);

    if (config.lore_regex) {
      try {
        const regex = new RegExp(config.lore_regex);
        const matchedEntries = allEntries.filter(name => regex.test(name));
        config.lores = [...new Set([...(config.lores || []), ...matchedEntries])];
      } catch (e) {
        eraLogger.error(`Regex error in world book config [${bookName}]:`, e);
      }
    }

    if (config.lores && config.lores.length > 0) {
      resultLores.push(...config.lores);
    }
  }

  return [...new Set(resultLores)];
};

/**
 * [新增] 创建备份快照
 * 扫描所有任务的 merge_setting，保存当前状态
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

  // 1. 备份当前消息内容 (因为 is_inject 可能修改它)
  try {
    const msgContent = MessageUtil.getMessageById(message_id);
    backup.messageData[message_id] = msgContent;
  } catch (e) {
    eraLogger.warn(`Backup: Failed to get message ${message_id}`);
  }

  // 2. 遍历所有任务，备份触发历史和目标数据
  for (const [taskName, taskConfig] of Object.entries(currentRule.staged_setting)) {
    // 备份触发历史
    backup.triggerHistory[taskName] = taskConfig.trigger_history || 0;

    if (taskConfig.merge_setting) {
      for (const setting of Object.values(taskConfig.merge_setting)) {
        const { is_inject, world_book, target_lore } = setting as any;

        // 如果是写入世界书，备份该条目
        if (!is_inject && world_book && target_lore) {
          const key = `${world_book}:${target_lore}`;
          // 避免重复读取
          if (!(key in backup.worldBookData)) {
            try {
              const content = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
              backup.worldBookData[key] = content || null; // null 表示不存在
            } catch (e) {
              backup.worldBookData[key] = null;
            }
          }
        }
        // 如果是注入正文，已经在上面备份了 message_id
        // 如果未来支持注入其他楼层，这里需要解析并备份对应楼层
      }
    }
  }

  store.savedBackupState = backup;
  await store.saveModelSettings();
  eraLogger.info('分步分析：已创建数据备份');
};

/**
 * [新增] 执行回滚
 * 恢复到 savedBackupState 中的状态
 */
export const performRollback = async () => {
  const store = getAsyncAnalyzeStore();
  const backup = store.savedBackupState;

  if (!backup) {
    toastr.warning('没有可用的备份数据');
    return;
  }

  toastr.info('正在回滚分步分析数据...');
  eraLogger.info('开始回滚分步分析数据...');

  try {
    // 1. 恢复触发历史
    const rule = store.asyncAnalyzeSetting[backup.ruleName];
    if (rule && rule.staged_setting) {
      for (const [taskName, historyFloor] of Object.entries(backup.triggerHistory)) {
        if (rule.staged_setting[taskName]) {
          rule.staged_setting[taskName].trigger_history = historyFloor;
        }
      }
    }

    // 2. 恢复世界书条目
    for (const [key, content] of Object.entries(backup.worldBookData)) {
      const [bookName, loreName] = key.split(':');
      if (bookName && loreName) {
        // 如果内容为 null，说明之前不存在，视情况清空或保留空字符串
        // 这里统一恢复为 content 或空字符串
        const finalContent = content || '';
        await WorldInfoUtil.updateOrCreateEntry(bookName, loreName, finalContent);
      }
    }

    // 3. 恢复消息内容
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

    // 保存恢复后的配置
    await store.saveModelSettings();

    toastr.success('回滚完成');
    eraLogger.info('分步分析数据回滚完成');

    // 触发刷新
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

    await handleAsyncAnalyzeTasks(message_id);

  } catch (e) {
    eraLogger.error('分步分析主流程异常:', e);
    toastr.error('分步分析执行出错');
  } finally {
    isAnalyzing = false;
    await updateGlobalLoreList();
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

  // [新增] 1. 在任务开始前创建备份
  await createBackup(message_id, ruleName);

  // 任务分组与排序
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
    // 2. 顺序执行分组，组内并行
    for (const order of sortedOrders) {
      const groupTasks = taskGroups.get(order)!;
      eraLogger.log(`正在执行第 ${order} 阶任务组，共 ${groupTasks.length} 个任务`);

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

          // 如果重试也失败了，抛出异常以触发回滚
          if (!retrySuccess) {
            throw new Error(`任务 [${task.taskName}] 最终执行失败`);
          }
        }
      });

      // 等待当前组完成，如果有任何一个抛出异常，Promise.all 会 reject
      await Promise.all(promises);
    }

    // 3. 所有任务成功，更新触发历史
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
    // [新增] 4. 捕获到严重错误（包含重试失败），执行全量回滚
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

  const apiConfigName = task.api_config;
  const apiConfig = store.apiConfigSettings[apiConfigName];
  if (!apiConfig) throw new Error(`找不到 API 配置: ${apiConfigName}`);

  if (task.world_book) {
    loreList.value = await processWorldBookConfig(task.world_book);
  } else {
    loreList.value = [];
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
        try {
          const regex = new RegExp(regexStr, 's');
          const match = result.match(regex);
          if (match && match[1]) {
            extractedParts.push(match[1]);
          } else {
            eraLogger.warn(`任务 [${task.taskName}] 合并 [${mergeKey}]: 正则未匹配到内容 "${regexStr}"`);
          }
        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 提取正则错误: ${regexStr}`, e);
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
  if (getLastMessageId() == 0) {
    toastr.warning('请不要重算0层变量');
    return;
  }
  await performRollback();
  toastr.info('开始重算分步分析');
  await handleAsyncAnalyzeTasks(getLastMessageId());
};

export const handleLoresFilter = async (lores: any) => {
  initWatcher();
  if (loreList.value.length > 0) {
    eraLogger.log('Applying WorldInfo Filter:', loreList.value, 'IsReversed:', isReversed.value);
    await WorldInfoUtil.removeLoresByArray(lores, loreList.value, isReversed.value);
  }
};
