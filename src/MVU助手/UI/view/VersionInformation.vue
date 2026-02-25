<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '@/MVU助手/stores/UIStore';

const uiStore = useUiStore();

// 当前版本号
const currentVersion = ref('v1.0.0');

// 作者信息
const author = ref({
  name: 'cat987',
  github: 'https://github.com/Malkuku/EraHelper-all-in-one-solution-for-ERA-scripts',
});

// 版本更新历史记录
const versionHistory = ref([
  {
    version: 'v1.0.0',
    date: '2026-02-25',
    changes: [
      '正式改名为MVU助手'
    ],
  }
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
      <h2 class="section-title">注意事项</h2>
      <ul class="notes-list">
        <li>目前版本仍处于早期测试阶段,可能会存在较多bug,请注意保存好自己的数据</li>
        <li>在使用[文件导入导出]功能时,请确认好文件的来源,以避免受到恶意攻击</li>
        <li>当前移动端的适配还尚不完善,请尽量使用PC端进行开发</li>
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
  padding: 8px 16px;
  font-family: 'Inter', sans-serif;
  color: #334155;
  line-height: 1.6;
}

.section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.author-info {
  font-size: 0.9rem;
  a {
    color: #4f46e5;
    text-decoration: none;
    transition: color 0.2s ease;
    &:hover {
      color: darken(#4f46e5, 10%);
      text-decoration: underline;
    }
  }
}

.version-badge {
  display: inline-block;
  background-color: #4f46e5;
  color: white;
  padding: 0.3em 0.8em;
  border-radius: 1em;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.notes-list,
.changes-list {
  list-style-type: disc;
  padding-left: 20px;
  font-size: 0.9rem;
  color: #64748b;

  li {
    margin-bottom: 0.5rem;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.history-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.version-number {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4f46e5;
}

.version-date {
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
}

.changes-list {
  color: #475569;
}


/* 黑夜模式 */
.dark-mode {
  .version-container {
    color: #cbd5e1;
  }

  .section-title {
    color: #e2e8f0;
    border-bottom: 1px solid #4b5563;
  }

  .author-info {
    a {
      color: #818cf8;

      &:hover {
        color: #a5b4fc;
      }
    }
  }

  .version-badge {
    background-color: #4f46e5;
    color: #f8fafc;
  }

  .notes-list,
  .changes-list {
    color: #9ca3af;
  }

  .history-item {
    background: #374151;
    border: 1px solid #4b5563;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    &:hover {
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
  }

  .version-number {
    color: #818cf8;
  }

  .version-date {
    color: #9ca3af;
  }

  .changes-list {
    color: #cbd5e1;
  }
}

</style>
