import { createPinia } from 'pinia';
import { App as VueApp, createApp } from 'vue';
import App from './App.vue';
import { useUiStore } from '../stores/UIStore';
import { createMountPoint, destroyMountPoint, deteleportStyle, teleportStyle } from '../utils/dom';
import {
  handleEraRulesOnMessageReceived,
  handleLoresFilter,
  handleMessageReceived,
} from '../AsyncAnalyze/handleAsyncAnalyzeEvents';
import { useAsyncAnalyzeStore } from '../stores/AsyncAnalyzeStore';
import { router } from './router/router';
import { useEraDataStore } from '../stores/EraDataStore';
import { useEraEditStore } from '../stores/EraEditStore';
import { eraLogger } from '../utils/EraHelperLogger';

let vueApp: VueApp | null = null;
let mountPoint: JQuery<HTMLDivElement> | null = null;

// /**
//  * 切换视图的全局函数
//  * @param viewName 要切换到的视图名称
//  */
// function switchView(viewName: 'FloatingBall' | 'ExpandedView') {
//   eraLogger.debug('switchView', `请求切换视图到: ${viewName}`);
//   // 初始化后，store 实例将可用
//   if ((window as any).eraUiStore) {
//     (window as any).eraUiStore.switchView(viewName);
//   } else {
//     eraLogger.warn('switchView', 'UI store尚未初始化');
//   }
// }

// 暴露切换函数到 window
//(window as any).eraUiSwitchView = switchView;

function unmountVueApp() {
  if (vueApp) {
    eraLogger.debug('unmountVueApp', '卸载 Vue 实例');
    vueApp.unmount();
    vueApp = null;
  }
}

function unloadUI() {
  eraLogger.log('unloadUI', 'UI 脚本开始卸载');
  unmountVueApp();
  deteleportStyle();
  if (mountPoint) {
    eraLogger.debug('unloadUI', '销毁挂载点');
    destroyMountPoint();
    mountPoint = null;
  }
  // 卸载时自我清理，防止内存泄漏
  window.removeEventListener('pagehide', unloadUI);
  eraLogger.log('unloadUI', 'UI 脚本卸载完成');

  // 取消监听事件
  eventClearAll();
}

// 在加载时执行
$(() => {
  eraLogger.log('initialize', 'UI 脚本开始初始化');
  // 创建挂载点
  mountPoint = createMountPoint();
  eraLogger.debug('$(document).ready', '创建挂载点', mountPoint);

  // 将挂载点添加到 body
  $('body').append(mountPoint);
  eraLogger.debug('$(document).ready', '挂载点已添加到 body');

  // 创建并挂载 Vue 实例
  vueApp = createApp(App);
  const pinia = createPinia();
  vueApp.use(pinia);
  vueApp.use(router);
  vueApp.mount(mountPoint[0]);

  // 获取 store 实例并暴露到 window，以便外部函数调用
  eraLogger.debug('initialize', '正在初始化 store 实例');
  (window as any).UiStore = useUiStore(pinia);
  (window as any).AsyncAnalyzeStore = useAsyncAnalyzeStore(pinia);
  useAsyncAnalyzeStore().getModelSettings();
  useAsyncAnalyzeStore().getWorldInfoFilterConfig();
  useAsyncAnalyzeStore().getRegexConfig();
  (window as any).EraDataStore = useEraDataStore(pinia);
  useEraDataStore().getEraDataRules();
  (window as any).EraEditStore = useEraEditStore(pinia);

  // 传送样式，也只执行一次
  teleportStyle();
  eraLogger.debug('initialize', 'Vue App 已挂载，样式已传送');

  // 监听路由变化，重新传输样式
  router.afterEach(() => {
    setTimeout(() => {
      teleportStyle();
    }, 50);
  });

  // 在卸载时执行，并确保只绑定一次
  window.removeEventListener('pagehide', unloadUI); // 先移除旧的
  window.addEventListener('pagehide', unloadUI); // 再添加新的

  // 监听事件
  eventOn(tavern_events.WORLDINFO_ENTRIES_LOADED, handleLoresFilter);
  eventOn(tavern_events.MESSAGE_RECEIVED, handleMessageReceived);
  eventOn(tavern_events.MESSAGE_RECEIVED, handleEraRulesOnMessageReceived);

  // eventOn('kat:handle_era_finished', async ()=>{
  //
  // });

  // 监听 `GENERATE_AFTER_DATA` 事件，在提示词发送前处理 ERA 宏
  //eventOn(tavern_events.GENERATE_AFTER_DATA, handleTestPrompt);
});
