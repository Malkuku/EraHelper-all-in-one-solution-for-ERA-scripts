// ruleParser.ts
import { parsePath, getKeysAtDepth } from './pathUtils';

// 提取 $[...] 内容的正则
const PATH_REGEX = /\$\[\s*([^\s\]]+)\s*\]/g;

interface PathInfo {
  original: string;    // 原始字符串 "$[角色.*.好感度]"
  rawPath: string;     // 内部路径 "角色.*.好感度"
  segments: string[];  // ["角色", "*", "好感度"]
}

/**
 * 核心入口函数
 * @param expression 原始表达式，如 "<<if> $[角色.*.好感度] > 10>"
 * @param data 数据源快照
 * @returns 展开后的具体表达式数组
 */
export function expandExpression(expression: string, data: any): string[] {
  // 1. 提取表达式中所有的路径
  const pathInfos: PathInfo[] = [];
  let match;
  // 重置正则索引
  PATH_REGEX.lastIndex = 0;

  while ((match = PATH_REGEX.exec(expression)) !== null) {
    const rawPath = match[1];
    pathInfos.push({
      original: match[0],
      rawPath: rawPath,
      segments: parsePath(rawPath)
    });
  }

  if (pathInfos.length === 0) {
    // 如果没有变量，直接返回原表达式（或者根据需求返回空数组，这里假设无变量也是一条有效指令）
    return [expression];
  }

  // 2. 计算最大深度
  const maxDepth = Math.max(...pathInfos.map(p => p.segments.length));

  // 3. 递归构建结果
  const results: string[] = [];

  /**
   * 深度优先遍历
   * @param depth 当前处理的层级深度 (0, 1, 2...)
   * @param context 记录每一层被替换成的具体 Key，Map<层级, KeyName>
   */
  function traverse(depth: number, context: Map<number, string>) {
    // --- 终止条件 ---
    if (depth >= maxDepth) {
      // 已经遍历完所有层级，开始实例化字符串
      let finalExpr = expression;

      // 对每一个原始路径进行替换
      for (const info of pathInfos) {
        // 构建具体的路径 segments
        const concreteSegments = info.segments.map((seg, index) => {
          if (seg === '*') {
            // 如果是通配符，从上下文中取值
            return context.get(index) || '*'; // 理论上一定能取到
          }
          return seg;
        });

        // 替换表达式中的 $[...]
        // 注意：这里简单替换可能会有重复问题，建议按位置替换或确保唯一性
        // 鉴于正则提取的顺序，这里使用全局替换该特定字符串即可
        // 为了防止部分匹配错误，这里构造完整的 $[path] 进行替换
        const concretePathStr = concreteSegments.join('.');
        // 简单的字符串替换逻辑，实际生产中可能需要基于位置的替换
        // 这里假设 original 是唯一的或者所有相同的 original 都替换成一样的值
        finalExpr = finalExpr.split(info.original).join(`$[${concretePathStr}]`);
      }
      results.push(finalExpr);
      return;
    }

    // --- 递归逻辑 ---

    // 1. 检查当前层级是否有路径使用了通配符 '*'
    const wildcardPaths = pathInfos.filter(p => p.segments[depth] === '*');

    if (wildcardPaths.length > 0) {
      // --- 情况 A: 当前层是通配符层 ---
      // 我们需要找到所有涉及通配符的路径，在当前数据状态下的 Key 的交集

      let candidateKeys: string[] | null = null;

      for (const p of wildcardPaths) {
        // 构建该路径在到达当前层之前的具体路径
        const parentSegments: string[] = [];
        for (let i = 0; i < depth; i++) {
          const seg = p.segments[i];
          // 如果之前是 *，取 context，否则取自身
          parentSegments.push(seg === '*' ? context.get(i)! : seg);
        }

        // 获取数据源中该层级的所有 Key
        const keys = getKeysAtDepth(data, parentSegments);

        if (candidateKeys === null) {
          candidateKeys = keys;
        } else {
          // 取交集：必须在所有涉及的路径中都存在的 Key 才是合法的
          // 例如：角色A有“好感度”，角色B没有，那么“好感度”相关的规则就不应该生成角色B的
          candidateKeys = candidateKeys.filter(k => keys.includes(k));
        }

        // 如果交集为空，说明没有符合条件的组合，直接剪枝停止
        if (candidateKeys.length === 0) break;
      }

      // 遍历所有候选 Key，继续递归
      if (candidateKeys && candidateKeys.length > 0) {
        for (const key of candidateKeys) {
          context.set(depth, key);
          traverse(depth + 1, context);
          context.delete(depth); // 回溯
        }
      }
    } else {
      // --- 情况 B: 当前层没有通配符（全是具体 Key，如 "好感度" 或 "特殊状态"） ---
      // 不需要做 Key 替换，直接进入下一层
      // (可选：可以在这里做存在性校验，如果静态路径不存在直接剪枝)
      traverse(depth + 1, context);
    }
  }

  // 启动递归
  traverse(0, new Map());

  return results;
}
