import { DSLLexer } from './lexer';
import { DSLParser, ASTNode } from './parser';
import { OPERATOR_PRECEDENCE } from './types/dsl';
import { DSLPreprocessor } from './preprocessor';

/**
 * 递归遍历 AST，将其转换为人类可读的字符串。
 * @param node 当前 AST 节点
 * @param parentPrecedence 父级运算符的优先级，用于决定是否需要加括号
 * @returns 格式化后的字符串
 */
const astToHumanView = (node: ASTNode, parentPrecedence = 0): string => {
  switch (node.type) {
    case 'Identifier':
      // 标识符格式化为 $path
      return `$${node.path}`;

    case 'TempVariable':
      // 临时变量格式化为 @(scope)name
      return `@(${node.scope})${node.name}`;

    case 'Literal':
      // 字面量根据类型返回，字符串需要加上双引号
      if (node.value.type === 'string') {
        return `"${node.value.value}"`;
      }
      return String(node.value.value);

    case 'FunctionCall': {
      // 函数调用，格式为 "funcName(arg1, arg2, ...)"
      const args = node.args.map(arg => astToHumanView(arg, 0)).join(', ');
      // 函数名在 DSL 中是 {funcName}，在 AST 中是 funcName
      const funcName = node.name.replace(/[{}]/g, '');
      return `${funcName}(${args})`;
    }

    case 'BinaryOp': {
      // 二元操作，这是最关键的部分，需要处理运算符优先级
      const currentPrecedence = OPERATOR_PRECEDENCE[node.operator] || 0;

      // 递归处理左右子树，并传入当前运算符的优先级
      const left = astToHumanView(node.left, currentPrecedence);
      const right = astToHumanView(node.right, currentPrecedence);

      const result = `${left} ${node.operator} ${right}`;

      // 如果当前运算符的优先级低于父级，就需要用括号包裹起来
      // 例如：在处理 (a + b) * c 时，+ 的优先级低于 *，所以 a + b 需要括号
      if (currentPrecedence < parentPrecedence) {
        return `(${result})`;
      }
      return result;
    }
  }
};

/**
 * 将DSL表达式转换为人类可读的格式。
 * 新的实现基于词法分析和语法分析（Lexer/Parser）生成AST，然后格式化AST。
 * 这种方法比手动解析字符串更健壮和准确。
 *
 * @param localExpression DSL表达式字符串
 * @returns 人类可读的格式字符串
 */
export const exprToHumanView = (localExpression: string): string => {
  if (!localExpression) return '';

  try {
    // 0. 预处理过滤掉无用的空格
    const cleanExpression = DSLPreprocessor.process(localExpression);

    // 1. 使用 DSLLexer 进行词法分析
    const lexer = new DSLLexer(cleanExpression);

    // 2. 使用 DSLParser 将 Token 流转换为 AST
    const parser = new DSLParser(lexer);
    const ast = parser.parse();

    // 3. 递归遍历 AST，生成人类可读的字符串
    return astToHumanView(ast);
  } catch (error: any) {
    // 为了调试方便，这里返回错误信息
    return `[无效表达式: ${error.message}]`;
  }
};
