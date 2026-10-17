import { eventNameIsValid, RegexSpec, TaskConfig, TaskFailure, TaskSettings } from './TaskSchema';
import { assertTextFeatures, orderedPrompts, parseNativePreset } from './generation/NativePreset';
import { klona } from 'klona';

/** Resource removal preserves consumers and clears only the removed reference. */
export function removeTaskResource(settings: TaskSettings, kind: 'connection' | 'preset' | 'task' | 'group', id: string): TaskSettings {
  const next = klona(settings);
  if (kind === 'connection') {
    next.connections = next.connections.filter(item => item.id !== id);
    next.tasks.forEach(task => { if (task.connectionId === id) task.connectionId = ''; });
  } else if (kind === 'preset') {
    next.presets = next.presets.filter(item => item.id !== id);
    next.connections.forEach(connection => { if (connection.presetId === id) connection.presetId = null; });
  } else if (kind === 'task') {
    next.tasks = next.tasks.filter(item => item.id !== id);
    next.groups.forEach(group => { group.taskIds = group.taskIds.filter(taskId => taskId !== id); });
  } else {
    next.groups = next.groups.filter(item => item.id !== id);
    if (next.activeGroupId === id) next.activeGroupId = null;
  }
  return next;
}

/** Validate only this task and its dependencies, before any host/network preparation. */
export function validateTaskReadiness(settings: TaskSettings, task: TaskConfig) {
  const fail = (message: string): never => { throw new TaskFailure('invalid_config', message, 'prepare'); };
  if (!eventNameIsValid(task.eventName)) fail('任务事件名与内部频道冲突或含首尾空白');
  const connection = settings.connections.find(item => item.id === task.connectionId);
  if (!connection) throw new TaskFailure('missing_config', '任务尚未选择 API 配置，或所选 API 已删除', 'prepare');
  const link = connection.links.find(item => item.id === connection.activeLinkId);
  if (!link) throw new TaskFailure('missing_config', 'API 尚未选择当前链接，或当前链接已删除', 'prepare');
  let url: URL;
  try { url = new URL(link.baseUrl); } catch { return fail('API 根地址未填写或格式无效'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail('API 根地址仅支持无内嵌凭据的 HTTP/HTTPS 地址');
  if (!link.model.trim()) fail('API 尚未填写模型');
  const record = settings.presets.find(item => item.id === connection.presetId);
  if (!record) throw new TaskFailure('missing_config', 'API 尚未绑定预设，或所绑定预设已删除', 'prepare');
  const preset = parseNativePreset(structuredClone(record.raw));
  assertTextFeatures(preset);
  if (!orderedPrompts(preset).some(prompt => prompt.identifier === 'chatHistory'))
    throw new TaskFailure('invalid_preset', '预设必须启用 chatHistory 占位符以承载任务提示词', 'prepare');
  const regex = (spec: RegexSpec) => {
    try { new RegExp(spec.pattern, spec.flags); } catch { fail(`正则表达式无效：${spec.pattern}`); }
  };
  task.regexRules.filter(rule => rule.enabled).forEach(regex);
  for (const book of task.candidateBooks) {
    if (!book.bookName.trim()) fail('任务候选世界书尚未选择');
    book.nameRegexes.forEach(regex);
  }
  if (task.output.mode === 'write') {
    if (!task.output.writes.length) fail('写入模式尚未配置写入目标');
    for (const write of task.output.writes) {
      if (write.target.kind === 'worldbook' && (!write.target.bookName.trim() || !write.target.entryName.trim()))
        fail('世界书写入目标尚未填写书名或条目名');
      write.extract.forEach(regex);
      if (write.operation.kind === 'replace') regex(write.operation.regex);
    }
  }
  return { connection, link, preset };
}
