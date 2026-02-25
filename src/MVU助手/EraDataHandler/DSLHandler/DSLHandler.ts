// DSLHandler.ts
import { DSLEngine, DSLResult } from './dsl-engine';
import { DSLLexer } from './lexer';
import { DSLParser } from './parser';
import { getValueByPath, setValueByPath as utilsSetValue, parsePath } from './pathUtils';
import { exprToHumanView } from './exprToHumanView';
import { DSLPreprocessor } from './preprocessor';
import { VariableStore } from './evaluator';

export const DSLHandler = {
  /**
   * 执行 DSL 表达式。
   * @param expression 表达式字符串
   * @param data 数据源
   * @param globalVars 全局变量存储 (在一次 applyRule 中共享)
   * @param localVars 局部变量存储 (在单个 rule 中共享)
   */
  execute(expression: string, data: any, globalVars: VariableStore, localVars: VariableStore): DSLResult {
    return DSLEngine.evaluate(expression, data, globalVars, localVars);
  },

  /**
   * 验证 DSL 表达式的语法是否正确
   * 注意：此方法只检查语法结构，不检查路径是否存在于数据中
   * @param expression DSL 表达式
   */
  validate(expression: string): { success: boolean; error?: string } {
    try {
      const cleanExpression = DSLPreprocessor.process(expression);
      const lexer = new DSLLexer(cleanExpression);
      const parser = new DSLParser(lexer);
      parser.parse();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 工具：通过字符串路径获取值
   * @param data 数据源
   * @param pathStr 路径字符串，如 "角色.星宫诗羽.好感度"
   */
  getValue(data: any, pathStr: string): any {
    const segments = parsePath(pathStr);
    return getValueByPath(data, segments);
  },

  /**
   * 工具：通过字符串路径设置值
   * @param data 数据源 (会被修改)
   * @param pathStr 路径字符串
   * @param value 要设置的值
   */
  setValue(data: any, pathStr: string, value: any): void {
    const segments = parsePath(pathStr);
    // 这里我们需要一个简单的 setValue 实现，通常 pathUtils 里会有
    // 如果 pathUtils 没有暴露，我们可以在这里简单实现一个，或者复用 evaluator 里的逻辑
    utilsSetValue(data, segments, value);
  },

  /**
   * 工具：将DSL表达式转换为人类可读的格式
   * @param localExpression DSL表达式字符串
   * @returns 人类可读的格式字符串
   */
  exprToHumanView(localExpression: string): string {
    return exprToHumanView(localExpression);
  },

  /**
   * 清理ast缓存
   */
  clearCache(): void {
    DSLEngine.clearCache();
  },
};
