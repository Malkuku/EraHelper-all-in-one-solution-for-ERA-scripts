import _ from 'lodash';
import { MessageUtil } from '@/Utils/MessageUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { JsonUtil } from '@/Utils/JsonUtil';
import { RegexUtils } from '@/Utils/RegexUtils';
import { EraDataHandler } from '../EraDataHandler/EraDataHandler';
import { eraLogger } from '../utils/EraHelperLogger';
import { getEraEditStore, getEraDataStore } from './AsyncAnalyzeState';
import { TaskResult } from './AsyncAnalyzeTypes';
import { EraDataProcessor, OperationType } from '@/ERA助手/EraDataHandler/EraMetaHandler';
import { EraMetaRule } from '@/ERA助手/UI/view/EraDataHandle.vue';

/**
 * 辅助函数：处理文本中指定标签的内容（应用 Meta 规则并原样写回）
 */
function processTagInContent(content: string, tagName: string, opType: OperationType, processor: EraDataProcessor | null): string {
  const regex = new RegExp(`<${tagName}>((?:(?!<${tagName}>)[\\s\\S])*?)<\\/${tagName}>`, 'g');

  return content.replace(regex, (match, jsonStr) => {
    if (!jsonStr || !jsonStr.trim()) return match;
    try {
      const originalData = JSON.parse(jsonStr);
      // 如果有处理器则处理，否则保持原样
      const processedData = processor ? processor.process(originalData, opType) : originalData;
      // 序列化回 JSON 字符串
      return `<${tagName}>\n${JSON.stringify(processedData, null, 2)}\n</${tagName}>`;
    } catch (e) {
      console.warn(`处理 ${tagName} 标签内容出错:`, e);
      return match; // 出错则不修改
    }
  });
}


/**
 * 从文本中提取 <VariableEdit> 并进行 Meta 清洗
 */
export function extractAndFilterVariableEdits(content: string, processor: EraDataProcessor | null): { cleanContent: string, variableEdits: Record<string, any> } {
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
      let editData = JSON.parse(jsonStr);

      // 关键点：在合并前，先应用 Meta 规则进行清洗
      if (processor) {
        editData = processor.process(editData, 'Edit');
      }

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
    let msgContent = MessageUtil.getMessageById(message_id);
    if (!msgContent) return;

    // 获取 Meta 规则
    const metaRules = (getEraDataStore() as any).eraMetaRule as EraMetaRule;
    const processor = metaRules ? new EraDataProcessor(metaRules) : null;

    // 1. 处理 Insert 和 Delete 标签 (Meta 清洗 -> 原样写回)
    // 注意：DataHandler 不处理这两个，所以我们在这里直接清洗并更新文本
    let contentChanged = false;
    const newContentAfterInsert = processTagInContent(msgContent, 'VariableInsert', 'Insert', processor);
    if (newContentAfterInsert !== msgContent) {
      msgContent = newContentAfterInsert;
      contentChanged = true;
    }

    const newContentAfterDelete = processTagInContent(msgContent, 'VariableDelete', 'Delete', processor);
    if (newContentAfterDelete !== msgContent) {
      msgContent = newContentAfterDelete;
      contentChanged = true;
    }

    // 如果 Insert/Delete 发生了变化，先回写一次，防止后续 Edit 处理出错或覆盖
    if (contentChanged) {
      await (window as any).setChatMessages([{ message_id, message: msgContent }]);
    }

    // 2. 处理 Edit 标签 (提取 -> Meta 清洗 -> DataHandler 计算 -> 写回结果)
    const { variableEdits } = extractAndFilterVariableEdits(msgContent, processor);

    if (Object.keys(variableEdits).length === 0) {
      // 如果没有 Edit 操作，但刚才 Insert/Delete 变了，日志记录一下即可
      if (contentChanged) eraLogger.info('正文 Insert/Delete 标签已根据 Meta 规则清洗');
      return;
    }

    eraLogger.info('检测到正文中包含 VariableEdit，正在处理...');

    let newVariableStateString = '';
    try {
      const snapshotData = await getEraEditStore().getStatData();
      if (snapshotData != null) {
        const rules = getEraDataStore().eraDataRule;
        // 这里传入的 variableEdits 已经是经过 Meta 清洗过的了
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
      // 替换 Edit 标签：第一个替换为最新状态，后续的删除（标准 Era 逻辑）
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
  // 获取 Meta 处理器
  const metaRules = (getEraDataStore() as any).eraMetaRule as EraMetaRule;
  const processor = metaRules ? new EraDataProcessor(metaRules) : null;

  // 1. 合并并应用所有变量修改 (仅针对 Edit)
  let allVariableEdits: Record<string, any> = {};
  for (const res of results) {
    let edits = res.variableEdits || {};
    // 应用 Meta 规则清洗 Edit 数据
    if (processor && !_.isEmpty(edits)) {
      edits = processor.process(edits, 'Edit');
    }
    allVariableEdits = JsonUtil.mergeDeep(allVariableEdits, edits);
  }

  let newVariableStateString = '';
  if (Object.keys(allVariableEdits).length > 0) {
    try {
      const snapshotData = await getEraEditStore().getStatData();
      if (snapshotData != null) {
        const rules = getEraDataStore().eraDataRule;
        // DataHandler 处理清洗后的 Edit 数据
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

    // A. 先处理文本中的 Insert 和 Delete 标签 (Meta 清洗 -> 原样保留)
    finalResultContent = processTagInContent(finalResultContent, 'VariableInsert', 'Insert', processor);
    finalResultContent = processTagInContent(finalResultContent, 'VariableDelete', 'Delete', processor);

    // B. 处理 Edit 标签 (替换为计算后的状态)
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
      // 如果没有状态更新，移除所有 Edit 标签 (或者保留清洗后的? 通常这里逻辑是消费掉 Edit)
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
          } else if (contentToApply && contentToApply.trim().length > 0) {
              await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, contentToApply);
              eraLogger.info(`任务 [${res.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 为空，已直接创建新内容`);
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
