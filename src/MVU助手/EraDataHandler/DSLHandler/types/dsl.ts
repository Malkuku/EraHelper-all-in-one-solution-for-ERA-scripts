// types/dsl.ts

// ===================================================================
// 1. Token 相关定义 (供 Lexer 使用)
// ===================================================================

export type TokenType =
  | 'IDENTIFIER' // $[path]
  | 'TEMP_VARIABLE' // @[g]name, @[s]name
  | 'LITERAL' // &[{num}1], &[{str}hello]
  | 'OPERATOR' // ?[==], ?[>], #[+], #[{ln}]
  | 'LOGICAL_OP' // ?[&&], ?[||]
  | 'LPAREN' // (
  | 'RPAREN' // )
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string; // 原始文本值, e.g., "$[角色.A.好感度]", "@[g]myVar"
  start: number;
  end: number;
}

export interface LiteralValue {
  type: 'number' | 'string' | 'boolean' | 'null'; // 简化，暂不支持对象/数组字面量
  value: any;
}

// ===================================================================
// 2. AST (抽象语法树) 节点定义 (供 Parser 和 Evaluator 使用)
// ===================================================================

export type ASTNode = BinaryOpNode | FunctionCallNode | IdentifierNode | TempVariableNode | LiteralNode;

export interface BaseNode {
  type: string;
}

export interface BinaryOpNode extends BaseNode {
  type: 'BinaryOp';
  left: ASTNode;
  operator: string;
  right: ASTNode;
}

export interface FunctionCallNode extends BaseNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  path: string; // e.g., "角色.A.好感度"
}

// 新增：代表一个临时变量的节点
export interface TempVariableNode extends BaseNode {
  type: 'TempVariable';
  scope: 'g' | 's'; // 'g' for global, 's' for session/local
  name: string; // e.g., "myVar"
}

export interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: LiteralValue;
}

// ===================================================================
// 3. 其他常量
// ===================================================================

// 运算符优先级
export const OPERATOR_PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 3,
  '>': 3,
  '<=': 3,
  '>=': 3,
  '+': 4,
  '-': 4,
  '*': 5,
  '/': 5,
  '%': 5,
  '**': 6,
  // 函数调用通常由语法结构（括号）处理，但这里可以为一元函数/操作符保留高优先级
  neg: 7,
  ln: 7,
  log2: 7,
  sqrt: 7,
  abs: 7,
  floor: 7,
  ceil: 7,
  sum: 7,
  avg: 7,
  max: 7,
  min: 7,
};
