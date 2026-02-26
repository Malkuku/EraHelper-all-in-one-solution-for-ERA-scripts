import { TaskResult } from './AsyncAnalyzeTypes';
import { MessageUtil } from '@/Utils/MessageUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { RegexUtils } from '@/Utils/RegexUtils';
import { eraLogger } from '../utils/MvuHelperLogger';
import { MvuUtil } from '@/Utils/MvuUtil';

/**
 * 辅助函数：检查 JSONPatch 路径在当前状态中是否存在
 */
function checkPathExists(state: any, path: string): boolean {
  if (!state) return false;
  if (path === '' || path === '/') return true;

  const parts = path.split('/').filter(p => p !== '');
  let current = state;

  for (const part of parts) {
    // 还原 JSONPatch 的转义字符
    const unescapedPart = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (current === null || typeof current !== 'object' || !(unescapedPart in current)) {
      return false; // 路径中断，说明不存在
    }
    current = current[unescapedPart];
  }
  return true;
}

/**
 * 将嵌套的 JSON 对象展平为 JSONPatch 数组
 * 智能处理：如果发现父路径在 statData 中不存在，则停止展平，直接插入整个对象
 */
function flattenObjectToJSONPatch(
  obj: any,
  currentPath: string = '',
  op: string = 'replace',
  statData: any = null
): any[] {
  let patches: any[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {

      const sanitizedKey = key.replace(/[.[\]]/g, '_');
      const escapedKey = sanitizedKey.replace(/~/g, '~0').replace(/\//g, '~1');
      const newPath = `${currentPath}/${escapedKey}`;
      const value = obj[key];

      // 判断是否为空对象
      const isEmptyObject = typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;

      // 修改判定逻辑：
      // 如果是对象，且不是数组，且不是 null
      // AND (排除情况：如果是删除操作 且 是空对象，则不进入递归，直接视为删除该节点)
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(op === 'remove' && isEmptyObject)) {

        if (statData && !checkPathExists(statData, newPath) && op !== 'remove') {
          patches.push({ op: 'insert', path: newPath, value: value });
        } else {
          patches = patches.concat(flattenObjectToJSONPatch(value, newPath, op, statData));
        }

      } else {
        // 到达叶子节点（或删除操作的空对象节点），生成 patch 对象
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
 * 新增 statData 参数用于智能判断路径
 */
export function convertLegacyTagsToJSONPatch(text: string, statData: any = null): string {
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
      if (opType === 'insert') op = 'insert';
      else if (opType === 'delete') op = 'remove';

      try {
        const parsedJson = JSON.parse(innerContent.trim());

        // 将嵌套的 JSON 展平为 JSONPatch 数组，传入 statData 进行智能判断
        const generatedPatches = flattenObjectToJSONPatch(parsedJson, '', op, statData);
        patches.push(...generatedPatches);

        hasLegacyTags = true;
        return '';
      } catch (e) {
        eraLogger.warn(`[AsyncAnalyze] 无法解析 <Variable${type}> 标签内的 JSON 内容，跳过转换:\n${innerContent}`, e);
        return fullMatch;
      }
    });
  } while (cleanedText !== previousText);

  if (hasLegacyTags) {
    cleanedText = cleanedText.replace(/<\/?Variable(Insert|Edit|Delete)>/gi, '');
  }

  if (hasLegacyTags && patches.length > 0) {
    const patchJsonStr = JSON.stringify(patches, null, 2);
    const newBlock = `\n<UpdateVariable>\n    <JSONPatch>\n${patchJsonStr}\n    </JSONPatch>\n</UpdateVariable>`;
    cleanedText = cleanedText.trimEnd() + newBlock;

    eraLogger.info(`[AsyncAnalyze] 成功将旧版变量标签转换为 JSONPatch 格式:\n${newBlock}`);
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

    // 获取当前变量快照
    const statData = (window as any).getVariables?.({type:'message', message_id: -1})?.stat_data || null;

    // 传入 statData 进行智能转换
    const convertedText = convertLegacyTagsToJSONPatch(msgText, statData);

    if (convertedText !== msgText) {
      await (window as any).setChatMessages([{
        message_id: message_id,
        message: convertedText
      }]);
      await MvuUtil.updateMvuDataFromContent();
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
    let currentMsgText = MessageUtil.getMessageById(message_id) || '';
    let isMsgModified = false;

    // 在处理任务前，获取一次当前变量快照
    const statData = (window as any).getVariables?.({type:'message', message_id: -1})?.stat_data || null;

    for (const result of results) {
      if (!result.extractedContent) continue;

      // 1. 转换变量格式，传入 statData 进行智能转换
      const convertedFullText = convertLegacyTagsToJSONPatch(result.extractedContent, statData);

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
              // eslint-disable-next-line no-lonely-if
              if (contentToApply && contentToApply.trim().length > 0) {
                await WorldInfoUtil.updateOrCreateEntry(world_book, target_lore, contentToApply);
                eraLogger.info(`任务 [${result.taskName}] 合并 [${mergeKey}]: 世界书条目 [${target_lore}] 不存在，已创建新条目，内容: ${contentToApply}`);
              }
            }
          } else if (contentToApply && contentToApply.trim().length > 0) {
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
      await MvuUtil.updateMvuDataFromContent();
      eraLogger.info(`[AsyncAnalyze] 任务结果处理完成，已更新消息内容`);
    }

  } catch (e) {
    eraLogger.error('[AsyncAnalyze] 应用任务结果时出错:', e);
  }
}
