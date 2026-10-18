/** Task integration instructions, shared across output targets and installations. */
export const taskIntegrationPrompt = `# 为前端接入 MVU助手任务

请结合我提供的前端代码、任务配置和业务用途，实现“发起任务 → 等待结算 → 按结果更新界面”。沿用现有组件、数据解析和状态管理，只修改联动需要的部分。

## 1. 一个事件名，一次请求

EVENT_NAME 对应任务配置的“附加事件名”；从已有代码或我提供的配置取得，缺少时向我确认，不要编造。

- EVENT_NAME：触发任务。
- EVENT_NAME + ':result'：本次请求的最终结算，适用于所有写入目标。
- EVENT_NAME + ':output'：配置了“事件广播”目标时，交付处理后的业务文本。

角色卡分发后沿用相同事件名，不硬编码作者的脚本 ID、任务 ID 或写入 ID。

## 2. 发起和等待

先注册 :result 监听；需要广播文本时同时注册 :output 监听，再允许触发。等待 waitGlobalInitialized('KatTaskAPI')，为每次操作生成新的 requestId，记录界面绑定的聊天、消息楼层及消息页，然后调用：

\`\`\`ts
await eventEmit(EVENT_NAME, { requestId, messageId });
\`\`\`

requestId 用于把结果对应回这次操作，messageId 使用当前界面实际绑定的楼层。事件参数不自动注入模型提示词，模型需要的业务输入沿用任务的变量、宏或模板方式。

发起后显示等待，避免同一操作重复点击。发送调用抛错时结束等待并显示错误；正常执行由匹配 requestId 的 :result 结束等待。

## 3. 用 result 判断操作结果

:result 的 RunResult 含 requestId、runId、chatId、messageId、swipeId、status、tasks、warnings、rollback。tasks 中每项含 taskId、status、error、reason、writes；writes 中每项含 writeId、target、status、error。

收到与当前操作匹配的 result 后，先结束等待，再按结算处理：

- succeeded：任务完成，按实际写入目标刷新界面。
- partial：逐任务处理成功项和失败项，保留成功结果并显示失败原因。
- failed / cancelled：显示错误或取消状态；结合 writes 与 rollback 告知已保留或回滚的修改，不把所有失败都当作“什么也没发生”。
- busy / skipped：本次未执行，显示占用或跳过原因，让用户继续操作。

具体原因取 result.reason、tasks[].error.message、tasks[].reason.message；warnings 和 rollback 的错误按需显示。写入状态 committed 表示文本已写入，delivered 表示广播已交付，delivery_failed / not_delivered 表示广播交付失败或未交付，rolled_back / rollback_failed 表示回滚结果。

## 4. 按任务的实际目标刷新

正文、世界书或 MVU 更新任务：根据 result 中对应任务和写入的状态，调用前端已有的数据读取或刷新逻辑。此类前端可以只使用 :result，无需为联动另外添加广播目标。

事件广播任务：从 :output 的 payload.text 取得业务文本。payload 还含 version=1、requestId、runId、scriptId、taskId、writeId、chatId、messageId、swipeId；这些 ID 来自本次运行，不作为作者安装实例的固定白名单。

payload.text 已经过任务响应正则和该广播目标的提取规则。按业务约定解析它，不重复执行助手的提取规则，也不使用 result.tasks[].text 的诊断全文代替。解析失败保留原界面数据并显示错误。

:output 更新业务内容，:result 负责本次操作的结算和等待状态，避免两处重复应用同一份文本。一次事件可执行多个任务，按各任务、各写入的结算处理，不能凭一条广播判定整次操作全部成功。

例如事件名为 Chat_On_WeChat，触发 Chat_On_WeChat，监听 Chat_On_WeChat:result 获取结算；需要广播文本时再监听 Chat_On_WeChat:output。

## 5. 保持实现简单

结果按 requestId 关联主动操作，并核对界面绑定的聊天、楼层、消息页；界面切换后清理本页等待状态，忽略旧页面的迟到结果。被动接收任务广播时按当前页面绑定处理，不要求存在主动请求。

监听在挂载时注册、卸载时调用 stop() 清理。复用前端已有的刷新和错误展示方式，不引入额外的确认回执、自动重试、轮询、补偿事务或持久队列。失败由用户核对后决定再次执行；不要因为没有收到广播就自动重发任务。

## 6. 交付

直接修改已有前端，给出完整代码或明确的文件修改，说明助手侧需要配置的事件名、活动规则组和实际写入目标。

检查正常完成、失败/忙碌/跳过时结束等待、部分成功保留成功项、切换页面后忽略旧结果，以及分发到另一安装实例后仍按同一事件名联动。不要为本次没有使用的输出目标增加代码。
`;
