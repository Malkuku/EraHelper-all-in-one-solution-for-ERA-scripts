import _ from 'lodash'; // 建议使用 lodash 处理深拷贝和对象判断

// --- 类型定义 ---

export interface EraMetaRule {
  EditRefuse: {
    [key: string]: RuleConfig;
  };
  DeleteRefuse: {
    [key: string]: RuleConfig;
  };
  InsertRefuse: {
    [key: string]: RuleConfig;
  };
}

interface RuleConfig {
  path: string; // 支持 * 通配符
  enable: boolean;
  isRecursive: boolean;
}

export type OperationType = 'Edit' | 'Delete' | 'Insert';

// --- 核心处理类 ---

export class EraDataProcessor {
  private rules: EraMetaRule;

  constructor(rules: EraMetaRule) {
    this.rules = rules;
  }

  /**
   * 处理 JSON 数据，剪除被拒绝规则命中的部分
   * @param data 原始 JSON 数据
   * @param type 操作类型 (Edit | Delete | Insert)
   * @returns 处理后的 JSON 数据
   */
  public process<T>(data: T, type: OperationType): T {
    // 1. 深拷贝数据，防止修改原对象
    const dataCopy = _.cloneDeep(data);

    // 2. 获取当前操作类型下所有启用的规则，并预编译正则
    const activeRules = this.getActiveRules(type);

    // 如果没有规则，直接返回
    if (activeRules.length === 0) {
      return dataCopy;
    }

    // 3. 递归遍历并修剪
    this.traverseAndPrune(dataCopy, '', activeRules);

    return dataCopy;
  }

  /**
   * 提取并编译规则
   */
  private getActiveRules(type: OperationType): RegExp[] {
    let targetGroup: { [key: string]: RuleConfig } | undefined;

    switch (type) {
      case 'Edit':
        targetGroup = this.rules.EditRefuse;
        break;
      case 'Delete':
        targetGroup = this.rules.DeleteRefuse;
        break;
      case 'Insert':
        targetGroup = this.rules.InsertRefuse;
        break;
    }

    if (!targetGroup) return [];

    const regexList: RegExp[] = [];

    for (const key in targetGroup) {
      const rule = targetGroup[key];
      if (rule.enable && rule.path) {
        regexList.push(this.buildRegex(rule.path, rule.isRecursive));
      }
    }

    return regexList;
  }

  /**
   * 构建正则表达式
   * @param path 规则路径 (e.g. "角色.*.属性")
   * @param isRecursive 是否递归
   */
  private buildRegex(path: string, isRecursive: boolean): RegExp {
    // 1. 转义点号 (.) -> \.
    // 2. 将星号 (*) 替换为 [^.]+ (匹配除点号外的任意字符序列)
    const escapedPath = path
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]+');

    if (isRecursive) {
      // 递归模式：匹配 "路径本身" OR "路径.子节点..."
      // ^Pattern($|\..*)
      // 例子：^角色\.[^.]+\.属性($|\..*)
      // 匹配： "角色.1.属性", "角色.1.属性.攻击力"
      return new RegExp(`^${escapedPath}($|\\..*)`);
    } else {
      // 非递归模式：仅匹配 "路径本身"
      // ^Pattern$
      // 例子：^角色\.[^.]+\.属性$
      // 匹配： "角色.1.属性"
      // 不匹配： "角色.1.属性.攻击力"
      return new RegExp(`^${escapedPath}$`);
    }
  }

  /**
   * 深度优先遍历并剪枝
   * @param currentData 当前节点引用
   * @param currentPath 当前节点的绝对路径
   * @param rules 正则规则列表
   */
  private traverseAndPrune(
    currentData: any,
    currentPath: string,
    rules: RegExp[]
  ): void {
    if (!_.isObject(currentData)) {
      return;
    }

    // 区分数组和对象
    const isArray = Array.isArray(currentData);
    const keys = isArray ? Object.keys(currentData).map(Number) : Object.keys(currentData);

    // 倒序遍历，安全删除
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      // 构建下一级路径：如果是根节点，路径就是 key，否则是 parent.key
      const nextPath = currentPath ? `${currentPath}.${key}` : `${key}`;

      // 检查当前路径是否命中任何规则
      const isRefused = rules.some(regex => regex.test(nextPath));

      if (isRefused) {
        // 命中规则，剪掉该节点（及其所有子节点）
        if (isArray) {
          currentData.splice(key as number, 1);
        } else {
          delete currentData[key];
        }
      } else {
        // 未命中，继续向深层递归
        // 注意：如果父节点被删除了，子节点自然也不存在了，不需要继续递归
        this.traverseAndPrune(currentData[key], nextPath, rules);
      }
    }
  }
}

// --- 使用示例 (Demo) ---
/*
const rules: EraMetaRule = {
  InsertRefuse: {
    rule1: {
      path: "角色.*.属性",
      enable: true,
      isRecursive: true // 开启递归：拒绝 属性 以及 属性.A
    },
    rule2: {
      path: "配置.敏感",
      enable: true,
      isRecursive: false // 关闭递归：只拒绝 配置.敏感，不拒绝 配置.敏感.子项
    }
  },
  EditRefuse: {},
  DeleteRefuse: {}
};

const inputJson = {
  "角色": {
    "1001": {
      "名字": "主角",
      "属性": { // 路径: 角色.1001.属性 -> 命中 rule1 (前缀匹配) -> 删除
        "攻击": 100,
        "防御": 50
      }
    }
  },
  "配置": {
    "敏感": { // 路径: 配置.敏感 -> 命中 rule2 (精确匹配) -> 删除
      "密码": "123"
    },
    "其他": "abc"
  }
};

// 特殊情况演示：非递归模式下，子节点不被拦截
// 假设输入是直接修改子节点的 Patch 数据
const patchJson = {
  "配置": {
    "敏感": {
      "子项": "new value" // 路径: 配置.敏感.子项 -> rule2 是非递归，不匹配 -> 保留
    }
  }
};
// 注意：但在实际遍历中，如果父节点 "配置.敏感" 存在于数据中，
// 它会先被检查。如果 "配置.敏感" 匹配了非递归规则，它会被删除，导致 "子项" 也丢失。
// 只有当规则路径未命中父节点，但命中了子节点时，递归/非递归的区别才会显现。
*/
