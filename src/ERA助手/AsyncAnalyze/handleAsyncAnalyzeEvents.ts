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

// [核心修复] 过滤锁，用于解决并行过滤的竞态问题
let filterLockChain = Promise.resolve();

// [新增] 生成锁，用于解决并行任务中切换预设/宏的竞态问题
let generationLock = Promise.resolve();

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
  }
};

// 定义任务结果接口
interface TaskResult {
  taskName: string;
  extractedContent: string;
  mergeSettings: any;
  variableEdits: Record<string, any>; // 提取出的变量修改
}

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

      // [核心修复] 并行执行任务，但不立即修改数据，而是收集结果
      const groupResults: TaskResult[] = [];

      const promises = groupTasks.map(async (task, index) => {
        const currentFloor = message_id;
        const lastTrigger = task.trigger_history || 0;

        if (task.trigger_index > 1 && (currentFloor - lastTrigger) < task.trigger_index) {
          eraLogger.log(`任务 [${task.taskName}] 跳过: 未达到触发间隔`);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, index * 1000));

        try {
          // 执行任务并获取结果，不进行副作用修改
          const result = await executeSingleTask(task, message_id);
          if (result) {
            groupResults.push(result);
          }
          pendingTriggerUpdates.set(task.taskName, currentFloor);
        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 执行失败:`, e);

          let retrySuccess = false;
          if (task.reroll_count > 0) {
            for(let i=0; i<task.reroll_count; i++){
              try {
                eraLogger.log(`任务 [${task.taskName}] 重试第 ${i+1} 次`);
                const result = await executeSingleTask(task, message_id);
                if (result) {
                  groupResults.push(result);
                }
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

      // [核心修复] 并行任务全部结束后，统一顺序应用修改
      // 这样可以解决并行修改信息的竞态问题，同时保证下一组任务能获取到更新后的信息
      if (groupResults.length > 0) {
        await applyGroupResults(groupResults, message_id);
      }
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
  }finally {
    isAnalyzing = false;
    // 任务结束后，重新计算一次黑名单，确保最新的世界书变动被捕获
    await updateGlobalBlacklist();
    await eventEmit(ERAEvents.FORCE_SYNC);
    await eventEmit('kat:handle_era_finished');
    await setChatMessages([{ message_id: message_id}]);
  }
};

/**
 * 执行单个任务 - 仅生成和提取，不修改数据
 * [修改] 引入 generationLock 确保生成过程（含预设切换）串行执行
 * [修复] 解决并行任务中 blacklistLores 全局变量被覆盖的竞态问题
 */
async function executeSingleTask(task: any, message_id: number): Promise<TaskResult | null> {
  const store = getAsyncAnalyzeStore();
  eraLogger.info(`>>> 开始执行任务: ${task.taskName}`);
  toastr.info(`正在执行分步任务: ${task.taskName}`);

  const apiConfigName = task.api_config;
  const apiConfig = store.apiConfigSettings[apiConfigName];
  if (!apiConfig) throw new Error(`找不到 API 配置: ${apiConfigName}`);

  // 1. [修改] 在锁外先计算好当前任务需要的黑名单，暂存到局部变量，不修改全局 ref
  let localTaskBlacklist: string[] = [];

  if (task.world_book) {
    try {
      const tempBlacklist: string[] = [];
      for (const [bookName, wbConfig] of Object.entries(task.world_book)) {
        const config = wbConfig as any;
        let allEntries: string[] = [];
        // 这里可能有 IO，放在锁外并行执行效率更高
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
          tempBlacklist.push(...allEntries.filter(e => !whitelist.has(e)));
        }
      }
      localTaskBlacklist = [...new Set(tempBlacklist)];
    } catch(e) {
      eraLogger.error('Task world_book processing failed', e);
      localTaskBlacklist = [];
    }
  } else {
    localTaskBlacklist = [];
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

  // [核心修改] 使用锁串行执行生成过程
  await (generationLock = generationLock.then(async () => {
    // 2. [核心修复] 进入锁之后，才将局部计算的黑名单应用到全局变量
    // 这样保证了在 sendPrompt 执行期间，blacklistLores.value 绝对是当前任务的数据
    blacklistLores.value = localTaskBlacklist;
    console.log(`任务 [${task.taskName}] 已应用黑名单，数量: ${blacklistLores.value.length}`);

    // 3. 注册宏
    (window as any).SillyTavern.registerMacro('lastUserMessage', () => {
      return user_input;
    });

    const originalPresetName = getLoadedPresetName();
    let tempPresetLoaded = false;
    let tempProfileSetting = null;

    try {
      // 4. 切换预设 (Profile / Preset)
      if (apiConfig.model_source === 'profile' && apiConfig.profileSetting) {
        tempProfileSetting = ((await (window as any).SillyTavern.executeSlashCommands('/profile')) as any).pipe;
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${apiConfig.profileSetting}`);
      }

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

      // 5. 发送请求 (此时触发事件，handleLoresFilter 会读取到正确的 blacklistLores)
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
      // 6. 恢复预设
      if (tempProfileSetting) {
        await (window as any).SillyTavern.executeSlashCommands(`/profile ${tempProfileSetting}`);
      }

      if (tempPresetLoaded) {
        loadPreset(originalPresetName);
      }

      // 7. 注销宏
      (window as any).SillyTavern.unregisterMacro('lastUserMessage');

      // 可选：任务完成后清空黑名单，防止影响后续非任务操作（虽然下一个任务会覆盖它）
      // blacklistLores.value = [];
    }
  }).catch(e => {
    throw e;
  }));

  // 提取变量修改数据
  const { cleanContent, variableEdits } = extractVariableEdits(result);

  return {
    taskName: task.taskName,
    extractedContent: cleanContent,
    mergeSettings: task.merge_setting,
    variableEdits: variableEdits
  };
}


/**
 * 辅助函数：从文本中提取 <VariableEdit> 并返回 JSON 对象和清理后的文本
 */
function extractVariableEdits(content: string): { cleanContent: string, variableEdits: Record<string, any> } {
  const regexInnermost = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>/g;
  const matches = Array.from(content.matchAll(regexInnermost));

  let mergedEditData: Record<string, any> = {};

  if (matches.length === 0) {
    return { cleanContent: content, variableEdits: {} };
  }

  for (const match of matches) {
    const jsonStr = match[1];
    if (!jsonStr || !jsonStr.trim()) continue;
    try {
      const editData = JSON.parse(jsonStr);
      mergedEditData = JsonUtil.mergeDeep(mergedEditData, editData);
    } catch (e) {
      console.warn('忽略无效的 VariableEdit 内容:', jsonStr);
    }
  }

  // 暂时保留标签占位符，后续应用时会替换为新的状态
  return { cleanContent: content, variableEdits: mergedEditData };
}

/**
 * [核心修复] 统一应用一组任务的结果
 */
async function applyGroupResults(results: TaskResult[], message_id: number) {
  // 1. 合并并应用所有变量修改
  let allVariableEdits: Record<string, any> = {};
  for (const res of results) {
    allVariableEdits = JsonUtil.mergeDeep(allVariableEdits, res.variableEdits);
  }

  let newVariableStateString = '';
  if (Object.keys(allVariableEdits).length > 0) {
    try {
      const snapshotData = await getEraEditStore().getStatData();
      if (snapshotData != null) {
        const rules = getEraDataStore().eraDataRule;
        const { data: updatedData } = await EraDataHandler.applyRule(allVariableEdits, snapshotData, rules);
        const updatedContent = JSON.stringify(updatedData);
        newVariableStateString = `<VariableEdit>\n${updatedContent}\n</VariableEdit>`;
      }
    } catch (e) {
      eraLogger.error('变量批量更新失败：', e);
      toastr.error('变量更新失败');
    }
  }

  // 2. 依次应用每个任务的文本修改（世界书/消息）
  for (const res of results) {
    if (!res.mergeSettings) continue;

    // 如果有新的变量状态，替换结果中的占位符
    // 注意：这里假设 extractedContent 中仍然包含 <VariableEdit> 标签
    // 如果 extractVariableEdits 没有移除标签，我们需要用正则替换
    let finalResultContent = res.extractedContent;
    if (newVariableStateString) {
      const regexInnermost = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>/g;
      let isFirstMatch = true;
      finalResultContent = finalResultContent.replace(regexInnermost, () => {
        if (isFirstMatch) {
          isFirstMatch = false;
          return newVariableStateString;
        } else {
          return '';
        }
      });
    } else {
      // 如果没有变量更新，清除标签
      finalResultContent = finalResultContent.replace(/<VariableEdit>[\s\S]*?<\/VariableEdit>/g, '');
    }

    for (const [mergeKey, setting] of Object.entries(res.mergeSettings)) {
      const { is_inject, world_book, target_lore, content_regex, replace_regex } = setting as any;

      let contentToApply = '';

      if (content_regex && Array.isArray(content_regex) && content_regex.length > 0) {
        const extractedParts: string[] = [];
        for (const regexStr of content_regex) {
          const parts = RegexUtils.extractContentByRegex(finalResultContent, regexStr);
          if (parts.length > 0) {
            extractedParts.push(...parts);
          }
        }
        if (extractedParts.length > 0) {
          contentToApply = extractedParts.join('\n');
        } else {
          continue;
        }
      } else {
        contentToApply = finalResultContent;
      }

      // 串行执行 IO 修改，避免竞态
      if (is_inject) {
        if (replace_regex) {
          try {
            // 重新获取最新的消息内容（可能被同组前一个任务修改过）
            const currentMessageContent = MessageUtil.getMessageById(message_id);
            const regex = new RegExp(replace_regex, 'g');
            if (regex.test(currentMessageContent)) {
              const newMessageContent = currentMessageContent.replace(regex, contentToApply);
              await setChatMessages([{ message_id, message: newMessageContent }]);
              eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 正文内容已根据正则替换`);
            }
          } catch (e) {
            eraLogger.error(`任务 [${res.taskName}] 正文替换执行出错:`, e);
          }
        } else {
          await MessageUtil.mergeContentToMessage(message_id, `\n${contentToApply}`);
          eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 内容已追加到正文`);
        }
      } else if (world_book && target_lore) {
        if (replace_regex) {
          const oldContent = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
          if (oldContent) {
            try {
              const regex = new RegExp(replace_regex, 'g');
              if (regex.test(oldContent)) {
                const newContent = oldContent.replace(regex, contentToApply);
                await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, newContent);
                eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 内容已替换更新`);
              }
            } catch (e) {
              eraLogger.error(`任务 [${res.taskName}] 世界书替换执行出错:`, e);
            }
          }
        } else if (contentToApply && contentToApply.trim().length > 0) {
          await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, contentToApply);
          eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 已覆盖更新`);
        }
      }
    }
  }
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
 * 使用 Promise 链 (Mutex) 解决并行过滤的竞态问题
 * 确保同一时间只有一个过滤操作在进行，且按顺序执行
 */
export const handleLoresFilter = async (lores: any) => {
  // 将本次过滤任务加入 Promise 链
  // 无论之前的任务成功与否，都会执行当前任务
  await (filterLockChain = filterLockChain.then(async () => {
    console.info('handleLoresFilter: ', '接收到过滤请求，开始执行');

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
  }).catch(e => {
    eraLogger.error('Critical error in filter lock chain:', e);
  }));
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
