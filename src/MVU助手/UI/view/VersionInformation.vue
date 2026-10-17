<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '@/MVU助手/stores/UIStore';
import release from '../../release.json';

const uiStore = useUiStore();

// 当前版本号
const currentVersion = `v${release.version}`;

// 作者信息
const author = ref({
  name: 'cat987',
  github: 'https://github.com/Malkuku/EraHelper-all-in-one-solution-for-ERA-scripts',
});

// 版本更新历史记录
const versionHistory = ref([
  {
    version: currentVersion,
    date: release.date,
    changes: release.changes,
  },
  {
    version: 'v1.1.0',
    date: '2026-03-25',
    changes: [
      '优化错误回滚的判断',
      '把info换成success防止被自己肘掉信息',
      'swipe时将mvu变量回滚到上一层楼',
      '优化部分模块的移动端适配',
      '将API配置挂载到了全局函数，前端可以通过共享配置来实现更灵活的generate',
      '当order为负数时会在user发送消息时执行任务',
      'fix: 更新推送时使用$all会作为普通字段处理',
      // TODO '优化执行流程中的预设切换逻辑'
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-02-25',
    changes: ['正式改名为MVU助手'],
  },
]);
</script>

<template>
  <div class="version-container" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="section">
      <h2 class="section-title">作者信息</h2>
      <p class="author-info">
        开发者: <strong>{{ author.name }}</strong>
        <br />
        Github:
        <a :href="author.github" target="_blank" rel="noopener noreferrer">{{ author.github }}</a>
      </p>
    </div>

    <div class="section">
      <h2 class="section-title">当前版本</h2>
      <p>
        <span class="version-badge">{{ currentVersion }}</span>
      </p>
    </div>

    <div class="section">
      <h2 class="section-title">免责声明</h2>
      <ul class="notes-list">
        <li>
          本插件仅供个人学习与技术交流使用，严禁用于任何商业目的或非法活动。使用者需自行承担因使用本插件而产生的一切风险与法律责任，开发者对此不承担任何责任。
        </li>
      </ul>
    </div>

    <div class="section">
      <h2 class="section-title">更新日志</h2>
      <div class="history-list">
        <article v-for="item in versionHistory" :key="item.version" class="history-item">
          <header class="history-header">
            <h3 class="version-number">{{ item.version }}</h3>
            <time class="version-date">{{ item.date }}</time>
          </header>
          <ul class="changes-list">
            <li v-for="(change, index) in item.changes" :key="index">{{ change }}</li>
          </ul>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.version-container {
  color: var(--mvu-text, #172338);
  line-height: 1.7;
  max-width: 920px;
  margin-inline: auto;
  overflow-wrap: anywhere;
}
.section {
  margin-bottom: 28px;
}
.section-title {
  font-size: 19px;
  font-weight: 650;
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--mvu-line, #d7dfea);
  color: inherit;
}
a,
.version-number {
  color: var(--mvu-accent, #4b4de0);
}
a:hover {
  text-decoration: underline;
}
.version-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 8px;
  background: var(--mvu-soft, #f6f8fb);
  color: var(--mvu-accent, #4b4de0);
  font-weight: 650;
}
.notes-list,
.changes-list {
  padding-left: 22px;
  color: var(--mvu-muted, #53637b);
  font-size: 14px;
}
li {
  margin-bottom: 8px;
}
.history-list {
  display: grid;
  gap: 16px;
}
.history-item {
  background: var(--mvu-panel, #fff);
  border: 1px solid var(--mvu-line, #d7dfea);
  border-radius: 12px;
  padding: 18px 20px;
}
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.version-number {
  margin: 0;
  font-size: 16px;
}
.version-date {
  color: var(--mvu-muted, #53637b);
  font-size: 13px;
}
</style>
