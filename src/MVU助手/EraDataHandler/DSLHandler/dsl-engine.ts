// dsl-engine.ts
import { DSLLexer } from './lexer';
import { ASTNode, DSLParser } from './parser';
import { DSLEvaluator, VariableStore } from './evaluator';
import { RuleParser } from './ruleParser';
import { DSLPreprocessor } from './preprocessor';

export interface DSLResultItem {
  path?: string; // 如果是赋值操作，返回被修改的路径
  targetType?: 'data' | 'temp'; // 赋值目标的类型
  value: any; // 表达式的计算结果
}

export interface DSLResult {
  success: boolean;
  value?: DSLResultItem[];
  error?: string;
}

export class DSLEngine {
  // --- AST 缓存 ---
  // Key: 预处理后的表达式字符串, Value: 解析后的 AST 根节点
  private static astCache = new Map<string, ASTNode>();
  private static MAX_CACHE_SIZE = 2000;

  static evaluate(
    expression: string,
    data: any,
    globalVars: VariableStore, // 接收全局变量
    localVars: VariableStore, // 接收局部变量
  ): DSLResult {
    try {
      const cleanExpression = DSLPreprocessor.process(expression);

      const parser = new RuleParser(data);
      const concreteExpressions = parser.expand(cleanExpression);
      //eraLogger.log(`[DSL] Concrete expressions:`,concreteExpressions);

      const results: DSLResultItem[] = [];

      // 2. 遍历执行每一个具体表达式
      for (const expr of concreteExpressions) {
        let ast: ASTNode;

        // --- 缓存逻辑 ---
        if (this.astCache.has(expr)) {
          ast = this.astCache.get(expr)!;
        } else {
          // 缓存未命中：解析
          const lexer = new DSLLexer(expr);
          const parser = new DSLParser(lexer);
          ast = parser.parse();

          // 检查容量
          if (this.astCache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.astCache.keys().next().value;
            if (oldestKey) this.astCache.delete(oldestKey);
          }
          // 插入新值（会自动排在 Map 末尾）
          this.astCache.set(expr, ast);
        }

        // 将两种变量都传递给求值器
        const evaluator = new DSLEvaluator(data, globalVars, localVars);
        const resultValue = evaluator.evaluate(ast);

        // 4. 结果封装
        // 我们需要判断这是否是一个赋值操作，并区分目标类型
        let modifiedPath: string | undefined = undefined;
        let targetType: 'data' | 'temp' | undefined = undefined;

        // 检查 AST 根节点是否为赋值操作
        if (ast.type === 'BinaryOp' && ast.operator === '=') {
          if (ast.left.type === 'Identifier') {
            // 目标是数据路径
            modifiedPath = ast.left.path;
            targetType = 'data';
          } else if (ast.left.type === 'TempVariable') {
            // 目标是临时变量
            modifiedPath = `@(${ast.left.scope})${ast.left.name}`; // 格式化变量名用于日志
            targetType = 'temp';
          }
        }

        results.push({
          path: modifiedPath,
          targetType: targetType, // 传递目标类型
          value: resultValue,
        });
      }

      return { success: true, value: results };
    } catch (error: any) {
      return { success: false, error: error.message || 'DSL执行过程中发生未知错误' };
    }
  }

  /**
   * 手动清除缓存
   */
  static clearCache() {
    this.astCache.clear();
  }
}
