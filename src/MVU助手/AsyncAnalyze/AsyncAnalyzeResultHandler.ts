import _ from 'lodash';
import { MessageUtil } from '@/Utils/MessageUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { RegexUtils } from '@/Utils/RegexUtils';
import { eraLogger } from '../utils/MvuHelperLogger';
import { TaskResult } from './AsyncAnalyzeTypes';

/**
 * 处理正文中的变量修改
 */
export async function processMainMessageVariables(message_id: number) {
  let result = MessageUtil.getMessageById(message_id)[0];
  result = transformLegacyTagsToJSONPatch(result);
  await setChatMessages([{message_id: message_id,message:result}]);
}

/**
 * 将旧版的 <VariableEdit/Insert/Delete> 转换为 <UpdateVariable><JSONPatch>...
 *
 * 转换规则:
 * VariableEdit -> op: replace
 * VariableInsert -> op: insert
 * VariableDelete -> op: remove
 */
function transformLegacyTagsToJSONPatch(content: string): string {
  const patches: any[] = [];
  let newContent = content;
  let hasLegacyTags = false;

  // 辅助处理函数
  const processTag = (tagName: string, op: string) => {
    // 匹配标签及其内容
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'gi');

    newContent = newContent.replace(regex, (match, jsonStr) => {
      hasLegacyTags = true;
      if (!jsonStr || !jsonStr.trim()) return '';

      try {
        const data = JSON.parse(jsonStr);

        // 处理数组形式 (通常用于 Delete)
        if (Array.isArray(data)) {
          data.forEach(path => {
            // 确保路径以 / 开头
            const finalPath = path.startsWith('/') ? path : `/${path}`;
            patches.push({ op, path: finalPath });
          });
        }
        // 处理对象形式 (通常用于 Edit/Insert，key为路径，value为值)
        else if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([key, value]) => {
            const path = key.startsWith('/') ? key : `/${key}`;

            if (op === 'remove') {
              // remove 操作不需要 value
              patches.push({ op, path });
            } else {
              patches.push({ op, path, value });
            }
          });
        }
      } catch (e) {
        eraLogger.error(`[AsyncAnalyze] Failed to parse legacy tag ${tagName}`, e);
        // 解析失败保留原样或移除？这里选择移除以避免污染，但记录错误
        return match;
      }
      return ''; // 从原文中移除旧标签
    });
  };

  processTag('VariableEdit', 'replace');
  processTag('VariableInsert', 'insert');
  processTag('VariableDelete', 'remove');

  // 如果发现了旧标签并成功转换，追加新的 JSONPatch 块
  if (hasLegacyTags && patches.length > 0) {
    const patchBlock = `<UpdateVariable>\n<JSONPatch>\n${JSON.stringify(patches, null, 2)}\n</JSONPatch>\n</UpdateVariable>`;
    return newContent.trim() + '\n' + patchBlock;
  }

  return content;
}

/**
 * 统一应用一组任务的结果
 * 处理 merge_setting 中的正则提取和替换逻辑
 */
export async function applyGroupResults(results: TaskResult[], message_id: number) {
  for (const result of results) {
    // 0. 预处理：将旧版变量标签转换为 JSONPatch 格式
    // 这会修改 extractedContent，后续的正则提取将基于转换后的文本进行
    result.extractedContent = transformLegacyTagsToJSONPatch(result.extractedContent);

    const { extractedContent, mergeSettings, taskName } = result;
    if (!mergeSettings) continue;

    for (const [settingName, setting] of Object.entries(mergeSettings)) {
      const config = setting as any;

      // -------------------------------------------------------
      // 1. 执行内容提取 (Content Extraction)
      // -------------------------------------------------------
      let extractedText: string | null = null;

      // 必须配置 content_regex 才能提取内容
      if (config.content_regex && Array.isArray(config.content_regex) && config.content_regex.length > 0) {
        for (const regexStr of config.content_regex) {
          if (!regexStr) continue;
          try {
            // 使用 RegexUtils 解析正则，确保修饰符一致
            const { pattern, flags } = RegexUtils.parseRegexString(regexStr);
            const regex = new RegExp(pattern, flags);
            const match = extractedContent.match(regex);

            if (match) {
              // 优先使用第一个捕获组，如果没有捕获组则使用整个匹配结果
              extractedText = match[1] !== undefined ? match[1] : match[0];
              if (extractedText) break; // 找到匹配即停止尝试后续正则
            }
          } catch (e) {
            eraLogger.error(`[AsyncAnalyze] 正则提取错误 Task:${taskName} Setting:${settingName} Regex:${regexStr}`, e);
          }
        }
      }

      // 如果没有提取到内容，跳过此设置的应用
      if (!extractedText) {
        continue;
      }

      // -------------------------------------------------------
      // 2. 应用到世界书 (World Book Update)
      // -------------------------------------------------------
      if (config.world_book && config.target_lore && !config.is_inject) {
        try {
          // 获取原始内容（如果不存在则为空字符串）
          let originalContent = await WorldInfoUtil.getWorldBookLoreContent(config.world_book, config.target_lore) || '';
          let newContent = originalContent;
          let shouldUpdate = false;

          if (config.replace_regex) {
            // 有替换正则：执行正则替换
            try {
              const { pattern, flags } = RegexUtils.parseRegexString(config.replace_regex);
              const replaceRegex = new RegExp(pattern, flags);

              // 直接替换并对比结果
              const replaced = originalContent.replace(replaceRegex, extractedText);

              if (replaced !== originalContent) {
                newContent = replaced;
                shouldUpdate = true;
              } else {
                eraLogger.warn(`[AsyncAnalyze] 替换正则未匹配到目标内容，跳过更新。WB:${config.world_book} Lore:${config.target_lore}`);
              }
            } catch (e) {
              eraLogger.error(`[AsyncAnalyze] 世界书替换正则错误`, e);
            }
          } else {
            // 没有替换正则 -> 直接写入 (覆盖模式)
            newContent = extractedText;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            await WorldInfoUtil.updateOrCreateEntry(config.world_book, config.target_lore, newContent);
            eraLogger.info(`[AsyncAnalyze] 已更新世界书: ${config.world_book}:${config.target_lore}`);
          }
        } catch (e) {
          eraLogger.error(`[AsyncAnalyze] 世界书更新失败 [${settingName}]`, e);
        }
      }

      // -------------------------------------------------------
      // 3. 应用到正文注入 (Message Injection)
      // -------------------------------------------------------
      if (config.is_inject) {
        try {
          const msgContent = MessageUtil.getMessageById(message_id);
          if (msgContent !== null) {
            let newMsgContent = msgContent;
            let shouldUpdate = false;

            if (config.replace_regex) {
              // 有替换正则：执行正则替换
              try {
                const { pattern, flags } = RegexUtils.parseRegexString(config.replace_regex);
                const replaceRegex = new RegExp(pattern, flags);

                const replacedMsg = newMsgContent.replace(replaceRegex, extractedText);
                if (replacedMsg !== newMsgContent) {
                  newMsgContent = replacedMsg;
                  shouldUpdate = true;
                }
              } catch (e) {
                eraLogger.error(`[AsyncAnalyze] 消息替换正则错误`, e);
              }
            } else {
              // 没有替换正则 -> 直接写入 (追加模式)
              newMsgContent = newMsgContent + '\n' + extractedText;
              shouldUpdate = true;
            }

            if (shouldUpdate) {
              await (window as any).setChatMessages([{ message_id: message_id, message: newMsgContent }]);
              eraLogger.info(`[AsyncAnalyze] 已更新消息内容: ${message_id}`);
            }
          }
        } catch (e) {
          eraLogger.error(`[AsyncAnalyze] 消息注入失败`, e);
        }
      }
    }
  }
}
