export interface EraDataRule {
  [key: string]: {
    path: string; //要修改的路径，支持.*匹配 角色.*.特殊状态.好感度 //当path为*时，表示全局模式，只操作handle
    enable: boolean; //是否启用
    order: number; //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
    loop?: number; //循环次数，默认为1且不能小于1，最大值为1000 //如果配置了if表达式，当结果为false时，直接终止循环
    range?: [number, number]; //数据范围 [0,100]
    limit?: [number, number]; //数据限制 [-5,10]
    if?: string; //判断条件，控制rule下所有的handle是否执行；不影响上面的range和limit
    handle?: {
      //处理函数 //要求类型必须相同，否则操作将被跳过
      [key: string]: {
        order: number; //处理顺序，将所有规则按照顺序处理，值越小越先处理。默认为0
        loop?: number; //循环次数，默认为1且不能小于1，最大值为1000 //如果配置了if表达式，当结果为false时，直接终止循环
        //判断可选条件表达式<<if>  >
        // <<if> $[path1] ?[==] $[path2]>
        // <<if> ($[path1] ?[<=] $[path2]) ?[&&] ($[path2] ?(==) &[{num}2])>
        // ?[] 写判断符号,支持== > < <= >= 符号 和 && || 逻辑运算符,()表示优先级
        // $[] 用path表示一个完整路径
        // 用#[]表示操作符号,支持+ - * / % ** =运算符
        // #[{}],表示一些特殊的符号,支持ln,log2,sqrt,abs,floor,ceil,max,min,random
        // 比如&[{num}1],符号为{num},{str},{bool},{null}
        if?: string;
        //操作表达式 <<op> >
        // <<op> $[path1] = $[path1] #[+] &[{num}2]>
        // #[] 符号表示操作符号，同上
        // 比如#[{ln}$[path]] 表示ln(path)，#[{max}$[path1]$[path2]],将计算path1和path2的最大值，可以多个值，比如#[{max}$[path1]$[path2]$[path3]]
        // $[] 里面写路径，同上
        // &[] 表示一个值，同上
        op: string;
      };
    };
  };

  /**
   * 优先级 1.handle 2.limit 3.range
   * 核心执行顺序：
   * for(rule in rules){ //rule按照rule.order执行
   *   for(rule: loop循环){
   *     if(rule.if == false){
   *        data = data -> 执行 range
   *        data = data -> 执行 limit
   *        break;
   *     }
   *     for(handle in handles){ //handle按照handle.order执行
   *       for(handle: loop循环){
   *         if(handle.if == false) break;
   *         data = data -> 执行 handle
   *       }
   *     }
   *     data = data -> 执行 range
   *     data = data -> 执行 limit
   *   }
   * }
   */

  /**
   * 通配符的执行逻辑：
   * 通配符会进行顺序替换
   * - 所有路径中的第一个 * 互相绑定。
   * - 所有路径中的第二个 * 互相绑定。
   * 以此类推
   * 简单地说：
   * 当执行：角色.*.开发经验值.* + 身体开发等级.*.* 时
   * 会变成：
   * [
   * 角色.小明.开发经验值.左手 + 身体开发等级.小明.左手，
   * 角色.小王.开发经验值.左手 + 身体开发等级.小王.左手，
   * 角色.小王.开发经验值.右手 + 身体开发等级.小王.右手
   * ]
   *
   * 对于一个rule来说，其中所有的path共享一个通配符绑定上下文（除了全局模式本身的*）
   */

  /**
   * 有且只能出现以下符号：
   * 优先级符号 ()
   * 路径符号 $[path] 使用逗号路径表示，允许通配符 *
   * 判断符号 ?[==] ?[>] ?[<] ?[<=] ?[>=]
   * 值符号 &[{num}10] &[{str}hello] &[{bool}true] &[{null}]
   * 操作符号 #[+] #[-] #[*] #[/] #[%] #[**] #[=]
   * 操作符号 #[{ln}$[path]] #[{log2}$[path]] #[{sqrt}$[path]] #[{abs}$[path]] #[{floor}$[path]] #[{ceil}$[path]] #[{neg}$[path]]
   * 操作符号 #[{max}$[path1]$[path2]...] #[{min}$[path1]$[path2]...]  #[{avg}$[path1]$[path2]...]  #[{sum}$[path1]$[path2]...]
   * 操作符号 #[{random}&[{num}min]&[{num}max]] 生成[min, max]范围内的随机整数
   * 临时变量符号 @[{g}name] @[{s}name] g表示全局变量，会在所有rule下生效；s表示临时变量，只在当前rule下生效
   */

  /**
   * DSL语法结构优先级 (数字越小优先级越大):
   * 1： 括号 ( )
   * 2： 函数调用（如 #{ln}、#{max}、#{random} 等）
   * 3： 标识符（$[path]）和字面量（&[{type}value]）
   * 运算符：
   * 4： {ln}, {log2}, {sqrt}, {abs}, {floor}, {ceil}, {random}（函数运算符）
   * 5： **（幂运算）
   * 6： *, /, %（乘除模运算符）
   * 7： +, - （加减运算符）
   * 8： ==, !=, <, >, <=, >=（比较运算符）
   * 9： &&（逻辑与）
   * 10： ||（逻辑或）
   * 赋值操作：
   * 11： =
   */

  /**
   * 注意：
   * - handle的loop循环是先重复执行这一条handle，直到loop次数达到上限或者if结果为false
   * - dsl处理器不支持连续执行if/op，一条handle只能执行一个if/op，
   *  比如在写等级提升时，应该先写升级的handle，再写扣经验值的handle
   * - op执行后对data的修改会立刻生效，比如在写等级提升时，应该先升级再扣经验值
   */
}

export interface EraDataRuleHandle {
  [key: string]: {
    order: number;
    if?: string;
    op: string;
  };
}
