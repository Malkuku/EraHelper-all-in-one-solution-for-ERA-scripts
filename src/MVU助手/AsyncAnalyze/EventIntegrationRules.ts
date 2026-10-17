/** Copyable integration contract; kept alongside the runtime rather than in UI markup. */
export function createEventIntegrationRules(scriptId: string, eventName: string): string {
  return `# MVU助手：事件任务与其它前端联动

助手脚本 ID：${JSON.stringify(scriptId)}
示例事件名：${JSON.stringify(eventName)}

## 配置规则
- 任务需关联当前活动规则组，并填写事件名。
- “参加常规链”只控制普通消息/手工常规链；关闭后，事件仍可触发任务。开启则两种入口都可执行。
- 触发间隔为1时不限制重复触发；大于1时，当前楼层减上次触发楼层达到间隔才执行，首次从0起算。事件也遵守间隔。楼层回退时，本次跳过并重置间隔基线。
- 输出选择“事件结果广播”。仅事件执行支持此方式；请关闭常规链参与。结果通过“事件名:result”广播，不将结果持久化到聊天变量，不写正文、世界书或MVU。
- 同一事件在同一聊天中只允许一个在途运行，重复请求返回busy，不排队。不同事件可并发。

## 调用与监听
先等待助手初始化，再注册结果监听，最后触发。每次使用新的requestId关联结果，不要只按事件名认领。广播载荷为RunResult，正文在tasks[].text；不要把整个载荷当字符串。前端应在卸载时移除监听。

\`\`\`ts
await waitGlobalInitialized('KatTaskAPI');
const eventName = ${JSON.stringify(eventName)};
const requestId = crypto.randomUUID();
const messageId = getLastMessageId();
const chatId = SillyTavern.getCurrentChatId();
const listener = eventOn(eventName + ':result', result => {
  if (result.requestId !== requestId) return;
  listener.stop();
  if (result.chatId !== chatId || result.messageId !== messageId) return;
  // busy/skipped/failed/cancelled 都是终态，需展示原因；partial需逐任务判断。
  for (const task of result.tasks) {
    if (task.status === 'succeeded') {
      console.log(task.taskId, task.taskName, task.text);
      // 在此更新前端；按taskId区分同一事件关联的多个任务。
    } else {
      console.warn(task.taskId, task.error?.message || task.reason?.message || task.status);
    }
  }
  console.log(result.status, result.reason, result.warnings);
});
// 其它前端的卸载清理：listener.stop()。
try {
  await eventEmit(eventName, { requestId, messageId });
} catch (error) {
  listener.stop();
  throw error;
}
\`\`\`

也可直接await KatTaskAPI.run({ messageId, eventName, requestId })获取同样结构；该调用仍会广播一次结果，避免同时用Promise和监听重复处理。字符串旧调用eventEmit(eventName, requestId)仍可用，目标为触发时最新楼层。可选taskId只运行该活动组内的指定任务；事件名必须匹配。显式单任务测试跳过间隔。

## 结果规则
每次请求发一次终态结果，version=1，包含requestId、runId、trigger、chatId、messageId、status、tasks、warnings和rollback。已绑定楼层时另有swipeId，可用于拒绝前端已切换消息页后的迟到结果。busy另含activeRunId。tasks含taskId、taskName、status、attempts、text及错误/跳过原因；间隔原因包含lastTriggerFloor。只有succeeded任务的text才可作为成功结果使用；事件一组独立结算，部分成功需保留成功项并显示失败项。

广播只通知当前监听者，不持久保存、不重放。请在发送前完成监听；前端需要保留结果时自行管理。结果监听回调应自行捕获异常，避免妨碍同频道的其它消费者。不要在结果监听器中无条件重发触发事件。
`;
}
