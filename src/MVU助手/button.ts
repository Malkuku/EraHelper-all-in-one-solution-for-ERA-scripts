/**
 * 注册酒馆助手按钮
 */
import { useUiStore } from './stores/UIStore';
import { reSendEraUpdate } from '@/MVU助手/AsyncAnalyze/AsyncAnalyzeService';

$(() => {
  replaceScriptButtons([
    { name: '🐱MVU助手', visible: true },
    { name: '🍬重算分步任务', visible: true },
  ]);

  eventOn(getButtonEvent('🐱MVU助手'), () => {
    useUiStore().showUI = !useUiStore().showUI;
    useUiStore().getModeSetting();
  });

  eventOn(getButtonEvent('🍬重算分步任务'), async () => {
    await reSendEraUpdate();
  });
});
