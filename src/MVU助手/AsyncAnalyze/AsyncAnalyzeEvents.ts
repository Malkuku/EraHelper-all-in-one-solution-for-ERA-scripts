import { watch } from 'vue';
import { eraLogger } from '../utils/MvuHelperLogger';
import { getAsyncAnalyzeStore, isAnalyzing } from './AsyncAnalyzeState';
import { updateGlobalBlacklist } from './AsyncAnalyzeFilter';
// eslint-disable-next-line import-x/no-cycle
import { handleAsyncAnalyzeTasks } from './AsyncAnalyzeService'; // 循环依赖注意：Service 导出函数

let watcherInitialized = false;
let eventListenerCleanups: (() => void)[] = [];

/**
 * 更新事件监听器
 */
const updateEventListeners = () => {
  if (eventListenerCleanups.length > 0) {
    eventListenerCleanups.forEach(cleanup => cleanup());
    eventListenerCleanups = [];
  }

  const store = getAsyncAnalyzeStore();
  if (!store || !store.activeRuleName) return;

  const rule = store.asyncAnalyzeSetting[store.activeRuleName];
  if (!rule || !rule.staged_setting) return;

  const eventsToListen = new Set<string>();
  Object.values(rule.staged_setting).forEach(task => {
    if (task.event_name && task.event_name.trim() !== '') {
      eventsToListen.add(task.event_name.trim());
    }
  });

  eventsToListen.forEach(eventName => {
    const handler = async (...args: any[]) => {
      eraLogger.info(`捕获到自定义事件触发: ${eventName}`, args);
      const currentMessageId = (window as any).getLastMessageId();

      if (isAnalyzing.value) {
        toastr.warning(`事件 ${eventName} 触发，但上一个分析任务尚未完成，已跳过`);
        return;
      }

      // 触发分析
      await handleAsyncAnalyzeTasks(currentMessageId, eventName);
    };

    try {
      (window as any).eventOn(eventName, handler);
      eventListenerCleanups.push(() => {
        try {
          (window as any).eventRemoveListener(eventName, handler);
        } catch (e) {
          console.warn(`[AsyncAnalyze] 移除监听失败: ${eventName}`, e);
        }
      });
    } catch (e) {
      eraLogger.error(`注册事件监听失败 [${eventName}]:`, e);
    }
  });

  if (eventsToListen.size > 0) {
    console.info(`[AsyncAnalyze] 已注册 ${eventsToListen.size} 个自定义事件监听`, eventsToListen);
  }
};

/**
 * 初始化监听器
 */
export const initWatcher = () => {
  if (watcherInitialized) return;
  const store = getAsyncAnalyzeStore();
  if (!store) return;

  watch(
    [() => store.activeRuleName, () => store.asyncAnalyzeSetting],
    () => {
      if (!isAnalyzing.value) {
        updateGlobalBlacklist();
        updateEventListeners();
      }
    },
    { deep: true }
  );

  watcherInitialized = true;
  updateGlobalBlacklist();
  updateEventListeners();
};

/**
 * 等待 Store 就绪并初始化
 */
export const waitForStoreAndInit = () => {
  const store = getAsyncAnalyzeStore();
  if (store) {
    initWatcher();
    console.info('AsyncAnalyzeStore detected, watcher initialized.');
  } else {
    setTimeout(waitForStoreAndInit, 200);
  }
};
