import { z } from 'zod';
import { TaskFailure } from '../TaskSchema';

const PromptSchema = z.object({
  identifier: z.string().min(1), name: z.string().default(''), role: z.enum(['system', 'user', 'assistant']).default('system'),
  content: z.string().optional(), marker: z.boolean().optional(), system_prompt: z.boolean().optional(),
  injection_position: z.number().int().optional(), injection_depth: z.number().int().nonnegative().optional(),
  injection_order: z.number().optional(), forbid_overrides: z.boolean().optional(),
}).passthrough();
const PromptOrderSchema = z.object({ character_id: z.number(), order: z.array(z.object({ identifier: z.string(), enabled: z.boolean() }).passthrough()) }).passthrough();
/** Editor shape is independent from generation budgets and reference completeness. */
export const NativePresetEditorSchema = z.object({
  prompts: z.array(PromptSchema).default([]),
  prompt_order: z.array(PromptOrderSchema).default([]),
}).passthrough();
export type NativePresetEditor = z.infer<typeof NativePresetEditorSchema>;
/** Initialize only missing editing collections, preserving the native raw object. */
export function preparePresetEditor(raw: Record<string, unknown>): NativePresetEditor {
  const shape = NativePresetEditorSchema.safeParse(raw);
  if (!shape.success) throw new Error(z.prettifyError(shape.error));
  if (!Array.isArray(raw.prompts)) raw.prompts = [];
  if (!Array.isArray(raw.prompt_order)) raw.prompt_order = [];
  const editor = raw as NativePresetEditor;
  if (!editor.prompt_order.some(item => item.character_id === 100001))
    editor.prompt_order.push({ character_id: 100001, order: [] });
  return editor;
}
export const NativePresetSchema = z.object({
  prompts: z.array(PromptSchema),
  prompt_order: z.array(PromptOrderSchema),
  openai_max_context: z.number().int().positive(), openai_max_tokens: z.number().int().positive().default(300),
  temp_openai: z.number().default(1), freq_pen_openai: z.number().default(0), pres_pen_openai: z.number().default(0),
  top_p_openai: z.number().default(1), top_k_openai: z.number().default(0), seed: z.number().int().default(-1),
}).passthrough().superRefine((raw, ctx) => {
  if (raw.openai_max_tokens >= raw.openai_max_context) ctx.addIssue({ code: 'custom', path: ['openai_max_tokens'], message: '回复预算须小于上下文' });
  const ids = raw.prompts.map(prompt => prompt.identifier);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['prompts'], message: '提示词 identifier 重复' });
  const orders = raw.prompt_order.filter(order => order.character_id === 100001);
  if (orders.length !== 1) ctx.addIssue({ code: 'custom', path: ['prompt_order'], message: '需要唯一原生全局顺序 character_id=100001' });
  if (orders[0]) {
    const orderIds = orders[0].order.map(order => order.identifier);
    if (new Set(orderIds).size !== orderIds.length) ctx.addIssue({ code: 'custom', path: ['prompt_order'], message: '顺序引用重复' });
    for (const id of orderIds) if (!ids.includes(id)) ctx.addIssue({ code: 'custom', path: ['prompt_order'], message: `顺序引用不存在: ${id}` });
  }
});
export type NativePreset = z.infer<typeof NativePresetSchema>;
export type NativePrompt = NativePreset['prompts'][number];
export function parseNativePreset(raw: unknown): NativePreset {
  const result = NativePresetSchema.safeParse(raw);
  if (!result.success) throw new TaskFailure('invalid_preset', z.prettifyError(result.error), 'prepare');
  return result.data;
}
export function orderedPrompts(raw: NativePreset): NativePrompt[] {
  return raw.prompt_order.find(order => order.character_id === 100001)!.order.filter(item => item.enabled)
    .map(item => raw.prompts.find(prompt => prompt.identifier === item.identifier)!);
}
export function assertTextFeatures(raw: NativePreset) {
  for (const field of ['function_calling', 'image_inlining', 'video_inlining', 'audio_inlining', 'use_web_search', 'send_inline_images']) {
    if (raw[field] === true) throw new TaskFailure('unsupported_feature', `文本任务不支持预设字段 ${field}`, 'prepare');
  }
}
