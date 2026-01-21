/**
 * 深度合并工具函数
 * @param target 目标对象
 * @param source 来源对象
 */
function mergeDeep(target: any, source: any) {
  const isObject = (obj: any) => obj && typeof obj === 'object' && !Array.isArray(obj);

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      // 如果都是数组，通常直接覆盖，或者你可以改为 targetValue.concat(sourceValue)
      target[key] = sourceValue;
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      // 递归合并对象
      target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
    } else {
      // 其他情况直接赋值
      target[key] = sourceValue;
    }
  });

  return target;
}

export const JsonUtil = {
  mergeDeep,
};
