<template>
  <div class="connection-check">
    <div class="toolbar">
      <button :disabled="busy" @click="check(false)">{{ busy ? '请求中…' : '测试连接' }}</button>
      <button :disabled="busy" @click="check(true)">获取模型列表</button>
      <Tooltip
        content="使用当前 API 和密钥草稿请求 /models 接口。连接成功只说明模型列表接口可访问，实际生成能力请通过任务测试确认；服务不支持列表时可手填模型。"
      />
      <button v-if="busy" @click="cancel">取消请求</button>
    </div>
    <p class="hint">使用当前草稿检测模型接口；不支持列表时可手填模型。</p>
    <p v-if="status" role="status">{{ status }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <label v-if="models !== null"
      >可用模型（{{ models.length }} 个）<Tooltip
        content="选择模型会更新当前 API 草稿，保存配置后供引用此 API 的任务使用。"
      />
      <select :value="connection.model" @change="$emit('select', ($event.target as HTMLSelectElement).value)">
        <option value="" disabled>请选择模型，也可在上方手填</option>
        <option v-if="connection.model && !models.includes(connection.model)" :value="connection.model">
          {{ connection.model }}（当前手填）
        </option>
        <option v-for="model in models" :key="model" :value="model">{{ model }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import Tooltip from '../Common/Tooltip.vue';
import type { TaskSettings } from '@/MVU助手/AsyncAnalyze/TaskSchema';

const props = defineProps<{
  connection: TaskSettings['connections'][number];
  secret: () => string;
  credentialRevision: string;
}>();
defineEmits<{ select: [model: string] }>();
const busy = ref(false),
  status = ref(''),
  error = ref('');
const models = ref<string[] | null>(null);
let controller: AbortController | undefined;
function cancel() {
  controller?.abort();
  controller = undefined;
  busy.value = false;
  status.value = '请求已取消。';
}
watch(
  () => [props.connection.id, props.connection.baseUrl, props.credentialRevision],
  () => {
    cancel();
    models.value = null;
    status.value = '';
    error.value = '';
  },
);
onBeforeUnmount(cancel);
async function check(showModels: boolean) {
  if (busy.value) return;
  status.value = '';
  error.value = '';
  models.value = null;
  const request = new AbortController();
  controller = request;
  busy.value = true;
  const timer = setTimeout(() => request.abort(), 8000);
  try {
    const url = new URL(props.connection.baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      throw new Error('请填写不含凭据、查询参数或片段的 HTTP/HTTPS API 根地址');
    const response = await fetch(`${url.href.replace(/\/+$/, '')}/models`, {
      headers: { Authorization: `Bearer ${props.secret()}` },
      signal: request.signal,
    });
    if (!response.ok) throw new Error(`模型接口 HTTP ${response.status}，请检查地址、密钥及服务权限`);
    const body = await response.json();
    request.signal.throwIfAborted();
    if (
      !Array.isArray(body?.data) ||
      body.data.some(
        (item: unknown) => !item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string',
      )
    )
      throw new Error('模型接口响应无效：需要 data 模型数组及字符串 id');
    if (controller !== request) return;
    const ids = [...new Set<string>(body.data.map((item: { id: string }) => item.id))].sort();
    if (showModels) models.value = ids;
    status.value = showModels
      ? `已获取 ${ids.length} 个模型。`
      : `连接成功，模型接口返回 ${ids.length} 个模型；生成能力请通过任务运行确认。`;
  } catch (cause) {
    if (controller !== request) return;
    error.value = request.signal.aborted
      ? '请求超时，请重试。'
      : `检查失败：${cause instanceof Error ? cause.message : String(cause)}`;
  } finally {
    clearTimeout(timer);
    if (controller === request) {
      controller = undefined;
      busy.value = false;
    }
  }
}
</script>

<style scoped>
.connection-check {
  margin: 0;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hint {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
.error {
  color: #dc2626;
}
</style>
