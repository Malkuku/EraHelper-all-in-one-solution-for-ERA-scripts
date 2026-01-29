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

// Changed to ref to allow dynamic updates by tasks
const loreList = ref<string[]>([]);
// [新增] 用于存储当前配置中涉及的世界书名称
const targetBookList = ref<string[]>([]);

// Global lock for analysis
let isAnalyzing = false;
let watcherInitialized = false;

// Global chain for scan operations to prevent concurrent modifications to loreList
let scanChain = Promise.resolve();
// Global chain for merge operations to prevent concurrent writes to shared resources
let mergeChain = Promise.resolve();

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
    targetBookList.value = [];//清空
    return;
  }

  const rule = store.asyncAnalyzeSetting[store.activeRuleName];
  if (!rule || !rule.world_book) {
    loreList.value = [];
    targetBookList.value = [];//清空
    return;
  }

  try {
    //解构获取 lores 和 books
    const { lores, books } = await processWorldBookConfig(rule.world_book);
    loreList.value = lores;
    targetBookList.value = books;
  } catch (e) {
    eraLogger.error('Failed to update global lore list:', e);
    loreList.value = [];
    targetBookList.value = [];
  }
};

/**
 * 辅助函数：处理 WorldBook 配置并返回条目列表
 * [修改] 支持 lore_regex 为数组，满足任意一个正则即可
 */
const processWorldBookConfig = async (worldBookConfig: any): Promise<{ lores: string[], books: string[] }> => {
  const resultLores: string[] = [];
  const resultBooks: string[] = [];

  for (const [bookName, wbConfig] of Object.entries(worldBookConfig)) {
    // 记录涉及的世界书名称
    resultBooks.push(bookName);

    const config = wbConfig as any;
    // 获取该书所有条目用于正则匹配
    let allEntries: string[] = [];
    try {
      allEntries = await WorldInfoUtil.getWorldBookLoresByName(bookName);
    } catch (e) {
      eraLogger.warn(`无法获取世界书 [${bookName}] 的条目，可能不存在。`);
      continue;
    }

    // [修改] 处理正则匹配逻辑
    if (config.lore_regex) {
      try {
        // 确保是数组处理
        const regexList: string[] = Array.isArray(config.lore_regex)
          ? config.lore_regex
          : [];

        // 过滤出有效的正则字符串
        const validRegexList = regexList.filter(r => r && r.trim() !== '');

        if (validRegexList.length > 0) {
          const matchedEntries = allEntries.filter(name => {
            // 只要满足数组中任意一个正则即可 (OR 逻辑)
            return validRegexList.some(regexStr => {
              try {
                return new RegExp(regexStr).test(name);
              } catch (err) {
                return false;
              }
            });
          });
          // 合并结果
          config.lores = [...new Set([...(config.lores || []), ...matchedEntries])];
        }
      } catch (e) {
        eraLogger.error(`Regex error in world book config [${bookName}]:`, e);
      }
    }

    if (config.lores && config.lores.length > 0) {
      resultLores.push(...config.lores);
    }
  }

  return {
    lores: [...new Set(resultLores)],
    books: [...new Set(resultBooks)]
  };
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
 * 添加楼层验证：只有当当前楼层与备份的楼层相同时才进行回滚
 */
export const performRollback = async (currentMessageId?: number) => {
  const store = getAsyncAnalyzeStore();
  const backup = store.savedBackupState;

  if (!backup) {
    toastr.warning('没有可用的备份数据');
    return;
  }

  // 获取当前楼层，优先使用参数传入的楼层，否则使用 getLastMessageId()
  const actualCurrentMessageId = currentMessageId !== undefined ? currentMessageId : getLastMessageId();

  // 验证当前楼层是否与备份的楼层相同
  if (actualCurrentMessageId !== backup.messageId) {
    toastr.info(`当前楼层 (${actualCurrentMessageId}) 与备份楼层 (${backup.messageId}) 不同，跳过回滚`);
    eraLogger.info(`当前楼层 (${actualCurrentMessageId}) 与备份楼层 (${backup.messageId}) 不同，跳过回滚`);
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

    handleAsyncAnalyzeTasks(message_id);

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
  toastr.info(`正在执行分步任务: ${task.taskName}`);

  const apiConfigName = task.api_config;
  const apiConfig = store.apiConfigSettings[apiConfigName];
  if (!apiConfig) throw new Error(`找不到 API 配置: ${apiConfigName}`);

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

    // --- 关键修改开始 ---

    // 我们需要把 "设置 loreList" 和 "触发 sendPrompt 直到扫描结束" 这一段保护起来
    let promptResultPromise: Promise<string>;

    // 加入等待队列
    await new Promise<void>((resolveChain) => {
      // 链接到上一个任务的完成点
      const nextStep = async () => {
        try {
          // 1. 设置全局变量 (现在是安全的，因为上一个任务已经扫描完了)
          if (task.world_book) {
            const { lores, books } = await processWorldBookConfig(task.world_book);
            loreList.value = lores;
            targetBookList.value = books;
          } else {
            loreList.value = [];
            targetBookList.value = [];
          }

          // 2. 准备扫描完成的信号
          const scanDoneSignal = new Promise<void>(resolveScan => {
              const handler = () => {
                  resolveScan();
                  // 监听器会自动移除
              };
              // 监听 ST 事件
              (window as any).eventSource.once('worldinfo_scan_done', handler);

              // 超时兜底 (比如 2000ms)，防止没有世界书导致不触发事件而卡死
              setTimeout(resolveScan, 2000);
          });

          // 3. 触发生成 (注意：这里不要 await 它，否则会变成串行生成)
          // 我们把 Promise 存下来，后面再 await
          if (apiConfig.model_source === 'sample') {
             promptResultPromise = PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, null, null);
          } else if (apiConfig.model_source === 'profile') {
             promptResultPromise = PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, null, apiConfig.profileSetting);
          } else {
             promptResultPromise = PromptUtil.sendPrompt(user_input, promptInjects, maxHistory, is_should_stream, apiConfig.custom_model_settings, null);
          }

          // 4. 等待扫描完成
          // 只有扫描完成了，我们才允许 resolveChain() 被调用，从而让下一个任务进入
          await scanDoneSignal;

        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 启动阶段失败:`, e);
          // 即使失败也要赋值，防止后面 crash
          promptResultPromise = Promise.reject(e);
        } finally {
          // 5. 释放锁，允许下一个任务修改 loreList
          resolveChain();
        }
      };

      // 将当前任务挂载到全局链上
      scanChain = scanChain.then(nextStep);
    });

    // --- 关键修改结束 ---

    // 现在锁已经释放了，下一个任务可能正在修改 loreList，
    // 但当前任务的 promptResultPromise 已经在后台运行（且上下文已固化），我们可以安全地等待结果
    result = await promptResultPromise!; // 等待生成结束
    eraLogger.log(`任务 [${task.taskName}] 原始输出:`, result);

    // --- 合并阶段串行化 ---
    // 将合并操作包装在 mergeChain 中，防止并发写入导致的数据竞争
    // 保持生成的并行性，仅使写入操作串行化
    await new Promise<void>((resolveMerge) => {
      const nextMergeStep = async () => {
        try {
          // 在这里执行所有的读取-修改-写入操作
          // 因为是串行的，所以读取到的数据一定是最新的
          await handleTaskResultMerge(task, result, message_id);
        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 合并结果失败:`, e);
        } finally {
          resolveMerge(); // 无论成功失败，都释放锁，让下一个任务合并
        }
      };

      // 挂载到合并链上
      mergeChain = mergeChain.then(nextMergeStep);
    });

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
        // [修改] 使用统一的提取函数，支持无捕获组的情况
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
  toastr.info('开始重算分步分析');
  await handleAsyncAnalyzeTasks(currentMessageId);
};

/**
 * 处理世界书过滤
 * 逻辑：
 * 1. 找到所有被配置的世界书 (targetBookList)。
 * 2. 获取这些书里的所有条目。
 * 3. 排除掉 loreList (白名单) 中的条目。
 * 4. 剩下的就是"属于被配置的世界书，但不被允许存在的条目"，将它们移除。
 * 5. 未配置的世界书条目完全不受影响。
 */
export const handleLoresFilter = async (lores: any) => {
  initWatcher();

  // 如果没有配置任何世界书，则不进行任何过滤（保留原样）
  if (targetBookList.value.length === 0) {
    return;
  }

  try {
    // 1. 获取所有受控世界书的全量条目
    const allControlledEntries: string[] = [];
    for (const bookName of targetBookList.value) {
      try {
        const entries = await WorldInfoUtil.getWorldBookLoresByName(bookName);
        if (entries && entries.length > 0) {
          allControlledEntries.push(...entries);
        }
      } catch (e) {
        eraLogger.warn(`Filter: Failed to get entries for book [${bookName}]`, e);
      }
    }

    // 2. 计算黑名单：(受控书全量条目) - (允许的条目 loreList)
    // loreList.value 包含了我们希望保留的条目
    const entriesToRemove = allControlledEntries.filter(
      entryName => !loreList.value.includes(entryName)
    );

    // 3. 执行移除
    if (entriesToRemove.length > 0) {
      eraLogger.log('Applying Scoped WorldInfo Filter.');
      eraLogger.log('Configured Books:', targetBookList.value);
      eraLogger.log('Allowed Entries:', loreList.value);
      eraLogger.log('Removing Entries (Blacklist):', entriesToRemove);

      // 使用 isReversed = false，代表"移除数组中存在的条目"
      await WorldInfoUtil.removeLoresByArray(lores, entriesToRemove, false);
    } else {
      eraLogger.log('Scoped WorldInfo Filter: No entries need removal.');
    }

  } catch (e) {
    eraLogger.error('Error during handleLoresFilter:', e);
  }
};
