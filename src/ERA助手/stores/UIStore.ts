import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useUiStore = defineStore('KatUI', () => {
  // 是否显示UI
  const showUI = ref(false);
  // 收集的路径列表
  const collectedPaths = ref<string[]>([]);
  // 黑夜模式
  const darkMode = ref(false);
  // 新增：是否隐藏 Toast 弹窗
  const hideToast = ref(false);

  /**
   * 监听 hideToast 变化，动态注入或移除 CSS
   * 修复：针对 iframe 环境，操作父窗口的 DOM
   */
  watch(hideToast, (val) => {
    const styleId = 'kat-ui-hide-toast-style';

    // 关键修改：尝试获取父窗口的 document，如果不存在（比如不是iframe）则使用当前 document
    let targetDoc: Document;
    try {
      targetDoc = window.parent ? window.parent.document : document;
    } catch (e) {
      // 防止跨域报错（虽然在 ST 插件中通常同源）
      console.warn('无法访问父窗口 document，尝试使用当前窗口', e);
      targetDoc = document;
    }

    const existingStyle = targetDoc.getElementById(styleId);

    if (val) {
      // 如果需要隐藏且样式标签不存在，则创建
      if (!existingStyle) {
        const style = targetDoc.createElement('style');
        style.id = styleId;
        // 使用 !important 强制覆盖，并增加选择器权重
        style.textContent = `
          #toast-container .toast-info { display: none !important; }
          /* 如果需要连容器一起隐藏，可以取消下面注释，但可能会影响其他类型的 toast */
          /* #toast-container { pointer-events: none !important; } */
        `;
        targetDoc.head.appendChild(style);
      }
    } else if (existingStyle) {
        existingStyle.remove();
    }
  }, { immediate: true });

  /**
   * 尝试从变量中获取UI设置
   */
  const getModeSetting = async () => {
    // 假设 getVariables 和 getScriptId 是全局可用的
    // 注意：如果在 iframe 中，这些全局函数可能需要通过 window.parent.xxx 调用，
    // 或者 ST 的插件加载器已经将它们注入到了 iframe 的 window 中。
    // 这里保持原样，假设 API 调用是正常的。
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    darkMode.value = variables.darkMode || false;
    hideToast.value = variables.hideToast || false;
  };

  /**
   * 保存UI设置
   */
  const saveModeSetting = async () => {
    const settingsToSave = {
      darkMode: darkMode.value,
      hideToast: hideToast.value
    };

    const cleaned = JSON.parse(JSON.stringify(settingsToSave));

    updateVariablesWith(
      vars => ({
        ...vars,
        ...cleaned,
      }),
      { type: 'script', script_id: getScriptId() },
    );
  };

  return {
    showUI,
    collectedPaths,
    darkMode,
    hideToast,
    getModeSetting,
    saveModeSetting,
  };
});
