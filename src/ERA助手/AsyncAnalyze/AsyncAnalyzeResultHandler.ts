import { MessageUtil } from '@/Utils/MessageUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { JsonUtil } from '@/Utils/JsonUtil';
import { RegexUtils } from '@/Utils/RegexUtils';
import { EraDataHandler } from '../EraDataHandler/EraDataHandler';
import { eraLogger } from '../utils/EraHelperLogger';
import { getEraEditStore, getEraDataStore } from './AsyncAnalyzeState';
import { TaskResult } from './AsyncAnalyzeTypes';

/**
 * 从文本中提取 <VariableEdit>
 */
export function extractVariableEdits(content: string): { cleanContent: string, variableEdits: Record<string, any> } {
  const regexInnermost = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>/g;
  const matches = Array.from(content.matchAll(regexInnermost));

  let mergedEditData: Record<string, any> = {};

  if (matches.length === 0) {
    return { cleanContent: content, variableEdits: {} };
  }

  for (const match of matches) {
    const jsonStr = match[1];
    if (!jsonStr || !jsonStr.trim()) continue;
    try {
      const editData = JSON.parse(jsonStr);
      mergedEditData = JsonUtil.mergeDeep(mergedEditData, editData);
    } catch (e) {
      console.warn('忽略无效的 VariableEdit 内容:', jsonStr);
    }
  }

  return { cleanContent: content, variableEdits: mergedEditData };
}

/**
 * 处理正文中的变量修改
 */
export async function processMainMessageVariables(message_id: number) {
  try {
    const msgContent = MessageUtil.getMessageById(message_id);
    if (!msgContent) return;

    const { variableEdits } = extractVariableEdits(msgContent);
    if (Object.keys(variableEdits).length === 0) return;

    eraLogger.info('检测到正文中包含 VariableEdit，正在处理...');

    let newVariableStateString = '';
    try {
      const snapshotData = await getEraEditStore().getStatData();
      if (snapshotData != null) {
        const rules = getEraDataStore().eraDataRule;
        const { data: updatedData } = await EraDataHandler.applyRule(variableEdits, snapshotData, rules);
        const updatedContent = JSON.stringify(updatedData);
        newVariableStateString = `<VariableEdit>\n${updatedContent}\n</VariableEdit>`;
      }
    } catch (e) {
      eraLogger.error('变量更新失败：', e);
      return;
    }

    if (newVariableStateString) {
      const regexInnermost = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>/g;
      let isFirstMatch = true;
      const finalResultContent = msgContent.replace(regexInnermost, () => {
        if (isFirstMatch) {
          isFirstMatch = false;
          return newVariableStateString;
        } else {
          return '';
        }
      });

      if (finalResultContent !== msgContent) {
        await (window as any).setChatMessages([{ message_id, message: finalResultContent }]);
        eraLogger.info('正文变量已更新并回写');
      }
    }
  } catch (e) {
    eraLogger.error('处理正文变量时出错:', e);
  }
}

/**
 * 统一应用一组任务的结果
 */
export async function applyGroupResults(results: TaskResult[], message_id: number) {
  // 1. 合并并应用所有变量修改
  let allVariableEdits: Record<string, any> = {};
  for (const res of results) {
    allVariableEdits = JsonUtil.mergeDeep(allVariableEdits, res.variableEdits);
  }

  let newVariableStateString = '';
  if (Object.keys(allVariableEdits).length > 0) {
    try {
      const snapshotData = await getEraEditStore().getStatData();
      if (snapshotData != null) {
        const rules = getEraDataStore().eraDataRule;
        const { data: updatedData } = await EraDataHandler.applyRule(allVariableEdits, snapshotData, rules);
        const updatedContent = JSON.stringify(updatedData);
        newVariableStateString = `<VariableEdit>\n${updatedContent}\n</VariableEdit>`;
      }
    } catch (e) {
      eraLogger.error('变量批量更新失败：', e);
      toastr.error('变量更新失败');
    }
  }

  // 2. 依次应用每个任务的文本修改
  for (const res of results) {
    if (!res.mergeSettings) continue;

    let finalResultContent = res.extractedContent;
    if (newVariableStateString) {
      const regexInnermost = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>/g;
      let isFirstMatch = true;
      finalResultContent = finalResultContent.replace(regexInnermost, () => {
        if (isFirstMatch) {
          isFirstMatch = false;
          return newVariableStateString;
        } else {
          return '';
        }
      });
    } else {
      finalResultContent = finalResultContent.replace(/<VariableEdit>[\s\S]*?<\/VariableEdit>/g, '');
    }

    for (const [mergeKey, setting] of Object.entries(res.mergeSettings)) {
      const { is_inject, world_book, target_lore, content_regex, replace_regex } = setting as any;

      let contentToApply = '';

      if (content_regex && Array.isArray(content_regex) && content_regex.length > 0) {
        const extractedParts: string[] = [];
        for (const regexStr of content_regex) {
          const parts = RegexUtils.extractContentByRegex(finalResultContent, regexStr);
          if (parts.length > 0) {
            extractedParts.push(...parts);
          }
        }
        if (extractedParts.length > 0) {
          contentToApply = extractedParts.join('\n');
        } else {
          continue;
        }
      } else {
        contentToApply = finalResultContent;
      }

      if (is_inject) {
        if (replace_regex) {
          try {
            const currentMessageContent = MessageUtil.getMessageById(message_id);
            const { pattern, flags } = RegexUtils.parseRegexString(replace_regex);
            const regex = new RegExp(pattern, flags);

            if (regex.test(currentMessageContent)) {
              const newMessageContent = currentMessageContent.replace(regex, contentToApply);
              await (window as any).setChatMessages([{ message_id, message: newMessageContent }]);
              eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 正文内容已根据正则替换`);
            }
          } catch (e) {
            eraLogger.error(`任务 [${res.taskName}] 正文替换执行出错:`, e);
          }
        } else {
          await MessageUtil.mergeContentToMessage(message_id, `\n${contentToApply}`);
          eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 内容已追加到正文`);
        }
      } else if (world_book && target_lore) {
        if (replace_regex) {
          const oldContent = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
          if (oldContent) {
            try {
              const { pattern, flags } = RegexUtils.parseRegexString(replace_regex);
              const regex = new RegExp(pattern, flags);

              if (regex.test(oldContent)) {
                const newContent = oldContent.replace(regex, contentToApply);
                await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, newContent);
                eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 内容已替换更新`);
              }
            } catch (e) {
              eraLogger.error(`任务 [${res.taskName}] 世界书替换执行出错:`, e);
            }
          } else {
            if (contentToApply && contentToApply.trim().length > 0) {
              await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, contentToApply);
              eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 为空，已直接创建新内容`);
            }
          }
        } else if (contentToApply && contentToApply.trim().length > 0) {
          const oldContent = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
          let finalContent = contentToApply;
          if (oldContent && oldContent.length > 0) {
            finalContent = oldContent + '\n' + contentToApply;
          }
          await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, finalContent);
          eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 已追加更新`);
        }
      }
    }
  }
}
