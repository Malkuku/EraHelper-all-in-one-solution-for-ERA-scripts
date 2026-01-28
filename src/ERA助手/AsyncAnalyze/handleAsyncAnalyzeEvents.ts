import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { PromptUtil } from '@/Utils/PromptUtil';
import { MessageUtil } from '@/Utils/MessageUtil';
import { ERAEvents } from '@/Constants/ERAEvent';
import { useAsyncAnalyzeStore } from '../stores/AsyncAnalyzeStore';
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
const isReversed = ref(false); // Default false: remove items in loreList. Set to true if you want to KEEP only items in loreList.

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
  // 检查 rule 是否存在以及是否有 world_book 配置
  if (!rule || !rule.world_book) {
    loreList.value = [];
    return;
  }

  try {
    loreList.value = await processWorldBookConfig(rule.world_book);
    // eraLogger.log('Global Lore List Updated:', loreList.value);
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
    // 获取该书所有条目
    const allEntries = await WorldInfoUtil.getWorldBookLoresByName(bookName);

    if (config.lore_regex) {
      try {
        const regex = new RegExp(config.lore_regex);
        const matchedEntries = allEntries.filter(name => regex.test(name));
        // 合并到配置的 lores 中 (去重)
        config.lores = [...new Set([...(config.lores || []), ...matchedEntries])];
      } catch (e) {
        eraLogger.error(`Regex error in world book config [${bookName}]:`, e);
      }
    }

    // 收集条目
    if (config.lores && config.lores.length > 0) {
      resultLores.push(...config.lores);
    }
  }

  return [...new Set(resultLores)]; // 最终去重
};

/**
 * 处理接收到的massage_received事件
 */
export const handleMessageReceived = async (message_id: number) => {
  try {
    initWatcher(); // 确保监听器已初始化

    if (getLastMessageId() == 0 || message_id == 0) {
      return;
    }

    const store = getAsyncAnalyzeStore();
    // 确保配置已加载
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
    // 任务完成后，恢复为全局配置
    await updateGlobalLoreList();

    // 触发一次同步以确保UI更新
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

  // 1. 任务分组与排序 (从 staged_setting 中获取)
  const tasks = Object.entries(currentRule.staged_setting).map(([taskName, config]) => ({
    taskName,
    ...config
  }));

  // 过滤掉未启用的任务
  const enabledTasks = tasks.filter(t => t.enable);

  // 按 order 排序
  const sortedTasks = enabledTasks.sort((a, b) => a.order - b.order);

  // 按 order 分组 (Map<order, Task[]>)
  const taskGroups = new Map<number, typeof sortedTasks>();
  sortedTasks.forEach(task => {
    if (!taskGroups.has(task.order)) {
      taskGroups.set(task.order, []);
    }
    taskGroups.get(task.order)!.push(task);
  });

  // 获取排序后的 order key
  const sortedOrders = Array.from(taskGroups.keys()).sort((a, b) => a - b);

  // 2. 顺序执行分组，组内并行
  for (const order of sortedOrders) {
    const groupTasks = taskGroups.get(order)!;
    eraLogger.log(`正在执行第 ${order} 阶任务组，共 ${groupTasks.length} 个任务`);

    // 创建并行执行的 Promise 数组
    const promises = groupTasks.map(async (task, index) => {
      // 检查触发间隔
      const currentFloor = message_id;
      const lastTrigger = task.trigger_history || 0;

      // 如果 trigger_index > 1，则需要判断间隔
      if (task.trigger_index > 1 && (currentFloor - lastTrigger) < task.trigger_index) {
        eraLogger.log(`任务 [${task.taskName}] 跳过: 未达到触发间隔 (当前:${currentFloor}, 上次:${lastTrigger}, 间隔:${task.trigger_index})`);
        return;
      }

      // 间隔防抖：组内任务每隔1秒启动一个
      await new Promise(resolve => setTimeout(resolve, index * 1000));

      try {
        await executeSingleTask(task, message_id);

        // 更新触发历史
        if (store.asyncAnalyzeSetting[ruleName]?.staged_setting?.[task.taskName]) {
          store.asyncAnalyzeSetting[ruleName].staged_setting[task.taskName].trigger_history = currentFloor;
        }
      } catch (e) {
        eraLogger.error(`任务 [${task.taskName}] 执行失败:`, e);
        toastr.error(`任务 [${task.taskName}] 执行失败`);

        // 简单的重试逻辑 (reroll_count)
        if (task.reroll_count > 0) {
          for(let i=0; i<task.reroll_count; i++){
            try {
              eraLogger.log(`任务 [${task.taskName}] 重试第 ${i+1} 次`);
              await executeSingleTask(task, message_id);
              // 成功则退出重试循环
              if (store.asyncAnalyzeSetting[ruleName]?.staged_setting?.[task.taskName]) {
                store.asyncAnalyzeSetting[ruleName].staged_setting[task.taskName].trigger_history = currentFloor;
              }
              break;
            } catch(retryE) {
              eraLogger.error(`任务 [${task.taskName}] 重试失败:`, retryE);
            }
          }
        }
      }
    });

    // 等待当前组所有任务完成
    await Promise.all(promises);
  }

  // 所有任务完成后，保存状态
  await store.saveModelSettings();
  toastr.success('所有分步分析任务执行完成');
};

/**
 * 执行单个任务
 */
async function executeSingleTask(task: any, message_id: number) {
  const store = getAsyncAnalyzeStore();
  eraLogger.info(`>>> 开始执行任务: ${task.taskName}`);
  toastr.info(`开始执行任务: ${task.taskName}`);

  // 1. 准备 API 配置
  const apiConfigName = task.api_config;
  const apiConfig = store.apiConfigSettings[apiConfigName];
  if (!apiConfig) {
    eraLogger.error(`找不到 API 配置: ${apiConfigName}`);
    toastr.error(`找不到 API 配置: ${apiConfigName}`);
    throw new Error(`找不到 API 配置: ${apiConfigName}`);
  }

  // 2. 处理 World Book 逻辑 (任务级)
  // 获取所有绑定世界书的条目，正则匹配，合并到 lores，并更新 loreList.value
  if (task.world_book) {
    loreList.value = await processWorldBookConfig(task.world_book);
  } else {
    loreList.value = [];
  }

  // 3. 构建 Prompt
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

  // 4. 切换/准备模型环境
  const originalPresetName = getLoadedPresetName();
  let tempPresetLoaded = false;

  try {
    // 切换预设逻辑
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

    // 5. 发送请求
    let result = '';
    const is_should_stream = false;

    if (apiConfig.model_source === 'sample') {
      result = await PromptUtil.sendPrompt(
        user_input,
        promptInjects,
        maxHistory,
        is_should_stream,
        null,
        null
      );
    } else if (apiConfig.model_source === 'profile') {
      result = await PromptUtil.sendPrompt(
        user_input,
        promptInjects,
        maxHistory,
        is_should_stream,
        null,
        apiConfig.profileSetting
      );
    } else {
      // External
      result = await PromptUtil.sendPrompt(
        user_input,
        promptInjects,
        maxHistory,
        is_should_stream,
        apiConfig.custom_model_settings,
        null
      );
    }

    eraLogger.log(`任务 [${task.taskName}] 原始输出:`, result);

    // 6. 处理结果合并
    await handleTaskResultMerge(task, result, message_id);

  } finally {
    // 恢复预设
    if (tempPresetLoaded) {
      loadPreset(originalPresetName);
    }
    // 注意：loreList 在这里不重置为空，而是由外层循环或 finally 块恢复为全局配置
    // 但为了防止并行任务干扰，这里其实应该考虑并发问题。
    // 目前逻辑是：任务组内并行。如果多个任务同时修改 loreList，会有冲突。
    // 但 loreList 是全局 ref。
    // TODO: 如果需要完全隔离，PromptUtil 需要支持传入 lores 而不是依赖全局 handleLoresFilter。
    // 鉴于目前架构，假设任务组内的 world_book 配置不冲突，或者接受最后一次写入的值。
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

    // ---------------------------------------------------------
    // 1. 提取内容 (Parallel Extraction)
    // ---------------------------------------------------------
    let finalExtractedContent = '';

    // 如果定义了提取正则，则从 result 中提取
    if (content_regex && Array.isArray(content_regex) && content_regex.length > 0) {
      const extractedParts: string[] = [];
      let allMatched = true;

      for (const regexStr of content_regex) {
        try {
          // 使用 's' 标志允许 . 匹配换行符
          const regex = new RegExp(regexStr, 's');
          // 注意：这里每次都匹配原始的 result
          const match = result.match(regex);

          if (match && match[1]) {
            extractedParts.push(match[1]);
          } else {
            // 如果要求必须匹配但没匹配到，记录警告
            eraLogger.warn(`任务 [${task.taskName}] 合并 [${mergeKey}]: 正则未匹配到内容 "${regexStr}"`);
            // 根据需求，这里可以选择是否中断。
            // 如果 "必须逐个匹配" 意味着缺一不可，则标记失败
            // allMatched = false;
          }
        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 提取正则错误: ${regexStr}`, e);
          allMatched = false;
        }
      }

      // 将所有提取到的部分拼接（这里默认用换行符拼接，可根据需求调整）
      if (extractedParts.length > 0) {
        finalExtractedContent = extractedParts.join('\n');
      } else {
        // 如果所有正则都没匹配到东西，跳过此合并项
        continue;
      }
    } else {
      // 如果没定义 content_regex，则默认使用全部输出
      finalExtractedContent = result;
    }

    // ---------------------------------------------------------
    // 2. 处理注入/替换逻辑
    // ---------------------------------------------------------

    if (is_inject) {
      // === 场景 A: 注入到聊天正文 ===
      // 忽略 world_book 设置

      if (replace_regex) {
        // 策略：获取当前正文 -> 查找 replace_regex -> 替换为 finalExtractedContent -> 保存
        try {
          const currentMessageContent = MessageUtil.getMessageById(message_id);
          const regex = new RegExp(replace_regex, 'g'); // 全局替换

          if (regex.test(currentMessageContent)) {
            const newMessageContent = currentMessageContent.replace(regex, finalExtractedContent);
            await setChatMessages([{ message_id, message: newMessageContent }]);
            eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 正文内容已根据正则替换`);
          } else {
            eraLogger.warn(`任务 [${task.taskName}] 合并 [${mergeKey}]: 正文中未找到可替换的内容 (正则: ${replace_regex})`);
          }
        } catch (e) {
          eraLogger.error(`任务 [${task.taskName}] 正文替换执行出错:`, e);
        }
      } else {
        // 策略：直接追加到正文末尾
        await MessageUtil.mergeContentToMessage(message_id, `\n${finalExtractedContent}`);
        eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 内容已追加到正文`);
      }

    } else if (world_book && target_lore) {
      // === 场景 B: 写入世界书 ===
      // 仅当 is_inject 为 false 时执行

      if (replace_regex) {
        // 策略：获取条目内容 -> 查找 replace_regex -> 替换为 finalExtractedContent -> 保存
        const oldContent = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);

        if (oldContent) {
          try {
            const regex = new RegExp(replace_regex, 'g');
            if (regex.test(oldContent)) {
              const newContent = oldContent.replace(regex, finalExtractedContent);
              await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, newContent);
              eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 内容已替换更新`);
            } else {
              eraLogger.warn(`任务 [${task.taskName}] 合并 [${mergeKey}]: 世界书条目中未找到可替换的内容`);
            }
          } catch (e) {
            eraLogger.error(`任务 [${task.taskName}] 世界书替换执行出错:`, e);
          }
        } else {
          // 条目不存在，跳过
          eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 世界书条目不存在，跳过任务`);
        }
      } else {
        // 策略：覆盖/创建条目
        // eslint-disable-next-line no-lonely-if
        if (finalExtractedContent && finalExtractedContent.trim().length > 0) {
          await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, finalExtractedContent);
          eraLogger.info(`任务 [${task.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 已覆盖更新`);
        } else {
          eraLogger.warn(`任务 [${task.taskName}] 合并 [${mergeKey}]: 提取内容为空，跳过写入世界书`);
        }
      }
    }

    if (finalExtractedContent.includes('<VariableEdit>')) {
      await handleEraRules(finalExtractedContent);
    }
  }
}

/**
 * 处理ERA变量更新 (Legacy Logic Preserved)
 */
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

/**
 * 重发变量更新
 */
export const reSendEraUpdate = async () => {
  if (getLastMessageId() == 0) {
    toastr.warning('请不要重算0层变量');
    return;
  }
  toastr.info('开始重算分步分析');
  await handleAsyncAnalyzeTasks(getLastMessageId());
};

/**
 * 处理世界书内容的排除
 * 此函数由事件系统自动调用
 */
export const handleLoresFilter = async (lores: any) => {
  initWatcher(); // 确保监听器已初始化

  if (loreList.value.length > 0) {
    eraLogger.log('Applying WorldInfo Filter:', loreList.value, 'IsReversed:', isReversed.value);
    await WorldInfoUtil.removeLoresByArray(lores, loreList.value, isReversed.value);
  }
};
