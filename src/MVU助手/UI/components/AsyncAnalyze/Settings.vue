<template>
  <div :class="{ 'dark-mode': uiStore.darkMode }" class="settings-container">
    <div class="setting-group">
      <h4>通用设置</h4>

      <div class="setting-item">
        <div class="label">
          <span>隐藏预设切换提示</span>
          <small>隐藏 SillyTavern 右上角的蓝色 Info 弹窗</small>
        </div>
        <label class="switch">
          <input
            v-model="uiStore.hideToast"
            type="checkbox"
            @change="uiStore.saveModeSetting"
          >
          <span class="slider round"></span>
        </label>
      </div>

      <!-- 你可以在这里添加更多额外功能 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/MVU助手/stores/UIStore';
const uiStore = useUiStore();
</script>

<style scoped lang="scss">
.settings-container {
  padding: 20px;
  color: #111827;
}

.setting-group {
  margin-bottom: 20px;

  h4 {
    margin-bottom: 15px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 5px;
  }
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(0,0,0,0.02);
  border-radius: 8px;

  .label {
    display: flex;
    flex-direction: column;
    span { font-weight: 500; }
    small { color: #6b7280; font-size: 12px; margin-top: 2px; }
  }
}

/* 简单的开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 22px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider { background-color: #6366f1; }
input:checked + .slider:before { transform: translateX(18px); }

/* Dark mode 适配 */
.dark-mode .settings-container {
  color: #e2e8f0;
  .setting-group h4 { border-bottom-color: #4b5563; }
  .setting-item { background: rgba(255,255,255,0.05); }
  .setting-item .label small { color: #9ca3af; }
}
</style>
