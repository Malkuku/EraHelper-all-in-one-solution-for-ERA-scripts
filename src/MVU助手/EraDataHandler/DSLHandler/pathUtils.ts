// pathUtils.ts

/**
 * 将字符串路径转换为数组
 * @param pathStr 例如 "角色.*.好感度"
 * @returns ["角色", "*", "好感度"]
 */
export function parsePath(pathStr: string): string[] {
  if (!pathStr) return [];
  return pathStr.split('.').map(s => s.trim());
}

/**
 * 根据路径数组从对象中获取值
 * @param data 数据源
 * @param pathSegments 路径数组
 * @returns 对应的值，如果路径不存在返回 undefined
 */
export function getValueByPath(data: any, pathSegments: string[]): any {
  let current = data;
  for (const key of pathSegments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

/**
 * 检查路径在当前数据中是否存在（用于非通配符的层级验证）
 */
export function hasPath(data: any, pathSegments: string[]): boolean {
  return getValueByPath(data, pathSegments) !== undefined;
}

/**
 * 获取对象指定层级的所有 Key
 * @param data 数据源
 * @param parentPathSegments 父级路径（不包含当前层）
 * @returns Key 数组
 */
export function getKeysAtDepth(data: any, parentPathSegments: string[]): string[] {
  const parentObj = getValueByPath(data, parentPathSegments);
  if (parentObj && typeof parentObj === 'object') {
    return Object.keys(parentObj);
  }
  return [];
}

/**
 * 设置对象指定路径的值
 * 1. 如果中间路径不存在，会自动创建对象
 * 2. 如果中间路径对应的值不是对象（如 null 或 原始值），会被覆盖为空对象以确保路径连通
 * @param data 数据源 (会被修改)
 * @param pathSegments 路径数组
 * @param value 要设置的值
 */
export function setValueByPath(data: any, pathSegments: string[], value: any): void {
  if (!data || typeof data !== 'object' || pathSegments.length === 0) {
    return;
  }

  let current = data;

  // 遍历路径直到倒数第二个节点
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const key = pathSegments[i];

    // 检查当前 key 是否存在且为对象
    // 如果不存在，或者存在但不是对象（比如是数字或null），则重置为 {}
    if (!(key in current) || current[key] === null || typeof current[key] !== 'object') {
      current[key] = {};
    }

    current = current[key];
  }

  // 设置最后一个节点的值
  const lastKey = pathSegments[pathSegments.length - 1];
  current[lastKey] = value;
}
