<template>
  <div class="regex-field">
    <div class="regex-inputs">
      <label
        ><span class="field-label">{{ label || '正则表达式' }}<Tooltip :content="help" /></span
        ><input
          v-model="expression"
          :aria-label="label || '正则表达式'"
          class="code-font"
          placeholder="输入正则表达式，或 /表达式/gi"
      /></label>
    </div>
    <div class="regex-tools">
      <select aria-label="从正则库选择" value="" @change="usePreset($event)">
        <option value="">从正则库选择…</option>
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
      </select>
      <Tooltip
        content="选择库中的正则，将其复制到当前字段；后续编辑不会修改库内原配置。测试器可预览匹配、提取或替换结果。"
      />
      <button type="button" @click="$emit('test', model, purpose || 'match')">测试 / 存入正则库</button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Tooltip from '../Common/Tooltip.vue';
import { parseRegexInput, formatRegexInput, type RegexSpec, type RegexPreset } from '@/MVU助手/AsyncAnalyze/TaskSchema';
const model = defineModel<RegexSpec & { replacement?: string }>({ required: true });
const props = defineProps<{
  presets: RegexPreset[];
  label?: string;
  purpose?: 'match' | 'extract' | 'task' | 'target';
}>();
defineEmits<{
  test: [value: RegexSpec & { replacement?: string }, purpose: 'match' | 'extract' | 'task' | 'target'];
}>();
const help = computed(() => {
  const syntax = '支持直接输入表达式或 /表达式/gi。';
  if (props.purpose === 'extract')
    return (
      syntax +
      '分别在完整 AI 响应中提取完整匹配文本；g 表示提取所有命中。多条规则的命中按顺序换行拼接，空列表使用完整响应，全部未命中则不写入并报告失败。'
    );
  if (props.purpose === 'target')
    return syntax + '在目标正文或世界书内容中匹配待替换片段，用响应提取结果替换；g 表示替换全部匹配。';
  if (props.purpose === 'task') return syntax + '在所选处理阶段中匹配文本，并按替换文本执行 JavaScript 正则替换。';
  return syntax + '按条目名称匹配，与勾选的条目名称取并集；任意名称正则命中即可成为候选，之后仍须满足扫描触发条件。';
});
const expression = ref(formatRegexInput(model.value));
watch(expression, value => Object.assign(model.value, parseRegexInput(value)), { flush: 'sync' });
watch(
  () => [model.value.pattern, model.value.flags],
  () => {
    const parsed = parseRegexInput(expression.value);
    if (parsed.pattern !== model.value.pattern || parsed.flags !== model.value.flags)
      expression.value = formatRegexInput(model.value);
  },
);
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
