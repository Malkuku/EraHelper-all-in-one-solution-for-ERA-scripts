// src/utils/rule-utils.ts

import { eraLogger } from './EraHelperLogger';

/**
 * 将规则导出为JSON字符串
 * @param rules 规则对象
 * @param pretty 是否格式化输出
 * @returns JSON字符串
 */
export function exportRulesToJson(rules: Record<string, any>, pretty: boolean = true): string {
  try {
    // 创建一个新的规则对象，调整字段顺序
    const orderedRules: Record<string, any> = {};

    for (const [ruleKey, ruleValue] of Object.entries(rules)) {
      // 重新组织规则字段顺序
      orderedRules[ruleKey] = {
        enable: ruleValue.enable || true,
        path: ruleValue.path || '*',
        order: ruleValue.order || 0,
        loop: ruleValue.loop || 1,
        range: ruleValue.range || [],
        limit: ruleValue.limit || [],
        if: ruleValue.if || '',
        handle: ruleValue.handle || {},
      };
    }

    const exportData = {
      rules: orderedRules,
    };
    return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
  } catch (error) {
    eraLogger.error('导出规则失败:', error);
    throw new Error('导出规则失败');
  }
}

/**
 * 从JSON字符串导入规则
 * @param jsonString JSON字符串
 * @returns 规则对象
 */
export function importRulesFromJson(jsonString: string): Record<string, any> {
  try {
    const data = JSON.parse(jsonString);

    // 检查数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('无效的JSON格式');
    }

    // 支持两种格式：
    // 1. 直接是规则对象
    // 2. 包含元数据的导出格式
    let rules: Record<string, any>;
    if (data.rules && typeof data.rules === 'object') {
      rules = data.rules;
    } else {
      // 直接返回整个对象（假设它就是规则对象）
      rules = data;
    }

    // 确保每个规则都有必需字段并设置默认值
    for (const ruleKey of Object.keys(rules)) {
      const rule = rules[ruleKey];
      if (rule && typeof rule === 'object') {
        // 确保必需字段存在
        if (rule.enable === undefined) {
          rule.enable = true;
        }
        if (rule.order === undefined) {
          rule.order = 0;
        }
        if (rule.loop === undefined) {
          rule.loop = 1;
        }
        if (rule.handle === undefined) {
          rule.handle = {};
        }
      }
    }

    return rules;
  } catch (error) {
    eraLogger.error('导入规则失败:', error);
    throw new Error('解析规则文件失败');
  }
}

/**
 * 验证规则格式
 * @param rules 规则对象
 * @returns 验证结果
 */
export function validateRules(rules: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rules || typeof rules !== 'object') {
    errors.push('规则数据格式不正确');
    return { valid: false, errors };
  }

  for (const [key, rule] of Object.entries(rules)) {
    // 检查必要的字段
    if (!rule.path || typeof rule.path !== 'string') {
      errors.push(`规则 "${key}" 缺少有效的路径(path)字段`);
    }

    // 检查范围限制格式
    if (rule.range && (!Array.isArray(rule.range) || rule.range.length !== 2)) {
      errors.push(`规则 "${key}" 的范围限制(range)格式不正确，应为[min, max]数组`);
    }

    // 检查变化值限制格式
    if (rule.limit && (!Array.isArray(rule.limit) || rule.limit.length !== 2)) {
      errors.push(`规则 "${key}" 的变化值限制(limit)格式不正确，应为[neg, pos]数组`);
    }

    // 检查setIf格式
    if (rule.setIf && typeof rule.setIf === 'object') {
      if (!rule.setIf.path || typeof rule.setIf.path !== 'string') {
        errors.push(`规则 "${key}" 的setIf缺少路径`);
      }
      if (!rule.setIf.if || !['==', '>', '<', '>=', '<='].includes(rule.setIf.if)) {
        errors.push(`规则 "${key}" 的setIf条件操作符无效`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 转换旧格式规则到新格式
 * @param oldRules 旧格式规则
 * @returns 新格式规则
 */
export function migrateOldRules(oldRules: Record<string, any>): Record<string, any> {
  const migratedRules: Record<string, any> = {};

  for (const [key, rule] of Object.entries(oldRules)) {
    const migratedRule = { ...rule };

    // 确保有enable字段
    if (migratedRule.enable === undefined) {
      migratedRule.enable = true;
    }

    // 转换range和limit格式
    if (typeof migratedRule.range === 'string') {
      try {
        const parsed = JSON.parse(migratedRule.range);
        migratedRule.range = Array.isArray(parsed) && parsed.length === 2 ? parsed : [];
      } catch {
        migratedRule.range = [];
      }
    }

    if (typeof migratedRule.limit === 'string') {
      try {
        const parsed = JSON.parse(migratedRule.limit);
        migratedRule.limit = Array.isArray(parsed) && parsed.length === 2 ? parsed : [];
      } catch {
        migratedRule.limit = [];
      }
    }

    migratedRules[key] = migratedRule;
  }

  return migratedRules;
}

/**
 * 导出规则为可下载的文件
 * @param rules 规则对象
 * @param filename 文件名
 */
export function downloadRulesFile(rules: Record<string, any>, filename?: string): void {
  const json = exportRulesToJson(rules, true);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename || `era-rules-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
