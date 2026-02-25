// lexer.ts

export type TokenType =
  | 'IDENTIFIER' // $[path]
  | 'TEMP_VARIABLE' // @[{g|s}name]
  | 'LITERAL' // &[{type}value]
  | 'OP_LOGIC' // ?[==], ?[&&]
  | 'OP_MATH' // #[+], #[=]
  | 'FUNC_START' // #[{ln}
  | 'RBRACKET' // ] (用于闭合函数调用)
  | 'LPAREN' // (
  | 'RPAREN' // )
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export interface LiteralValue {
  type: 'number' | 'string' | 'boolean' | 'null' | 'array' | 'object';
  value: any;
}

export class DSLLexer {
  private position = 0;
  private tokens: Token[] = [];

  constructor(private input: string) {}

  tokenize(): Token[] {
    this.position = 0;
    this.tokens = [];

    // 预处理：简单的跳过外层 wrapper
    this.skipWrapperHeader();

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      // 跳过空白
      if (this.isWhitespace(char)) {
        this.position++;
        continue;
      }

      // 结束符 > (Wrapper的结尾)
      if (char === '>') {
        this.position++;
        continue;
      }

      if (char === '(') {
        this.addToken('LPAREN', '(');
        continue;
      }

      if (char === ')') {
        this.addToken('RPAREN', ')');
        continue;
      }

      // 变量 $[...]
      if (char === '$') {
        this.tokenizeDollar();
        continue;
      }

      // 新增：临时变量 @[...]
      if (char === '@') {
        this.tokenizeAt();
        continue;
      }

      // 字面量 &[{type}val]
      if (char === '&') {
        this.tokenizeAmpersand();
        continue;
      }

      // 逻辑/比较运算符 ?[...]
      if (char === '?') {
        this.tokenizeQuestion();
        continue;
      }

      // 算术运算符 或 函数调用 #[...]
      if (char === '#') {
        this.tokenizeHash();
        continue;
      }

      // 函数闭合符 ]
      if (char === ']') {
        this.addToken('RBRACKET', ']');
        continue;
      }

      throw new Error(`意外的字符: ${char} 位于位置 ${this.position}`);
    }

    this.addToken('EOF', '');
    return this.tokens;
  }

  private skipWrapperHeader() {
    const regex = /^<<(if|op)>\s*/;
    const match = this.input.slice(this.position).match(regex);
    if (match) {
      this.position += match[0].length;
    }
  }

  private tokenizeDollar() {
    // $[path]
    const start = this.position;
    this.position++; // $
    if (this.peek() !== '[') throw new Error('在 "$" 后面需要 "["');
    this.position++; // [

    const contentStart = this.position;
    while (this.position < this.input.length && this.peek() !== ']') {
      this.position++;
    }

    const path = this.input.slice(contentStart, this.position);
    if (this.peek() !== ']') throw new Error('未闭合的标识符');
    this.position++; // ]

    this.tokens.push({ type: 'IDENTIFIER', value: path, start, end: this.position });
  }

  // 新增方法
  private tokenizeAt() {
    // @[{g|s}name]
    const start = this.position;
    this.position++; // @
    if (this.peek() !== '[') throw new Error('在 "@" 后面需要 "["');
    this.position++; // [

    const contentStart = this.position;
    while (this.position < this.input.length && this.peek() !== ']') {
      this.position++;
    }

    const content = this.input.slice(contentStart, this.position);
    if (this.peek() !== ']') throw new Error('未闭合的临时变量');
    this.position++; // ]

    // 验证内部格式 {g|s}name
    if (!/^\{(g|s)\}\w+$/.test(content)) {
      throw new Error(`无效的临时变量格式: @[${content}]`);
    }

    this.tokens.push({ type: 'TEMP_VARIABLE', value: content, start, end: this.position });
  }

  private tokenizeAmpersand() {
    // &[{type}value]
    const start = this.position;
    this.position++; // &
    if (this.peek() !== '[') throw new Error('在 "&" 后面需要 "["');
    this.position++; // [

    const contentStart = this.position;
    while (this.position < this.input.length && this.peek() !== ']') {
      this.position++;
    }

    const raw = this.input.slice(contentStart, this.position);
    if (this.peek() !== ']') throw new Error('未闭合的字面量');
    this.position++; // ]

    this.tokens.push({ type: 'LITERAL', value: raw, start, end: this.position });
  }

  private tokenizeQuestion() {
    // ?[==]
    const start = this.position;
    this.position++; // ?
    if (this.peek() !== '[') throw new Error('在 "?" 后面需要 "["');
    this.position++; // [

    const contentStart = this.position;
    while (this.position < this.input.length && this.peek() !== ']') {
      this.position++;
    }

    const op = this.input.slice(contentStart, this.position);
    if (this.peek() !== ']') throw new Error('Unclosed operator');
    this.position++; // ]

    this.tokens.push({ type: 'OP_LOGIC', value: op, start, end: this.position });
  }

  private tokenizeHash() {
    // #[+] OR #[{ln}
    const start = this.position;
    this.position++; // #
    if (this.peek() !== '[') throw new Error('在 "#" 后面需要 "["');
    this.position++; // [

    // 检查是否是函数调用：#[{
    if (this.peek() === '{') {
      this.position++; // {
      const nameStart = this.position;
      while (this.position < this.input.length && this.peek() !== '}') {
        this.position++;
      }
      const funcName = this.input.slice(nameStart, this.position);
      if (this.peek() !== '}') throw new Error('未闭合的函数名');
      this.position++; // }

      this.tokens.push({ type: 'FUNC_START', value: funcName, start, end: this.position });
    } else {
      // 普通算术运算符 #[+]
      const contentStart = this.position;
      while (this.position < this.input.length && this.peek() !== ']') {
        this.position++;
      }
      const op = this.input.slice(contentStart, this.position);
      if (this.peek() !== ']') throw new Error('未闭合的操作符');
      this.position++; // ]

      this.tokens.push({ type: 'OP_MATH', value: op, start, end: this.position });
    }
  }

  private addToken(type: TokenType, value: string) {
    this.tokens.push({
      type,
      value,
      start: this.position,
      end: this.position + value.length,
    });
    this.position += value.length;
  }

  private peek(): string {
    return this.position < this.input.length ? this.input[this.position] : '\0';
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }
}

export function parseLiteralValue(raw: string): LiteralValue {
  const match = raw.match(/^\{(\w+)\}(.*)$/s); // Use 's' flag for dot to match newlines
  if (!match) {
    const num = parseFloat(raw);
    return isNaN(num) ? { type: 'string', value: raw } : { type: 'number', value: num };
  }

  const [, type, valStr] = match;
  switch (type) {
    case 'num':
      return { type: 'number', value: parseFloat(valStr) };
    case 'str':
      return { type: 'string', value: valStr };
    case 'bool':
      return { type: 'boolean', value: valStr === 'true' };
    case 'null':
      return { type: 'null', value: null };
    default:
      return { type: 'string', value: valStr };
  }
}
