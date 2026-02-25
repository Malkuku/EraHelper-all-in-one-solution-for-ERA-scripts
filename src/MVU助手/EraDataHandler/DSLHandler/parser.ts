// parser.ts
import { DSLLexer, Token, TokenType, parseLiteralValue, LiteralValue } from './lexer';

// AST Nodes
export type ASTNode = BinaryOpNode | FunctionCallNode | IdentifierNode | LiteralNode | TempVariableNode; // 新增

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

export interface IdentifierNode {
  type: 'Identifier';
  path: string;
}

export interface LiteralNode {
  type: 'Literal';
  value: LiteralValue;
}

// 新增
export interface TempVariableNode {
  type: 'TempVariable';
  scope: 'g' | 's';
  name: string;
}

export class DSLParser {
  private tokens: Token[];
  private position = 0;

  constructor(lexer: DSLLexer) {
    this.tokens = lexer.tokenize();
  }

  parse(): ASTNode {
    if (this.tokens.length === 0 || this.tokens[0].type === 'EOF') {
      throw new Error('表达式为空');
    }
    const node = this.parseExpression();

    //检查是否所有 Token 都被消费
    if (!this.isAtEnd()) {
      const token = this.peek();
      throw new Error(`表达式后面有意外的标记: ${token.type} ('${token.value}') 位于位置 ${token.start}`);
    }

    return node;
  }

  // 优先级：Assignment (=) 最低
  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    let node = this.parseLogicalOr();

    // 支持 #[=]
    if (this.match('OP_MATH', '=')) {
      const operator = this.previous().value;
      // 赋值操作是右结合的
      const right = this.parseAssignment();

      // 赋值的左侧必须是标识符或临时变量
      if (node.type !== 'Identifier' && node.type !== 'TempVariable') {
        throw new Error(`无效的赋值目标: ${node.type}。必须是一个路径或临时变量。`);
      }

      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseLogicalOr(): ASTNode {
    let node = this.parseLogicalAnd();

    while (this.match('OP_LOGIC', '||')) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseLogicalAnd(): ASTNode {
    let node = this.parseComparison();

    while (this.match('OP_LOGIC', '&&')) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseComparison(): ASTNode {
    let node = this.parseAdditive();

    while (this.matchOp(['==', '!=', '<', '>', '<=', '>='])) {
      const operator = this.previous().value;
      const right = this.parseAdditive();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseAdditive(): ASTNode {
    let node = this.parseMultiplicative();

    while (this.matchOp(['+', '-'], 'OP_MATH')) {
      const operator = this.previous().value;
      const right = this.parseMultiplicative();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parseMultiplicative(): ASTNode {
    let node = this.parsePower();

    while (this.matchOp(['*', '/', '%'], 'OP_MATH')) {
      const operator = this.previous().value;
      const right = this.parsePower();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parsePower(): ASTNode {
    let node = this.parsePrimary();

    if (this.matchOp(['**'], 'OP_MATH')) {
      const operator = this.previous().value;
      const right = this.parsePower();
      node = { type: 'BinaryOp', operator, left: node, right };
    }

    return node;
  }

  private parsePrimary(): ASTNode {
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', '表达式后面需要 ")"');
      return expr;
    }

    if (this.match('IDENTIFIER')) {
      return { type: 'Identifier', path: this.previous().value };
    }

    // 新增
    if (this.match('TEMP_VARIABLE')) {
      const rawValue = this.previous().value; // e.g., "{g}myVar"
      const match = rawValue.match(/^\{(g|s)\}(.+)$/);
      if (!match) {
        // This should not happen if lexer is correct
        throw new Error(`解析器内部错误: 无效的临时变量格式 ${rawValue}`);
      }
      const [, scope, name] = match;
      return { type: 'TempVariable', scope: scope as 'g' | 's', name };
    }

    if (this.match('LITERAL')) {
      return { type: 'Literal', value: parseLiteralValue(this.previous().value) };
    }

    if (this.match('FUNC_START')) {
      const funcName = this.previous().value;
      const args: ASTNode[] = [];

      // 循环解析函数参数。每个参数应该是一个“元表达式”(Primary Expression)，
      // 而不是一个完整的、可能包含二元操作的表达式 (Expression)。
      // 这样就允许 #[{sum} $[A] $[B]] (解析出两个独立的参数)
      // 但会阻止 #[{sum} $[A] + $[B]] (因为 '+' 不是一个 Primary，会在此处报错)
      while (!this.check('RBRACKET') && !this.isAtEnd()) {
        args.push(this.parsePrimary());
      }

      this.consume('RBRACKET', `函数参数 ${funcName} 后面需要 "]"`);
      return { type: 'FunctionCall', name: funcName, args };
    }

    throw new Error(`意外的标记: ${this.peek().type} (${this.peek().value}) 位于 ${this.peek().start}`);
  }

  // --- Helpers ---

  private match(type: TokenType, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchOp(values: string[], type?: TokenType): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();

    const typeMatch = type ? token.type === type : token.type === 'OP_LOGIC' || token.type === 'OP_MATH';

    if (typeMatch && values.includes(token.value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(`${message} (位于位置 ${token.start})`);
  }

  private check(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private previous(): Token {
    return this.tokens[this.position - 1];
  }
}
