import { ERAEvents } from '@/Constants/ERAEvent';
import { eraLogger } from '../utils/MvuHelperLogger';
import {
  getAsyncAnalyzeStore,
  isAnalyzing,
  setIsAnalyzing,
  currentAnalysisRunId,
  incrementRunId
} from './AsyncAnalyzeState';
import { updateGlobalBlacklist } from './AsyncAnalyzeFilter';
import { createBackup, performRollback } from './AsyncAnalyzeBackup';
import { processMainMessageVariables, applyGroupResults } from './AsyncAnalyzeResultHandler';
import { executeSingleTask, restoreGlobalPreset } from './AsyncAnalyzeTaskRunner';
import { initWatcher } from './AsyncAnalyzeEvents';
import { TaskResult } from './AsyncAnalyzeTypes';

/**
 * 核心：处理分步分析任务队列
 */
export const handleAsyncAnalyzeTasks = async (message_id: number, triggeringEvent: string = '') => {
  const store = getAsyncAnalyzeStore();
  const ruleName = store.activeRuleName;
  const currentRule = store.asyncAnalyzeSetting[ruleName];

  if (!currentRule || !currentRule.staged_setting) {
    setIsAnalyzing(false);
    return;
  }

  const thisRunId = incrementRunId();

  await createBackup(message_id, ruleName);

  const tasks = Object.entries(currentRule.staged_setting).map(([taskName, config]) => ({
    taskName,
    ...config
  }));

  const enabledTasks = tasks.filter(t => {
    if (triggeringEvent) {
      return t.event_name === triggeringEvent;
    } else {
      return t.enable;
    }
  });

  if (enabledTasks.length === 0) {
    eraLogger.info(`没有找到匹配当前触发条件的任务 (Event: "${triggeringEvent}")`);
    await processMainMessageVariables(message_id);
    // 注意：这里不 return，继续执行 finally 清理
  }

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
      if (currentAnalysisRunId !== thisRunId) break;

      const groupTasks = taskGroups.get(order)!;
      eraLogger.log(`正在执行第 ${order} 阶任务组，共 ${groupTasks.length} 个任务`);
      if (!triggeringEvent) {
        toastr.info(`正在执行第 ${order} 阶任务组，共 ${groupTasks.length} 个任务`);
      }

      const groupResults: TaskResult[] = [];

      const promises = groupTasks.map(async (task, index) => {
        if (currentAnalysisRunId !== thisRunId) return;

        const currentFloor = message_id;
        const lastTrigger = task.trigger_history || 0;

        if (task.trigger_index > 1 && (currentFloor - lastTrigger) < task.trigger_index) {
          eraLogger.log(`任务 [${task.taskName}] 跳过: 未达到触发间隔`);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, index * 1000));

        try {
          const result = await executeSingleTask(task, message_id, thisRunId);
          if (result) {
            groupResults.push(result);
          }
          pendingTriggerUpdates.set(task.taskName, currentFloor);
        } catch (e) {
          if (currentAnalysisRunId !== thisRunId) return;
          eraLogger.error(`任务 [${task.taskName}] 执行失败:`, e);

          let retrySuccess = false;
          if (task.reroll_count > 0) {
            for(let i=0; i<task.reroll_count; i++){
              if (currentAnalysisRunId !== thisRunId) break;
              try {
                eraLogger.log(`任务 [${task.taskName}] 重试第 ${i+1} 次`);
                const result = await executeSingleTask(task, message_id, thisRunId);
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
          if (!retrySuccess) throw new Error(`任务 [${task.taskName}] 最终执行失败`);
        }
      });

      await Promise.all(promises);

      if (groupResults.length > 0 && currentAnalysisRunId === thisRunId) {
        await applyGroupResults(groupResults, message_id);
      }
    }

    if (pendingTriggerUpdates.size > 0 && currentAnalysisRunId === thisRunId) {
      let hasUpdates = false;
      pendingTriggerUpdates.forEach((floor, taskName) => {
        if (store.asyncAnalyzeSetting[ruleName]?.staged_setting?.[taskName]) {
          store.asyncAnalyzeSetting[ruleName].staged_setting[taskName].trigger_history = floor;
          hasUpdates = true;
        }
      });
      if (hasUpdates) await store.saveModelSettings();
    }

    if (!triggeringEvent && currentAnalysisRunId === thisRunId) {
      toastr.success('所有分步分析任务执行完成');
    } else if (currentAnalysisRunId === thisRunId) {
      eraLogger.info(`事件 ${triggeringEvent} 触发的任务执行完成`);
    }

  } catch (err) {
    incrementRunId(); // 作废当前ID
    eraLogger.error('分步分析流程发生严重错误，正在回滚...', err);
    toastr.error('执行出错，正在回滚数据...');
    await performRollback();
  } finally {
    setIsAnalyzing(false);
    await restoreGlobalPreset(); // 任务全部完成后，统一还原预设
    await updateGlobalBlacklist();
    await (window as any).eventEmit(ERAEvents.FORCE_SYNC);
    if (!triggeringEvent) {
      await (window as any).eventEmit('kat:handle_era_finished');
    }
    await (window as any).setChatMessages([{ message_id: message_id}]);
  }
};

/**
 * 处理接收到的massage_received事件
 */
export const handleMessageReceived = async (message_id: number) => {
  try {
    initWatcher();

    if ((window as any).getLastMessageId() == 0 || message_id == 0) {
      return;
    }

    if(getChatMessages(-1)[0].message.length < 300){
      toastr.error('空回了喵~已阻止变量更新');
      return;
    }

    const store = getAsyncAnalyzeStore();
    if (!store.activeRuleName || !store.asyncAnalyzeSetting[store.activeRuleName]) {
      return;
    }

    if (isAnalyzing.value) {
      toastr.warning('上一个分析任务尚未完成');
      return;
    }

    setIsAnalyzing(true);
    toastr.info('开始执行分步分析规则...');
    eraLogger.info(`开始执行分步分析规则: ${store.activeRuleName}`);

    handleAsyncAnalyzeTasks(message_id, '');

  } catch (e) {
    eraLogger.error('分步分析主流程异常:', e);
    toastr.error('分步分析执行出错');
  }
};

/**
 * 重算请求
 */
export const reSendEraUpdate = async () => {
  const currentMessageId = (window as any).getLastMessageId();
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

  toastr.success('开始重算分步分析');
  await handleAsyncAnalyzeTasks(currentMessageId, '');
};
