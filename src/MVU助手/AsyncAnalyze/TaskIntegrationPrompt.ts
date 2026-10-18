/** Self-contained task integration contract copied from the workbench. */
export const taskIntegrationPrompt = `# MVU助手前端任务联动接口说明

本文面向在 SillyTavern 酒馆助手环境中运行的角色卡前端。MVU助手负责调用模型、处理响应并写入目标；前端负责触发任务、显示执行状态和刷新界面。eventOn、eventEmit、waitGlobalInitialized、getLastMessageId 等函数由酒馆助手提供，无需导入。

请根据本文和用户提供的前端代码完成联动，沿用现有组件与数据管理，只实现实际使用的功能。

## 1. 助手侧配置

1. 创建任务，填写“附加事件名”，例如 Chat_On_WeChat。
2. 将任务关联到当前活动规则组，保存配置，并确保任务的 API、预设和写入目标已经配置。
3. 按用途选择正文、世界书或事件广播目标，可以同时选择多个。仅需更新正文、世界书或 MVU 数据时，不必添加广播目标。

填写事件名后任务仅由事件触发，“参加常规链”自动关闭且不可开启。一次事件会选择活动组内同事件名的任务，并检查各任务的触发间隔；同一事件已有运行时返回 busy，不重复启动。

只约定一个事件名 EVENT_NAME。角色卡分发后沿用此名称，不需要作者或使用者的脚本 ID。

## 2. 三个事件的职责

| 事件 | 发送方 → 接收方 | 内容 |
| --- | --- | --- |
| EVENT_NAME | 前端 → 助手 | 运行请求 |
| EVENT_NAME + ':result' | 助手 → 前端 | RunResult，整次请求的最终结算 |
| EVENT_NAME + ':output' | 助手 → 前端 | OutputPayload，某个广播目标处理后的文本 |

例如触发 Chat_On_WeChat，结算频道为 Chat_On_WeChat:result，业务广播频道为 Chat_On_WeChat:output。后缀固定，不另外配置广播名称。

result 适用于所有写入目标，是结束等待、判断执行结果的依据。output 只在广播目标成功进入交付阶段时发送；一次请求可以有多条 output，也可以没有。对应请求的 output 在 result 之前发送。本文的 :result 频道用于事件入口；自动消息或手动常规链的终态频道为 kat_task_chain:result，有事件名的任务只通过事件入口运行，广播目标使用任务事件名加 :output。

## 3. 发起请求

先注册结果监听，再等待助手初始化并触发：

\`\`\`ts
await waitGlobalInitialized('KatTaskAPI');
await eventEmit(EVENT_NAME, {
  requestId: crypto.randomUUID(),
  messageId: getLastMessageId(),
});
\`\`\`

请求对象字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| requestId | string，可省略 | 本次操作的关联标识；前端主动请求应生成并保存，结果原样带回 |
| messageId | number，可省略 | 目标消息楼层，必须为非负整数；省略时使用触发时最后一楼 |
| taskId | string，可省略 | 只执行活动组内的指定任务，必须属于该事件；通常省略以运行该事件全部任务；显式指定时跳过楼层间隔 |

消息楼层前端应传自身绑定楼层，例如 getCurrentMessageId()；上面的 getLastMessageId() 示例用于操作最新楼层。不要把示例楼层选择直接用于所有界面。

事件参数只用于请求关联和目标选择，不会自动成为模型提示词。模型业务输入通过任务原有的变量、宏或模板提供。

## 4. result 的完整结构

以下是前端可使用的返回类型，所有可省略字段均以 ? 标出：

\`\`\`ts
type WriteStatus = 'committed' | 'failed' | 'rolled_back' | 'rollback_failed'
  | 'pending' | 'delivered' | 'delivery_failed' | 'not_delivered';
type RequestDiagnostic = {
  connectionName: string; model: string; endpoint: string; elapsedMs: number;
  httpStatus?: number; statusText?: string; backendCode?: string;
  backendType?: string; response?: string;
};
type TaskResult = {
  taskId: string; taskName: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'skipped' | 'rolled_back' | 'rollback_failed';
  attempts: number;
  text?: string; // 完整响应诊断文本，不是某个写入目标提取后的业务文本
  error?: {
    code: string; message: string;
    phase: 'prepare' | 'scan' | 'template' | 'request' | 'extract' | 'commit' | 'rollback';
    details?: RequestDiagnostic;
  };
  reason?: {
    code: string; message: string; currentFloor?: number;
    lastSuccessfulFloor?: number; lastTriggerFloor?: number;
  };
  writes: { writeId: string; target: string; status: WriteStatus; error?: string }[];
};
type RunResult = {
  version: 1;
  requestId: string; runId: string; activeRunId?: string;
  trigger: {
    kind: 'event' | 'sent' | 'received' | 'manual' | 'task';
    eventName?: string; taskId?: string;
  };
  chatId: string; messageId: number; swipeId?: number;
  status: 'succeeded' | 'partial' | 'failed' | 'cancelled' | 'busy' | 'skipped';
  reason?: string;
  tasks: TaskResult[];
  warnings: { code: string; message: string; target?: string }[];
  rollback: { status: 'not_needed' | 'completed' | 'partial' | 'failed'; errors: string[] };
};
\`\`\`

requestId 由前端提供并原样返回，用于关联操作；runId 由助手为本次运行分配；busy 时 activeRunId 指向占用者。taskId 与 writeId 分别标识配置中的任务和写入目标，taskName 用于显示。writes.target 是目标诊断字符串，前端无需解析其内部格式。

运行被拒绝时 tasks 可以为空；尚未绑定目标时 chatId 可以为空、messageId 可以为 -1。主动请求先按 requestId 认领结算并结束等待，再检查目标身份和逐项状态，不能因错误结果缺少目标信息而一直等待。

### 结算状态怎样使用

| result.status | 含义与前端处理 |
| --- | --- |
| succeeded | 任务完成；按实际成功目标刷新界面 |
| partial | 部分任务成功；逐任务保留成功项、显示失败项 |
| failed | 执行失败；展示具体错误，并检查 writes、rollback 中已提交或回滚的结果 |
| cancelled | 本次运行已取消；仍需检查哪些修改保留、哪些已经撤销 |
| busy | 同事件已有运行，本次未启动；结束本次等待，activeRunId 指向占用者 |
| skipped | 没有执行任务，例如未达触发间隔或没有匹配任务；显示 reason 或各任务 reason |

writes.status 的含义：committed 是文本写入完成；delivered 是广播交付完成；failed 是写入失败；delivery_failed 是广播交付失败、可能已有接收方收到；not_delivered 是未广播；rolled_back 是已撤销；rollback_failed 是撤销失败；pending 是广播等待交付。

错误说明读取 result.reason、tasks[].error.message、tasks[].reason.message 和 writes[].error。warnings 提供运行提醒；rollback.errors 描述未完成的回滚。不要只根据整体 failed 就清空数据或认定所有目标均未写入。

## 5. 怎样取得业务结果

正文、世界书、MVU：根据 result 中相关任务和写入的状态，调用前端已有的数据读取/刷新方法，读取该目标的最新数据。这类前端只需要 result，不需要为了获取完成通知再增加广播。

事件广播：监听 EVENT_NAME + ':output'，收到下面的对象：

\`\`\`ts
type OutputPayload = {
  version: 1;
  requestId: string; runId: string; scriptId: string;
  taskId: string; writeId: string;
  chatId: string; messageId: number; swipeId: number;
  text: string;
};
\`\`\`

payload.text 已依次执行响应阶段正则和该广播写入的提取规则。按业务格式使用或解析这段文本，不重复提取，也不改用 result.tasks[].text 的诊断全文。scriptId、taskId、writeId 是本次运行的来源标识，不硬编码作者的安装 ID 作为接收条件。

output 用于应用业务文本，result 用于最终结算；不要在两个回调中重复应用同一份内容。收到一条 output 只说明该目标已有交付，仍用 result 判断其他任务、目标是否成功。

## 6. 可直接运行的事件调用示例

下面示例主动运行最新楼层任务，把业务文本和最终结算输出到控制台。修改 EVENT_NAME 即可用于对应事件；实际前端将 console.log 替换为现有的界面更新/错误展示方法。

\`\`\`ts
await waitGlobalInitialized('KatTaskAPI');
const EVENT_NAME = 'Chat_On_WeChat';
const requestId = crypto.randomUUID();
const messageId = getLastMessageId();
const chatId = SillyTavern.getCurrentChatId();
const swipeId = getChatMessages(messageId, { include_swipes: true })[0]?.swipe_id;

const outputListener = eventOn(EVENT_NAME + ':output', payload => {
  if (payload.requestId !== requestId) return;
  if (payload.chatId !== chatId || payload.messageId !== messageId || payload.swipeId !== swipeId) return;
  if (SillyTavern.getCurrentChatId() !== chatId) return;
  if (getChatMessages(messageId, { include_swipes: true })[0]?.swipe_id !== swipeId) return;
  console.log('处理后的业务文本', payload.text);
});
const resultListener = eventOn(EVENT_NAME + ':result', result => {
  if (result.requestId !== requestId) return;
  outputListener.stop();
  resultListener.stop();
  // 此处结束本次请求的等待状态；即使 tasks 为空，也完成本次结算。
  console.log('最终状态', result.status, result.reason);
  console.log('逐任务与逐目标结果', result.tasks);
  console.log('运行提醒与回滚', result.warnings, result.rollback);
  // 对当前页面仍绑定的成功目标，调用已有的数据刷新方法。
});
const cleanup = () => { outputListener.stop(); resultListener.stop(); };
$(window).one('pagehide', cleanup);
try {
  await eventEmit(EVENT_NAME, { requestId, messageId });
} catch (error) {
  cleanup();
  // 此处结束等待并展示发送错误，不自动重发。
  console.error('任务调用失败', error);
}
\`\`\`

这是一份单次主动请求示例。持续被动接收时，在页面挂载注册 output 监听，按该页绑定的聊天、楼层、消息页筛选，在卸载时 stop()；不要求存在主动 requestId。主动请求则用 requestId 区分每次操作。

也可直接调用 await KatTaskAPI.run({ eventName: EVENT_NAME, requestId, messageId }) 取得同样的 RunResult；该入口仍发送对应事件，前端选择一条结算消费路径，避免重复刷新。

## 7. 实现与交付要求

沿用已有界面的等待、数据刷新和错误展示。result 到达后结束对应请求的等待；切换页面时清理本页状态和监听，忽略旧目标的迟到业务内容。只接入实际使用的目标，不增加额外回执、自动重试、轮询、补偿事务或持久队列。

根据本文修改用户提供的前端代码，交付完整可用代码或明确文件修改，并列出助手侧的事件名与写入目标设置。验证正常完成、失败/忙碌/跳过、部分成功、页面切换及角色卡分发后的联动。
`;
