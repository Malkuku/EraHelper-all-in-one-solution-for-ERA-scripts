import { applyTaskRegex, RequestDiagnostic, TaskFailure } from '../TaskSchema';
import { diagnosticEndpoint, diagnosticText, taskLog } from '../TaskDiagnostics';
import { GenerationContext, TextMessage, assertMessage } from './GenerationHost';
import { assertTextFeatures, orderedPrompts } from './NativePreset';
import { scanWorldInfo, ScanResult } from './WorldInfoScanner';
import { TaskTemplate } from './TaskTemplate';

const roles: TextMessage['role'][] = ['system', 'user', 'assistant'];
type Segment = { historyIndex?: number; messages: TextMessage[]; depth?: number; order: number };
async function assemble(context: GenerationContext, scan: ScanResult, template: TaskTemplate): Promise<TextMessage[]> {
  const segments: Segment[] = [];
  const history = structuredClone(context.history);
  history.push({ role: 'user', content: context.task.prompt });
  const depthSegments: Segment[] = [];
  const excluded = new Set(['charDescription', 'charPersonality', 'scenario', 'personaDescription']);
  let hasHistory = false;
  for (const [order, prompt] of orderedPrompts(context.preset).entries()) {
    if (excluded.has(prompt.identifier)) continue;
    if (prompt.identifier === 'chatHistory') {
      hasHistory = true;
      segments.push({ order, messages: [], historyIndex: 0 });
      continue;
    }
    let content = prompt.content ?? '';
    if (prompt.identifier === 'worldInfoBefore') content = scan.worldInfoBefore;
    else if (prompt.identifier === 'worldInfoAfter') content = scan.worldInfoAfter;
    else if (prompt.identifier === 'dialogueExamples') content = scan.EMEntries.map(item => item.content).join('\n');
    else if (prompt.marker) continue;
    if (!content) continue;
    const message = { role: prompt.role, content };
    if (prompt.injection_position === 1)
      depthSegments.push({
        depth: prompt.injection_depth ?? 4,
        order: prompt.injection_order ?? 100,
        messages: [message],
      });
    else segments.push({ order, messages: [message] });
  }
  depthSegments.push(
    ...scan.WIDepthEntries.map(item => ({
      depth: item.depth ?? 4,
      order: 100,
      messages: [{ role: roles[item.role ?? 0], content: item.entries.join('\n') }],
    })),
  );
  if (!hasHistory)
    throw new TaskFailure('invalid_preset', '预设必须启用 chatHistory 占位符以承载任务提示词', 'prepare');
  // Upstream only attaches ANTop/ANBottom to the author's-note extension prompt when
  // shouldWIAddPrompt is true. Tasks have no automatic author's note, so retain those
  // scan partitions for templates without inventing a different injection anchor.
  const rebuild = () => {
    // Native populationInjectionPrompts operates on a reverse-chronological pool,
    // groups each depth by order then role, and reverses the completed pool.
    const reversePool = [...history].reverse();
    let inserted = 0;
    for (const depth of [...new Set(depthSegments.map(segment => segment.depth ?? 0))].sort((a, b) => a - b)) {
      const atDepth = depthSegments.filter(segment => segment.depth === depth);
      const injected: TextMessage[] = [];
      for (const order of [...new Set(atDepth.map(segment => segment.order))].sort((a, b) => b - a)) {
        for (const role of roles) {
          const content = atDepth
            .filter(segment => segment.order === order)
            .flatMap(segment => segment.messages)
            .filter(message => message.role === role)
            .map(message => message.content)
            .filter(Boolean)
            .join('\n')
            .trim();
          if (content) injected.push({ role, content });
        }
      }
      reversePool.splice(depth + inserted, 0, ...injected);
      inserted += injected.length;
    }
    const chat = reversePool.reverse();
    return segments.flatMap(segment => (segment.historyIndex !== undefined ? chat : segment.messages));
  };
  const inputBudget = context.preset.openai_max_context - context.preset.openai_max_tokens;
  template.setAuthorNotePartitions(scan.ANBeforeEntries, scan.ANAfterEntries);
  let messages = rebuild();
  while ((await context.tokenCounter.messages(messages)) > inputBudget && history.length > 1) {
    history.shift();
    messages = rebuild();
  }
  if ((await context.tokenCounter.messages(messages)) > inputBudget)
    throw new TaskFailure('context_overflow', '固定提示词与任务提示词超过预设上下文预算', 'prepare');
  messages = await template.finalize(messages, scan.outletEntries);
  if (context.preset.squash_system_messages === true)
    messages = messages.reduce<TextMessage[]>((result, message) => {
      const previous = result[result.length - 1];
      if (message.role === 'system' && previous?.role === 'system') previous.content += `\n${message.content}`;
      else result.push({ ...message });
      return result;
    }, []);
  if ((await context.tokenCounter.messages(messages)) > inputBudget)
    throw new TaskFailure('context_overflow', '模板或注入后的请求超过预设上下文预算', 'template');
  return messages;
}
export function generationPayload(context: GenerationContext) {
  const preset = context.preset;
  return {
    chat_completion_source: 'custom',
    custom_url: context.connection.baseUrl.replace(/\/+$/, ''),
    custom_include_headers: JSON.stringify({ Authorization: `Bearer ${context.secret}` }),
    custom_include_body: '',
    custom_exclude_body: '',
    custom_prompt_post_processing: 'none',
    model: context.connection.model,
    messages: context.messages,
    stream: false,
    n: 1,
    temperature: preset.temp_openai,
    frequency_penalty: preset.freq_pen_openai,
    presence_penalty: preset.pres_pen_openai,
    top_p: preset.top_p_openai,
    top_k: preset.top_k_openai,
    max_tokens: preset.openai_max_tokens,
    ...(preset.seed >= 0 ? { seed: preset.seed } : {}),
  };
}
export async function generateTask(context: GenerationContext): Promise<string> {
  let phase: TaskFailure['phase'] = 'prepare';
  const started = Date.now();
  const label = {
    runId: context.runId,
    taskId: context.task.id,
    taskName: context.task.name,
    chatId: context.identity.chatId,
    messageId: context.identity.messageId,
    swipeId: context.identity.swipeId,
  };
  let requestDetails: RequestDiagnostic | undefined;
  let requestedAt = started;
  try {
    assertTextFeatures(context.preset);
    phase = 'template';
    const template = new TaskTemplate(context);
    await template.initialize();
    const entries = await template.preprocess();
    phase = 'scan';
    const scan = await scanWorldInfo(context, entries);
    taskLog(
      'info',
      '世界书扫描完成',
      { ...label, candidates: entries.length, activated: scan.allActivatedEntries.size },
      context.secret,
    );
    context.timedState = scan.timedState;
    phase = 'template';
    context.messages = await assemble(context, scan, template);
    assertMessage(context.identity, context.controller.signal);
    phase = 'request';
    const payload = generationPayload(context);
    requestedAt = Date.now();
    requestDetails = {
      connectionName: context.connection.name,
      model: context.connection.model,
      endpoint: diagnosticEndpoint(context.connection.baseUrl),
      elapsedMs: 0,
    };
    taskLog(
      'info',
      '发送模型请求',
      { ...label, ...requestDetails, messages: context.messages.length, presetId: context.connection.presetId },
      context.secret,
    );
    // Keep the original request/output inspection capability without logging credentials.
    taskLog(
      'debug',
      '模型请求内容',
      { ...label, ...payload, custom_include_headers: '[已隐藏]', custom_url: requestDetails.endpoint },
      context.secret,
    );
    const response = await fetch(new URL('/api/backends/chat-completions/generate', window.parent.location.origin), {
      method: 'POST',
      credentials: 'same-origin',
      headers: context.ctx.getRequestHeaders(),
      signal: context.controller.signal,
      body: JSON.stringify(payload),
    });
    requestDetails.httpStatus = response.status;
    requestDetails.statusText = diagnosticText(response.statusText ?? '', context.secret);
    // Retain a copy before parsing so text/HTML errors aren't discarded by response.json().
    const rawResponse = response.clone?.();
    let result: any;
    let rawText = '';
    try {
      result = await response.json();
    } catch {
      rawText = (await rawResponse?.text().catch(() => '')) ?? '';
    }
    requestDetails.elapsedMs = Date.now() - requestedAt;
    const responseText = diagnosticText(result ?? rawText, context.secret);
    taskLog('debug', '后端原始响应', { ...label, httpStatus: response.status, response: responseText }, context.secret);
    requestDetails.response =
      responseText.length > 12000 ? responseText.slice(0, 12000) + '\n[响应过长，已截断]' : responseText;
    const backend = result?.error;
    const scalar = (value: unknown) =>
      typeof value === 'string' || typeof value === 'number'
        ? diagnosticText(String(value), context.secret)
        : undefined;
    requestDetails.backendCode = scalar(backend?.code ?? result?.code);
    requestDetails.backendType = scalar(backend?.type ?? result?.type);
    const reason =
      scalar(backend?.message) ??
      scalar(backend?.error?.message) ??
      scalar(backend) ??
      scalar(result?.message) ??
      scalar(result?.detail) ??
      (rawText ? diagnosticText(rawText, context.secret).slice(0, 500) : '后端未提供错误说明，展开详情查看返回内容');
    if (!response.ok)
      throw new TaskFailure(
        'request_http_error',
        `模型后端 HTTP ${response.status}${response.statusText ? ` ${requestDetails.statusText}` : ''}：${reason}`,
        'request',
        requestDetails,
      );
    if (result === undefined)
      throw new TaskFailure(
        'invalid_response',
        `模型后端响应不是有效 JSON${rawText ? `：${reason}` : '（响应为空或无法读取）'}`,
        'request',
        requestDetails,
      );
    if (backend) throw new TaskFailure('backend_error', `模型后端返回错误：${reason}`, 'request', requestDetails);
    const text = result?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim())
      throw new TaskFailure('empty_result', '模型后端未返回非空文本，展开详情查看响应结构', 'request', requestDetails);
    context.controller.signal.throwIfAborted();
    taskLog(
      'info',
      '模型响应完成',
      { ...label, httpStatus: response.status, elapsedMs: requestDetails.elapsedMs, outputChars: text.length },
      context.secret,
    );
    taskLog('debug', '模型原始输出', { ...label, text }, context.secret);
    return applyTaskRegex(text, context.task, 'response');
  } catch (error) {
    if (requestDetails) requestDetails.elapsedMs = Date.now() - requestedAt;
    const failure =
      error instanceof TaskFailure
        ? error
        : new TaskFailure(
            'host_error',
            diagnosticText(error instanceof Error ? error.message : String(error), context.secret),
            phase,
            requestDetails,
          );
    failure.message = diagnosticText(failure.message, context.secret);
    taskLog(
      'error',
      '生成失败',
      {
        ...label,
        code: failure.code,
        phase: failure.phase,
        message: failure.message,
        elapsedMs: Date.now() - started,
        details: failure.details,
      },
      context.secret,
    );
    throw failure;
  }
}
