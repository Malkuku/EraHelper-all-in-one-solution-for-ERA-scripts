<template>
  <div class="regex-field">
    <div class="regex-inputs">
      <label
        >{{ label || '正则表达式' }}<input v-model="model.pattern" class="code-font" placeholder="pattern"
      /></label>
      <label class="flags">flags<input v-model="model.flags" placeholder="gimsu" /></label>
    </div>
    <div class="regex-tools">
      <select aria-label="从正则库选择" value="" @change="usePreset($event)">
        <option value="">从正则库选择…</option>
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
      </select>
      <button type="button" @click="$emit('test', model, purpose || 'match')">测试 / 存入正则库</button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { RegexSpec, RegexPreset } from '@/MVU助手/AsyncAnalyze/TaskSchema';
const model = defineModel<RegexSpec & { replacement?: string }>({ required: true });
const props = defineProps<{
  presets: RegexPreset[];
  label?: string;
  purpose?: 'match' | 'extract' | 'task' | 'target';
}>();
defineEmits<{
  test: [value: RegexSpec & { replacement?: string }, purpose: 'match' | 'extract' | 'task' | 'target'];
}>();
const error = computed(() => {
  try {
    new RegExp(model.value.pattern, model.value.flags);
    return '';
  } catch (cause) {
    return String(cause);
  }
});
function usePreset(event: Event) {
  const select = event.target as HTMLSelectElement;
  const preset = props.presets.find(item => item.id === select.value);
  if (preset) {
    model.value.pattern = preset.pattern;
    model.value.flags = preset.flags;
    if ('replacement' in model.value) model.value.replacement = preset.replacement;
  }
  select.value = '';
}
</script>
<style scoped>
.regex-field {
  flex: 1;
  min-width: 0;
}
.regex-inputs,
.regex-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.regex-inputs label:first-child {
  flex: 1;
  min-width: 120px;
}
.regex-inputs .flags {
  width: 75px;
}
.regex-tools {
  margin: 5px 0 10px;
}
.regex-tools select {
  flex: 1;
  width: auto;
  min-width: 120px;
}
.error {
  color: #dc2626;
  font-size: 12px;
}
.code-font {
  font-family: monospace;
}
</style>
