/**
 * 注册酒馆助手按钮
 */
import { useUiStore } from './stores/UIStore';
import { reSendEraUpdate } from './AsyncAnalyze/handleAsyncAnalyzeEvents';

$(() => {
  replaceScriptButtons([
    { name: '🐱ERA助手', visible: true },
    { name: '🍬重新分析变量', visible: true },
  ]);

  eventOn(getButtonEvent('🐱ERA助手'), () => {
    useUiStore().showUI = !useUiStore().showUI;
    useUiStore().getModeSetting();
  });

  eventOn(getButtonEvent('🍬重新分析变量'), async () => {
    await reSendEraUpdate();
  });
});
