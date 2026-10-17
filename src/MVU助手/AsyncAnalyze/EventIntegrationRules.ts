/** Copyable frontend implementation prompt, shared across tasks and installations. */
export function createEventIntegrationRules(): string {
  return `# 为角色卡前端接入 MVU助手事件任务

请根据我提供的前端代码和任务用途，完成 MVU助手联动。先理解现有界面的数据流，沿用已有组件、结果解析和状态管理，实现触发任务、显示等待、接收处理结果、更新界面的完整流程。

## 1. 只约定一个任务事件名

用 EVENT_NAME 表示 MVU助手任务中配置的“附加事件名”。请从我提供的配置或现有前端中取得这个名称；如果没有提供，先向我确认，不要自行编造。

- 触发任务：EVENT_NAME。
- 接收处理结果：EVENT_NAME + ':output'。
- 查询本次运行终态：EVENT_NAME + ':result'。

例如任务事件名为 Chat_On_WeChat，前端触发 Chat_On_WeChat，监听 Chat_On_WeChat:output 获取处理后的结果。不要再设置一份独立的广播事件名。

助手侧需将任务关联到当前活动规则组，并在“结果处理”添加写入、将“目标”选为“事件广播”。广播可以和正文、世界书目标同时使用；常规运行也可以产生广播。

## 2. 接收的是处理链完成后的结果

模型响应先经过任务的响应阶段正则，再经过该广播写入的提取规则，最后通过 EVENT_NAME + ':output' 发送以下对象：

\`\`\`ts
 type OutputPayload = {
  version: 1;
  scriptId: string;
  runId: string;
  requestId: string;
  taskId: string;
  writeId: string;
  chatId: string;
  messageId: number;
  swipeId: number;
  text: string;
};
\`\`\`

使用 payload.text 作为前端的业务输入。它已经完成助手侧的正则处理与提取，不要改读 tasks[].text 或运行诊断全文，也不要重复执行助手的提取规则。如果业务约定 text 为 JSON，再按约定解析；解析失败应保留原界面数据并展示错误，不要伪造空结果当作成功。

## 3. 角色卡分发不依赖安装 ID

前端按 EVENT_NAME + ':output' 监听即可。角色卡和任务配置发给别人后，继续使用相同事件名，不需要知道或修改对方的脚本 ID。

不要硬编码作者的 scriptId、taskId 或 writeId 作为接收条件。payload 中这些字段是当前运行的来源信息；需要去重时可组合 scriptId、runId、taskId、writeId，而不能把作者安装实例的 ID 当作白名单。

## 4. 主动触发与被动接收

在界面挂载时先通过 eventOn(EVENT_NAME + ':output', handler) 注册监听，再允许用户触发任务。保持监听以接收后续任务结果，界面卸载时调用监听返回值的 stop() 清理；Vue 使用对应卸载钩子，消息页销毁也要清理。

前端主动触发时，先等待 waitGlobalInitialized('KatTaskAPI')，为每次操作生成新的 requestId，并使用该操作绑定的消息楼层：

\`\`\`ts
await eventEmit(EVENT_NAME, { requestId, messageId });
\`\`\`

这里的 EVENT_NAME、requestId、messageId 必须接入实际前端逻辑，不能留下未定义变量。事件参数用于关联请求和定位楼层，不会自动注入模型提示词；要让模型读取业务内容，需沿用任务现有的变量、宏或模板输入方式。

主动请求按 requestId 关联返回；被动接收常规任务时不要求匹配某次前端请求。两者都要核对当前界面绑定的 chatId、messageId、swipeId，忽略切换聊天、楼层或消息页后的迟到结果。消息楼层前端应使用自身绑定楼层，不要一律取聊天最后一楼。

## 5. 等待与失败也要收口

主动触发的前端还需监听 EVENT_NAME + ':result'，按 requestId 识别 RunResult 终态，结束等待并显示 busy、skipped、failed、cancelled 或 partial 的原因。没有成功广播时也必须能退出等待，不要把“发出触发事件”当作成功完成。

业务内容由 :output 的 payload.text 更新界面；:result 用于运行状态反馈，避免同一次运行更新两遍业务内容。部分成功时保留已经收到的成功项，并显示失败项。接收回调自行捕获解析与界面更新异常，不要在其中无条件重新触发任务。

常规链全部提交成功后才广播，事件任务按自身成功结算交付。广播不持久保存、不重放，已交付内容无法撤回；重新计算会生成新的 runId，可能再次交付。按业务用途决定覆盖或保留结果，并妥善清理去重记录。

## 6. 交付与验证

直接修改我提供的前端，给出完整可用代码或明确的文件修改，并说明助手侧要填写的 EVENT_NAME 和广播目标设置。

至少检查：正常触发并更新界面、连续两次请求、无成功广播的失败终态、被动收到结果、切换聊天或消息页后拒绝迟到结果，以及角色卡换一个脚本安装实例后仍按同一事件名联动。只修改联动所需部分，保留已有界面和业务行为。
`;
}
