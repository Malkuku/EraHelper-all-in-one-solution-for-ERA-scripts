// preprocessor.ts

export class DSLPreprocessor {
  /**
   * 预处理 DSL 表达式
   * 1. 去除所有无意义的空白字符 (\r, \n, \t, space)
   * 2. 智能识别字面量 &[...]，即使 & 和 [ 之间有空格，也会进入保护模式
   * 3. 在保护模式下，保留字面量内部的所有字符（包括空格）
   */
  static process(input: string): string {
    if (!input) return '';

    let result = '';
    let i = 0;
    const len = input.length;

    while (i < len) {
      const char = input[i];

      // 1. 检查是否是字面量起始符号 '&'
      if (char === '&') {
        // 向后预读，跳过空格寻找 '['
        let tempI = i + 1;
        while (tempI < len && /\s/.test(input[tempI])) {
          tempI++;
        }

        // 如果找到了 '['，说明这是一个字面量
        if (tempI < len && input[tempI] === '[') {
          // 写入 '&' 和 '['
          result += '&[';

          // 将主指针移动到 '[' 之后
          i = tempI + 1;

          // 进入【保护模式】：直接复制内容直到遇到 ']'
          while (i < len) {
            const innerChar = input[i];
            result += innerChar;
            i++;
            if (innerChar === ']') {
              break;
            }
          }
          continue; // 完成了一个字面量的处理，继续外层循环
        }
      }

      // 2. 普通字符处理
      if (!/\s/.test(char)) {
        result += char;
      }

      // 3. 移动指针
      i++;
    }

    return result;
  }
}
