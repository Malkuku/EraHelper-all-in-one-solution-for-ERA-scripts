<template>
  <div v-show="visible" class="mvu-workspace mask" :class="{ 'dark-mode': uiStore.darkMode }">
    <section
      ref="shell"
      class="workspace-shell card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mvu-title"
      tabindex="-1"
    >
      <header class="workspace-header">
        <div class="workspace-brand">
          <span class="brand-mark" aria-hidden="true">M</span>
          <div>
            <h1 id="mvu-title">MVU 助手</h1>
            <span class="workspace-caption">任务、变量与角色数据</span>
          </div>
        </div>
        <div class="workspace-tools">
          <button :aria-label="uiStore.darkMode ? '切换浅色主题' : '切换深色主题'" @click="toggleDarkMode">
            {{ uiStore.darkMode ? '浅色' : '深色' }}</button
          ><button aria-label="关闭 MVU 助手，草稿保留在当前会话" @click="close">
            关闭 <span aria-hidden="true">×</span>
          </button>
        </div>
      </header>
      <nav class="workspace-nav" aria-label="主要功能">
        <button
          v-for="item in pages"
          :key="item.path"
          :class="{ active: route.path === item.path }"
          :aria-current="route.path === item.path ? 'page' : undefined"
          @click="router.push(item.path)"
        >
          {{ item.label }}
        </button>
      </nav>
      <main class="workspace-content content">
        <router-view v-slot="{ Component }"
          ><KeepAlive><component :is="Component" /></KeepAlive
        ></router-view>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUiStore } from '../../stores/UIStore';
import { useDialogFocus } from '../../utils/useDialogFocus';
import '../design.scss';
const uiStore = useUiStore();
const visible = computed(() => uiStore.showUI);
const shell = ref<HTMLElement | null>(null);
const router = useRouter();
const route = useRoute();
const pages = [
  { path: '/AsyncAnalyze', label: '任务工作台' },
  { path: '/EraDataEdit', label: '变量编辑' },
  { path: '/Version', label: '关于' },
];
const close = () => {
  uiStore.showUI = false;
};
useDialogFocus(shell, visible, close);
const toggleDarkMode = () => {
  uiStore.darkMode = !uiStore.darkMode;
  uiStore.saveModeSetting();
};
</script>

<style scoped lang="scss">
.mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(15 23 42 / 48%);
  box-sizing: border-box;
}
.workspace-shell {
  width: min(1440px, 100%);
  height: min(920px, calc(100dvh - 48px));
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--mvu-panel);
  color: var(--mvu-text);
  border: 1px solid var(--mvu-line);
  border-radius: 16px;
  box-shadow: 0 24px 90px rgb(15 23 42 / 28%);
}
.workspace-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--mvu-line);
}
.workspace-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #4b4de0;
  color: white;
  font-weight: 750;
  font-size: 22px;
}
h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
  font-weight: 700;
}
.workspace-caption {
  color: var(--mvu-muted);
  font-size: 12px;
}
.workspace-tools {
  display: flex;
  gap: 8px;
}
.workspace-nav {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--mvu-line);
  background: var(--mvu-soft);
}
.workspace-nav button {
  border: 0;
  background: transparent;
  color: var(--mvu-muted);
  padding-inline: 18px;
}
.workspace-nav button.active {
  color: var(--mvu-accent);
  background: var(--mvu-panel);
  box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
  font-weight: 650;
}
.workspace-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 24px;
  container-type: inline-size;
}
@media (max-width: 700px), (max-height: 480px) {
  .mask {
    padding: 0;
  }
  .workspace-shell {
    width: 100%;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }
  .workspace-header {
    padding: 10px 12px;
  }
  .workspace-caption {
    display: none;
  }
  .workspace-nav {
    padding: 6px 8px;
    gap: 2px;
  }
  .workspace-nav button {
    flex: 1;
    padding: 8px 4px;
    font-size: 13px;
  }
  .workspace-content {
    padding: 12px;
  }
  .brand-mark {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
}
</style>
