import { eraLogger } from '@/ERA助手/utils/EraHelperLogger';

/**
 * [新增] 解析正则字符串
 * 支持 /pattern/flags 格式，如果不是该格式，默认视为 pattern 并附加 's' (dotAll) 修饰符
 */
const parseRegexString = (input: string): { pattern: string, flags: string } => {
  const lastSlash = input.lastIndexOf('/');
  const firstSlash = input.indexOf('/');

  // 简单的判断：如果以 / 开头，且后面还有 /，则视为 /pattern/flags
  if (firstSlash === 0 && lastSlash > 0 && lastSlash > firstSlash) {
    return {
      pattern: input.substring(1, lastSlash),
      flags: input.substring(lastSlash + 1)
    };
  }
  // 默认模式：raw string 视为 pattern，默认开启 dotAll ('s') 以匹配换行符，保持旧版兼容性
  return { pattern: input, flags: 's' };
};

/**
 * [新增] 统一的正则提取逻辑
 * 1. 解析正则字符串
 * 2. 执行匹配 (支持 global)
 * 3. 返回整个匹配 (match[0])
 */
const extractContentByRegex = (text: string, regexStr: string): string[] => {
  const results: string[] = [];
  try {
    const { pattern, flags } = parseRegexString(regexStr);
    const regex = new RegExp(pattern, flags);

    // 如果包含全局标志 'g'，使用 matchAll 获取所有结果
    if (flags.includes('g')) {
      const matches = Array.from(text.matchAll(regex));
      for (const m of matches) {
        results.push(m[0]);
      }
    } else {
      // 单次匹配
      const m = text.match(regex);
      if (m) {
        results.push(m[0]);
      }
    }
  } catch (e) {
    eraLogger.error(`Regex extraction error: ${regexStr}`, e);
  }
  return results;
};

export const RegexUtils = {
  parseRegexString,
  extractContentByRegex,
};
