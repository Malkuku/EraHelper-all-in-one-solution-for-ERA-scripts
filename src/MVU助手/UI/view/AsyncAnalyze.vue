<template>
  <div :class="{ 'dark-mode': uiStore.darkMode }" class="main-container">
    <h3 class="title">ERA 分步分析助手</h3>

    <!-- 顶部导航栏 -->
    <div class="page-tabs">
      <router-link
        to="/AsyncAnalyze/Selection"
        class="tab-button"
        active-class="active"
      >
        规则选择
      </router-link>

      <router-link
        to="/AsyncAnalyze/ApiConfig"
        class="tab-button"
        active-class="active"
      >
        API配置
      </router-link>

      <router-link
        to="/AsyncAnalyze/Editor"
        class="tab-button"
        active-class="active"
      >
        规则编辑
      </router-link>

      <!-- 新增：额外功能/设置路由 -->
      <router-link
        to="/AsyncAnalyze/Settings"
        class="tab-button"
        active-class="active"
      >
        额外功能
      </router-link>

      <a
        class="tab-button"
        :class="{ active: showRegexTester }"
        @click.prevent="showRegexTester = true"
      >
        正则测试
      </a>
    </div>

    <!-- 子路由渲染区域 -->
    <div class="content-area">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>

    <!-- 底部通用操作栏 -->
    <div class="footer">
      <button class="btn" @click="uiStore.showUI = false">关闭</button>
    </div>

    <RegexTester
      v-if="showRegexTester"
      @close="showRegexTester = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import { useAsyncAnalyzeStore } from '@/MVU助手/stores/AsyncAnalyzeStore';
import RegexTester from '@/MVU助手/UI/components/AsyncAnalyze/RegexTester.vue';

const uiStore = useUiStore();
const asyncAnalyzeStore = useAsyncAnalyzeStore();

const showRegexTester = ref(false);

onMounted(async () => {
  await asyncAnalyzeStore.getModelSettings();
  // 确保加载时也读取 UI 设置（包括 hideToast）
  await uiStore.getModeSetting();
});
</script>

<style scoped lang="scss">
/* 样式保持不变，或者你可以根据需要微调 */
.main-container {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.title {
  margin: 8px 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.page-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  /* 如果标签太多，允许换行或滚动 */
  flex-wrap: wrap;
}

.tab-button {
  padding: 10px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    color: #111827;
    background-color: rgba(0,0,0,0.02);
  }

  &.active {
    color: #6366f1;
    border-bottom: 2px solid #6366f1;
    font-weight: 500;
  }
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: #f3f4f6;
  color: #111827;
  transition: background 0.2s;

  &:hover {
    background: #e5e7eb;
  }
}

/* Dark Mode Support */
.dark-mode {
  .title { color: #e2e8f0; }

  .page-tabs { border-bottom-color: #4b5563; }

  .tab-button {
    color: #9ca3af;
    &:hover { color: #e2e8f0; background-color: rgba(255,255,255,0.05); }
    &.active { color: #818cf8; border-bottom-color: #818cf8; }
  }

  .footer { border-top-color: #4b5563; }

  .btn {
    background: #4b5563;
    color: #e2e8f0;
    &:hover { background: #6b7280; }
  }
}
</style>
