<template>
  <div v-if="visible" class="mask" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="card">
      <!-- 顶部按钮组 -->
      <div class="top-button-group">
        <button class="btn" :class="{ active: currentRoute === '/AsyncAnalyze' }" @click="goToRoute('/AsyncAnalyze')">
          <span class="btn-text">📊分步配置</span>
        </button>
        <button class="btn" :class="{ active: currentRoute === '/VersionUpdater' }" @click="goToRoute('/VersionUpdater')">
          <span class="btn-text">💫更新版本</span>
        </button>
        <button class="btn" :class="{ active: currentRoute === '/EraDataEdit' }" @click="goToRoute('/EraDataEdit')">
          <span class="btn-text">📝变量编辑</span>
        </button>
        <button class="btn" :class="{ active: currentRoute === '/Version' }" @click="goToRoute('/Version')">
          <span class="btn-text">🍎版本信息</span>
        </button>
      </div>

      <!-- 黑夜模式切换按钮 -->
      <button class="mode-switch" title="切换黑夜模式" @click="toggleDarkMode">
        {{ uiStore.darkMode ? '🌙' : '☀️' }}
      </button>

      <!-- 关闭按钮 -->
      <button class="close-x" title="关闭" @click="close">&times;</button>

      <!-- 路由容器 -->
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
  /* 使用 vh 作为回退，dvh 适应移动端地址栏 */
  height: 100vh;
  height: 100dvh;
  overflow: hidden; /* 防止遮罩层本身滚动 */
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
  z-index: 9998;
  min-height: 750px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  max-height: 90dvh;
  overflow: hidden;
}

/* 顶部按钮组 */
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
  z-index: 10; /* 提高层级，防止内容滚动上来遮挡 */
  height: 56px;
  box-sizing: border-box;
}

/* router-view 容器 */
.router-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 56px; /* 避开顶部按钮 */
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
  /* 优化滚动体验 */
  -webkit-overflow-scrolling: touch;

  & > * {
    padding: 0 8px;
  }

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
  min-height: 36px; /* 稍微减小最小高度 */
  height: 100%;

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
  white-space: nowrap; /* 防止文字换行 */
}

/* 模式切换和关闭按钮 */
.mode-switch,
.close-x {
  position: absolute;
  top: 62px;
  width: 28px;
  height: 28px;
  border: none;
  background: #f8fafc;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.mode-switch {
  right: 54px;
  font-size: 16px;
  &:hover {
    background: #e2e8f0;
    transform: scale(1.1);
  }
}

.close-x {
  right: 16px;
  font-size: 18px;
  color: #64748b;
  &:hover {
    background: #ef4444;
    color: white;
    transform: rotate(90deg);
  }
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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

/* --- 移动端全屏优化 --- */
@media (max-width: 480px) {
  .mask {
    /* 移动端不需要内边距，直接全屏 */
    padding: 0;
    align-items: flex-start; /* 从顶部开始 */
  }

  .card {
    /* 强制全屏尺寸 */
    width: 100vw;
    max-width: 100%;
    height: 100vh;
    height: 100dvh; /* 关键：使用 dvh 填满实际可视区域 */
    max-height: none;
    min-height: 0; /* 覆盖默认的 min-height */

    /* 去除圆角，贴合屏幕 */
    border-radius: 0;
    box-shadow: none;

    /* 调整动画为简单的淡入，避免全屏下的位移感 */
    animation: fadeIn 0.2s ease;
  }

  .top-button-group {
    /* 顶部直角 */
    border-radius: 0;
    padding: 8px 4px; /* 减少左右内边距 */
    height: 50px;
    overflow-x: auto; /* 防止按钮过多溢出 */

    /* 隐藏滚动条但保留功能 */
    &::-webkit-scrollbar {
      display: none;
    }
  }

  .btn {
    padding: 4px;
    min-height: auto;
    border-radius: 8px;
  }

  .btn-text {
    font-size: 10px;
    transform: scale(0.9); /* 稍微缩小字体 */
  }

  .router-view-container {
    margin-top: 50px; /* 对应移动端 header 高度 */
    padding: 12px; /* 减少内边距 */
    border-radius: 0; /* 去除底部圆角 */
    height: calc(100dvh - 50px); /* 确保填满剩余高度 */
  }

  .content {
    border-radius: 8px;
  }

  /* 调整浮动按钮位置，避免遮挡内容 */
  .mode-switch {
    top: 56px; /* 紧贴 header 下方 */
    right: 48px;
    width: 32px; /* 稍微加大触摸区域 */
    height: 32px;
    opacity: 0.9;
  }

  .close-x {
    top: 56px;
    right: 8px;
    width: 32px;
    height: 32px;
    opacity: 0.9;
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

.dark-mode .mode-switch,
.dark-mode .close-x {
  background: #4a5568;
  color: #cbd5e0;
}

.dark-mode .mode-switch:hover {
  background: #718096;
  color: white;
}

.dark-mode .close-x:hover {
  background: #e53e3e;
}

.dark-mode .btn.active {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  box-shadow:
    0 2px 8px rgba(79, 70, 229, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style>
