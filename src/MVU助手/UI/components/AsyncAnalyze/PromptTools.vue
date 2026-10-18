<template>
  <section class="prompt-tools">
    <div class="prompt-actions">
      <strong>{{ variant === 'preset' ? '故事预设转工作预设' : '前端任务联动' }}</strong>
      <button type="button" @click="copy">
        {{ variant === 'preset' ? '复制预设转换提示词' : '复制任务联动提示词' }}
      </button>
    </div>
    <p class="hint">
      {{
        variant === 'preset'
          ? '将提示词与原生预设 JSON 一起交给模型转换，再导入返回的 JSON。'
          : '将提示词与前端代码交给模型，按 result 完成任务结算和界面刷新；需要广播文本时再接入 output。'
      }}
    </p>
    <details>
      <summary>查看完整提示词</summary>
      <pre>{{ content }}</pre>
    </details>
    <p v-if="feedback" role="status">{{ feedback }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { presetConversionPrompt } from '@/MVU助手/AsyncAnalyze/PresetConversionPrompt';
import { taskIntegrationPrompt } from '@/MVU助手/AsyncAnalyze/TaskIntegrationPrompt';

const props = defineProps<{ variant: 'preset' | 'task' }>();
const feedback = ref('');
const content = computed(() => (props.variant === 'preset' ? presetConversionPrompt : taskIntegrationPrompt));
async function copy() {
  try {
    await navigator.clipboard.writeText(content.value);
    feedback.value = '已复制完整提示词。';
  } catch {
    feedback.value = '复制失败，请展开完整提示词后手动复制。';
  }
}
</script>

<style scoped>
.prompt-tools {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.prompt-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.hint {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
summary {
  cursor: pointer;
}
pre {
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 400;
}
</style>
