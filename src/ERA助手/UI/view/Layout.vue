<template>
  <div v-if="visible" class="mask" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="card">
      <!-- 顶部按钮组 -->
      <div class="top-button-group">
        <button class="btn" :class="{ active: currentRoute === '/AsyncAnalyze' }" @click="goToRoute('/AsyncAnalyze')">
          <span class="btn-text">📊分步分析配置</span>
        </button>
        <button class="btn" :class="{ active: currentRoute === '/EraDataHandle' }" @click="goToRoute('/EraDataHandle')">
          <span class="btn-text">⚙️Era规则配置</span>
        </button>
        <button class="btn" :class="{ active: currentRoute === '/EraDataEdit' }" @click="goToRoute('/EraDataEdit')">
          <span class="btn-text">📝Era变量编辑</span>
        </button>

        <button class="btn" :class="{ active: currentRoute === '/Version' }" @click="goToRoute('/Version')">
          <span class="btn-text">🍎版本信息</span>
        </button>
        <!--        <button-->
        <!--          v-if="true"-->
        <!--          class="btn"-->
        <!--          :class="{ active: currentRoute === '/tempTest' }"-->
        <!--          @click="goToRoute('/tempTest')"-->
        <!--        >-->
        <!--          <span class="btn-text">临时测试</span>-->
        <!--        </button>-->
      </div>

      <!-- 黑夜模式切换按钮 (新位置：独立浮动) -->
      <button class="mode-switch" title="切换黑夜模式" @click="toggleDarkMode">
        {{ uiStore.darkMode ? '🌙' : '☀️' }}
      </button>

      <!-- 关闭按钮 -->
      <button class="close-x" title="关闭" @click="close">&times;</button>

      <!-- 新增：专门的 router-view 容器区域 -->
      <div class="router-view-container">
        <!-- 内容区 -->
        <div class="content">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../../stores/UIStore';
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const uiStore = useUiStore();
const visible = computed(() => uiStore.showUI);
const router = useRouter();
const route = useRoute();
const currentRoute = ref(route.path);

// 监听路由变化
watch(
  () => route.path,
  newPath => {
    currentRoute.value = newPath;
  },
);

const close = () => {
  uiStore.showUI = false;
};

const goToRoute = (path: string) => {
  router.push(path);
};

const toggleDarkMode = () => {
  uiStore.darkMode = !uiStore.darkMode;
  uiStore.saveModeSetting();
};
</script>

<style scoped lang="scss">
/* 遮罩层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  height: 100vh;
  overflow-y: auto;
  animation: fadeIn 0.2s ease;
}

/* 卡片主体 */
.card {
  position: relative;
  background: linear-gradient(135deg, #dcd8d8 0%, #f8fafc 100%);
  border-radius: 20px;
  width: 90%;
  max-width: 680px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 10000;
  min-height: 750px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

/* 顶部按钮组 - 调整高度和位置 */
.top-button-group {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 20px 20px 0 0;
  padding: 10px 16px;
  gap: 8px;
  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
  z-index: 1;
  height: 56px;
}

/* 新增：router-view 容器 */
.router-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 56px; /* 与顶部按钮组高度相同 */
  padding: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 0 0 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

/* 内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  background: white;
  border-radius: 12px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);

  /* 添加内部填充以确保内容不贴边 */
  & > * {
    padding: 0 8px;
  }

  /* 滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
    margin: 4px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
}

/* 按钮样式 */
.btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #dcd8d8 0%, #f8fafc 100%);
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  min-height: 48px;

  &:hover {
    transform: translateY(-1px);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    color: #475569;
  }

  &.active {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    box-shadow:
      0 2px 8px rgba(99, 102, 241, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);

    .btn-icon {
      opacity: 1;
      transform: scale(1.1);
    }

    .btn-text {
      font-weight: 600;
    }
  }
}

.btn-text {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 500;
  transition: all 0.3s ease;
  margin-top: 2px;
}

/* 黑夜模式切换按钮样式 (新) */
.mode-switch {
  position: absolute;
  top: 62px;
  right: 54px; /* 位于关闭按钮左侧 */
  width: 28px;
  height: 28px;
  border: none;
  background: #f8fafc;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  z-index: 2;

  &:hover {
    background: #e2e8f0;
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

/* 调整关闭按钮位置 */
.close-x {
  position: absolute;
  top: 62px;
  right: 16px;
  width: 28px;
  height: 28px;
  border: none;
  background: #f8fafc;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  z-index: 2;

  &:hover {
    background: #ef4444;
    color: white;
    transform: rotate(90deg);
    box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
  }
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* 响应式调整 */
@media (max-width: 480px) {
  .card {
    max-width: 95%;
    min-height: 360px;
  }

  .router-view-container {
    margin-top: 52px;
    padding: 16px;
  }

  .top-button-group {
    padding: 8px 12px;
    gap: 6px;
    height: 52px;
  }

  .btn {
    padding: 6px 8px;
    min-height: 44px;
    font-size: 11px;
  }

  .btn-text {
    font-size: 12px;
  }

  .mode-switch {
    top: 58px;
    right: 46px;
    width: 26px;
    height: 26px;
    font-size: 14px;
  }

  .close-x {
    top: 58px;
    right: 12px;
    width: 26px;
    height: 26px;
    font-size: 16px;
  }

  .content {
    border-radius: 10px;
  }
}

/* 黑夜模式样式 */
.mask.dark-mode {
  background: rgba(0, 0, 0, 0.85);
}

.dark-mode .card {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.dark-mode .top-button-group {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  border-bottom: 1px solid rgba(100, 100, 100, 0.5);
}

.dark-mode .router-view-container {
  background: rgba(30, 30, 30, 0.7);
  border-top: 1px solid rgba(100, 100, 100, 0.3);
}

.dark-mode .content {
  background: #2d3748;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(0, 0, 0, 0.2);
}

.dark-mode .btn {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  color: #cbd5e0;
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);

  &:hover {
    color: #e2e8f0;
  }
}

.dark-mode .mode-switch {
  background: #4a5568;
  color: #cbd5e0;

  &:hover {
    background: #718096;
    color: white;
  }
}

.dark-mode .close-x {
  background: #4a5568;
  color: #cbd5e0;

  &:hover {
    background: #e53e3e;
  }
}

.dark-mode .btn.active {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  box-shadow:
    0 2px 8px rgba(79, 70, 229, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style>
