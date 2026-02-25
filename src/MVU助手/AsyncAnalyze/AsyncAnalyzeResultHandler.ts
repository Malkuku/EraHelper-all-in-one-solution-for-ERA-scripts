import { TaskResult } from './AsyncAnalyzeTypes';
import { MessageUtil } from '@/Utils/MessageUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { RegexUtils } from '@/Utils/RegexUtils';
import { eraLogger } from '../utils/MvuHelperLogger';

/**
 * 将嵌套的 JSON 对象展平为 JSONPatch 数组
 * 例如: {"人物信息": {"987": {"体力": 60}}}
 * 转换为: [{op: "replace", path: "/人物信息/987/体力", value: 60}]
 */
function flattenObjectToJSONPatch(obj: any, currentPath: string = '', op: string = 'replace'): any[] {
  let patches: any[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // JSONPatch 标准：转义路径中的 / 和 ~
      const escapedKey = key.replace(/~/g, '~0').replace(/\//g, '~1');
      const newPath = `${currentPath}/${escapedKey}`;
      const value = obj[key];

      // 如果是普通对象（非数组，非 null），继续递归深入
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        patches = patches.concat(flattenObjectToJSONPatch(value, newPath, op));
      } else {
        // 到达叶子节点，生成 patch 对象
        const patch: any = { op, path: newPath };
        if (op !== 'remove') {
          patch.value = value;
        }
        patches.push(patch);
      }
    }
  }
  return patches;
}

/**
 * 将旧版的 <VariableInsert/Edit/Delete> (内部为纯JSON) 转换为标准的 <UpdateVariable><JSONPatch> 格式
 */
export function convertLegacyTagsToJSONPatch(text: string): string {
  if (!text) return text;

  const patches: any[] = [];
  let hasLegacyTags = false;
  let cleanedText = text;

  // 匹配最内层的完整闭合标签
  const tagRegex = /<Variable(Insert|Edit|Delete)>((?:(?!<Variable(?:Insert|Edit|Delete)>)[\s\S])*?)<\/Variable\1>/gi;

  let previousText;
  // 使用 do-while 循环配合 replace，由内向外安全地替换所有标签
  do {
    previousText = cleanedText;
    cleanedText = cleanedText.replace(tagRegex, (fullMatch, type, innerContent) => {
      const opType = type.toLowerCase();
      let op = 'replace';
      if (opType === 'insert') op = 'insert'; // 注意：标准 JSONPatch 是 'add'，这里保持与原逻辑一致
      else if (opType === 'delete') op = 'remove';

      try {
        // 核心修复：直接解析内部的纯 JSON
        const parsedJson = JSON.parse(innerContent.trim());

        // 将嵌套的 JSON 展平为 JSONPatch 数组
        const generatedPatches = flattenObjectToJSONPatch(parsedJson, '', op);
        patches.push(...generatedPatches);

        hasLegacyTags = true;
        return ''; // 解析成功，从正文中移除该标签块
      } catch (e) {
        eraLogger.warn(`[AsyncAnalyze] 无法解析 <Variable${type}> 标签内的 JSON 内容，跳过转换:\n${innerContent}`, e);
        return fullMatch; // 解析失败，保留原文本，防止内容莫名消失
      }
    });
  } while (cleanedText !== previousText); // 如果还有嵌套的标签，继续处理

  // 清理可能残留的孤立闭合/开始标签（容错处理）
  if (hasLegacyTags) {
    cleanedText = cleanedText.replace(/<\/?Variable(Insert|Edit|Delete)>/gi, '');
  }

  // 追加新的标准 JSONPatch 格式到文本末尾
  if (hasLegacyTags && patches.length > 0) {
    const patchJsonStr = JSON.stringify(patches, null, 2);
    const newBlock = `\n<UpdateVariable>\n    <JSONPatch>\n${patchJsonStr}\n    </JSONPatch>\n</UpdateVariable>`;
    cleanedText = cleanedText.trimEnd() + newBlock;
  }

  return cleanedText;
}

/**
 * 处理正文中的变量修改
 */
export async function processMainMessageVariables(message_id: number) {
  try {
    const msgText = MessageUtil.getMessageById(message_id);
    if (!msgText) return;

    const convertedText = convertLegacyTagsToJSONPatch(msgText);

    if (convertedText !== msgText) {
      await (window as any).setChatMessages([{
        message_id: message_id,
        message: convertedText
      }]);
    }
  } catch (e) {
    eraLogger.error('[AsyncAnalyze] 处理正文变量标签时出错:', e);
  }
}

/**
 * 统一应用一组任务的结果
 */
export async function applyGroupResults(results: TaskResult[], message_id: number) {
  try {
    // 获取当前消息内容作为基准
    let currentMsgText = MessageUtil.getMessageById(message_id) || '';
    let isMsgModified = false;

    for (const result of results) {
      if (!result.extractedContent) continue;

      // 1. 转换变量格式
      const convertedFullText = convertLegacyTagsToJSONPatch(result.extractedContent);

      // 3. 如果没有合并设置，直接追加全部内容
      if (!result.mergeSettings || Object.keys(result.mergeSettings).length === 0) {
        currentMsgText += '\n' + convertedFullText;
        isMsgModified = true;
        continue;
      }

      // 4. 处理合并设置 (Merge Settings)
      for (const [mergeKey, setting] of Object.entries(result.mergeSettings)) {
        const { is_inject, world_book, target_lore, content_regex, replace_regex } = setting as any;

        let contentToApply = '';

        // --- 步骤 A: 提取内容 ---
        if (content_regex && Array.isArray(content_regex) && content_regex.length > 0) {
          const extractedParts: string[] = [];
          for (const regexStr of content_regex) {
            // 使用 RegexUtils 从 narrativeContent 中提取
            const parts = RegexUtils.extractContentByRegex(convertedFullText, regexStr);
            if (parts.length > 0) {
              extractedParts.push(...parts);
            }
          }
          if (extractedParts.length > 0) {
            contentToApply = extractedParts.join('\n');
          } else {
            eraLogger.warn(`任务 [${result.taskName}] 合并 [${mergeKey}]: 未能通过正则提取到内容`);
            continue;
          }
        } else {
          // 如果没有定义提取正则，默认使用全部叙述内容
          contentToApply = convertedFullText;
        }

        if (!contentToApply && !replace_regex) continue;

        // --- 步骤 B: 注入到正文 (Chat) ---
        if (is_inject) {
          if (replace_regex) {
            try {
              const { pattern, flags } = RegexUtils.parseRegexString(replace_regex);
              const regex = new RegExp(pattern, flags);

              if (regex.test(currentMsgText)) {
                currentMsgText = currentMsgText.replace(regex, contentToApply);
                isMsgModified = true;
                eraLogger.info(`任务 [${result.taskName}] 合并 [${mergeKey}]: 正文内容已根据正则替换，内容: ${contentToApply}`);
              } else {
                eraLogger.warn(`任务 [${result.taskName}] 合并 [${mergeKey}]: 正文替换失败，未匹配到目标正则`);
              }
            } catch (e) {
              eraLogger.error(`任务 [${result.taskName}] 正文替换执行出错:`, e);
            }
          } else {
            // 直接追加
            currentMsgText += '\n' + contentToApply;
            isMsgModified = true;
            eraLogger.info(`任务 [${result.taskName}] 合并 [${mergeKey}]: 内容已追加到正文，内容: ${contentToApply}`);
          }
        }

        // --- 步骤 C: 注入到世界书 (World Info) ---
        else if (world_book && target_lore) {
          if (replace_regex) {
            const oldContent = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
            if (oldContent) {
              try {
                const { pattern, flags } = RegexUtils.parseRegexString(replace_regex);
                const regex = new RegExp(pattern, flags);

                if (regex.test(oldContent)) {
                  const newContent = oldContent.replace(regex, contentToApply);
                  await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, newContent);
                  eraLogger.info(`任务 [${result.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 内容已替换更新，内容: ${contentToApply}`);
                }
              } catch (e) {
                eraLogger.error(`任务 [${result.taskName}] 世界书替换执行出错:`, e);
              }
            } else {
              // 如果目标条目不存在，且有内容，则创建
              // eslint-disable-next-line no-lonely-if
              if (contentToApply && contentToApply.trim().length > 0) {
                await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, contentToApply);
                eraLogger.info(`任务 [${result.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 不存在，已创建新条目，内容: ${contentToApply}`);
              }
            }
          } else if (contentToApply && contentToApply.trim().length > 0) {
            // 追加模式
            const oldContent = await WorldInfoUtil.getWorldBookLoreContent(world_book, target_lore);
            let finalContent = contentToApply;
            if (oldContent && oldContent.length > 0) {
              finalContent = oldContent + '\n' + contentToApply;
            }
            await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, finalContent);
            eraLogger.info(`任务 [${result.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 已追加更新，内容: ${contentToApply}`);
          }
        }
      }
    }

    // 6. 统一保存修改后的消息
    if (isMsgModified) {
      await (window as any).setChatMessages([{
        message_id: message_id,
        message: currentMsgText
      }]);
      eraLogger.info(`[AsyncAnalyze] 任务结果处理完成，已更新消息内容`);
    }

  } catch (e) {
    eraLogger.error('[AsyncAnalyze] 应用任务结果时出错:', e);
  }
}
