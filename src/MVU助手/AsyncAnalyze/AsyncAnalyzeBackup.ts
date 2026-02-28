import { MessageUtil } from '@/Utils/MessageUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { AnalyzeBackupState } from '../stores/AsyncAnalyzeStore';
import { eraLogger } from '../utils/MvuHelperLogger';
import { getAsyncAnalyzeStore } from './AsyncAnalyzeState';
import { MvuUtil } from '@/Utils/MvuUtil';

/**
 * 创建备份快照
 */
export const createBackup = async (message_id: number, ruleName: string) => {
  const store = getAsyncAnalyzeStore();
  const currentRule = store.asyncAnalyzeSetting[ruleName];
  if (!currentRule || !currentRule.task_refs) return;

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

  for (const taskName of currentRule.task_refs) {
    const taskConfig = store.taskConfigSettings[taskName];
    if (!taskConfig) continue;

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
 * 执行回滚
 */
export const performRollback = async (currentMessageId?: number) => {
  const store = getAsyncAnalyzeStore();
  const backup = store.savedBackupState;

  if (!backup) {
    toastr.warning('没有可用的备份数据');
    return;
  }

  const actualCurrentMessageId = currentMessageId !== undefined ? currentMessageId : (window as any).getLastMessageId();

  if (actualCurrentMessageId !== backup.messageId) {
    const msg = `当前楼层 (${actualCurrentMessageId}) 与备份楼层 (${backup.messageId}) 不同，跳过回滚`;
    toastr.info(msg);
    eraLogger.info(msg);
    return;
  }

  toastr.info('正在回滚分步分析数据...');
  eraLogger.info('开始回滚分步分析数据...');

  try {
    const rule = store.asyncAnalyzeSetting[backup.ruleName];
    if (rule && rule.task_refs) {
      for (const [taskName, historyFloor] of Object.entries(backup.triggerHistory)) {
        if (store.taskConfigSettings[taskName]) {
          store.taskConfigSettings[taskName].trigger_history = historyFloor;
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
    await MvuUtil.backUpMvuData();

  } catch (e) {
    eraLogger.error('回滚失败:', e);
    toastr.error('回滚失败，请检查日志');
  }
};
