# Grill Me Discussion Draft

## 当前目标

当前先确定并实施保守的组装锁与世界书过滤隔离，保留现有预设/Profile 行为和宿主版本要求；结果契约、预设按请求选择、其他并发与写入语义属于后续阶段。当前仍在讨论，尚未开始实施。

## 已确认结论

### 锁边界的目标澄清

- 用户关注的是消除请求组装期间读取共享状态的竞态窗口；不要求以网络请求实际发出作为形式上的释放条件。`CHAT_COMPLETION_SETTINGS_READY` 出现在官方聊天补全参数组装后，可作为考察组装完成的候选边界，但该事件没有任务 ID，且其监听器尚未全部完成；是否能安全用于当前任务解锁，取决于可验证的关联方式和后续共享状态读取检查。第一阶段是否接受完整生成锁、暂时放弃模型等待并行仍待确认。

### 宿主能力与生成入口

- 用户明确要求其他玩家可直接使用原版酒馆和原版酒馆助手；不得把修改、维护或分发宿主补丁作为实施前提。此前提出的按请求过滤参数接口仅是反事实分析，已排除出本项目方案。
- 保留酒馆的提示词组装和世界书过滤能力；不自行重建这套机制。任务可与主聊天共享世界书，任务结果也可写入正文。
- 长期方向是不依赖全局切换来实现任务预设，但**本阶段不做预设迁移**：保留现有全局预设切换、Profile 模式及其既有行为。本阶段仅处理组装阶段竞态，不因 `preset_name` 要求玩家升级酒馆助手。
- 酒馆助手从 **4.8.7**（2026-05-09）起支持 `generate({ preset_name })`，但该入口不运行所选预设的正则及酒馆助手脚本；这属于后续预设迁移时才需要评估的差异。

### 并发边界

- 任务仍依赖全局世界书过滤状态及宿主提示词状态。为保证各请求按自身配置组装，提示词与世界书**组装阶段短暂串行**；请求发出后的模型等待允许并行。具体锁的释放点须根据实际生成路径验证，不能仅凭“生成已开始”事件推断请求已发出。
- 主聊天与事件任务同时触发时，双方的世界书过滤必须互不串扰；仅串行本插件的任务不满足这一要求。
- 用户澄清的 **1 秒** 是观察到当前生成路径在网络发送前**最靠后的可观察事件之后**的安全缓冲，期间不得切换该请求依赖的世界书过滤状态；不是“先等 1 秒，没完成就返回 busy”的超时，也不能作为缺失完成事件时的解锁依据。聊天补全路径候选为 `CHAT_COMPLETION_SETTINGS_READY`，文本补全路径候选为 `TEXT_COMPLETION_SETTINGS_READY`；`GENERATE_AFTER_DATA` 只是较早的通用事件。其他后端与异常退出路径仍须明确处理。
- 主聊天在最靠后的发送前事件出现之前异常退出且没有可信完成信号时，采用故障关闭：事件任务持续明确返回 `busy`，不因 1 秒计时到期而恢复；页面刷新或后续可信信号可恢复。该行为的状态与原因需要可见，不得静默丢任务。
- 不同事件、以及事件与常规处理链可以并行。同一事件名只允许一个在途执行；再次触发时立即返回 `busy`，不排队，也不静默跳过。
- 事件触发时机不可预知。事件不等待常规链提交，允许读到常规链尚未最终确认的中间状态。

### 结果与写入

- 结果契约须报告每个任务的状态与失败原因，不能只有整体 `success`。写入型任务在预期的正文、世界书或 MVU 更新完成后才算成功；模型返回文本本身不算写入成功。
- 增加“结果返回”输出方式：任务不写正文或世界书，生成内容随成功结果交给调用方。
- 事件任务保留独立于常规处理链的结果与失败语义。结果事件名以触发事件名为前缀，使前端能够订阅对应频道；同名事件重复触发的 `busy` 也必须有明确结果。
- 事件触发的一组任务独立结算：一个任务失败时，保留其他任务已成功写入的结果，并逐项报告。常规处理链仍采用整链失败回滚。
- 并发提交同一正文消息或世界书条目时，必须基于提交时的最新内容操作。若替换条件已不匹配，报告冲突，不能用旧快照覆盖其他写入。
- 产品配置应使事件任务与常规链写入不同目标，由开发者负责。若检测到目标重叠，发出警告后继续执行，不等待或拒绝事件任务；结果应显式提示常规链回滚可能影响该事件写入。不同目标时，常规链回滚不得抹掉事件已提交的结果。

### API key

- 将 API key 从酒馆脚本变量移到浏览器本地持久化，以避免角色卡、脚本变量和普通配置导出或分享时误带密钥。普通配置只保存密钥引用，导出不含密钥；迁移时清除旧脚本变量中的密钥。不把防范同源脚本读取作为本轮目标。

## 关键实现依据

- `src/MVU助手/AsyncAnalyze/AsyncAnalyzeEvents.ts` 的事件入口目前受全局 `isAnalyzing` 限制，冲突时会静默跳过；事件参数未直接传给任务执行，但现有酒馆变量和提示词模板已经能传入前端内容，不需新建事件参数注入机制。
- `src/MVU助手/AsyncAnalyze/AsyncAnalyzeService.ts` 的普通链在失败时尝试回滚；`kat_handle_mvu_finished` 在 `finally` 发出且无结果载荷，即使失败也会发出。
- `AsyncAnalyzeTaskRunner.ts`、`AsyncAnalyzeState.ts` 和 `AsyncAnalyzeFilter.ts` 使用全局生成锁、预设切换、世界书过滤状态；`WORLDINFO_ENTRIES_LOADED` 读取共享过滤状态，故移除预设切换仍不足以使组装安全并行。
- 当前 `AsyncAnalyzeTaskRunner.ts` 在发起 `generate()` 前切换全局预设，且 `restoreGlobalPreset()` 等到 Service 流程结束才还原；Profile 在 `generate()` 返回后的 `finally` 才还原。本阶段保留这些行为时，若在发送前事件加 1 秒后释放共享组装锁，而预设/Profile 仍是任务值，主聊天随后可能读取任务预设。提前还原则改变旧版预设/Profile 的生命周期，尤其可能影响绑定脚本等后续行为。必须在“保持原生命周期”和“发送前后开放主聊天并发”之间作出明确取舍，不能只处理世界书过滤而遗漏预设。
- `AsyncAnalyzeResultHandler.ts` 对正文和世界书使用读改写流程。`AsyncAnalyzeBackup.ts` 恢复整条消息或世界书条目，且当前备份会遍历规则组内全部任务，包括事件任务；实施时须按实际执行范围限定备份与回滚，并处理并发提交。
- 上游酒馆助手 [4.8.7 更新日志](https://github.com/N0VI028/JS-Slash-Runner/blob/c8f0b694a34db0fb20282267c6f685d81f25ead5/CHANGELOG.md) 和 [实现](https://github.com/N0VI028/JS-Slash-Runner/blob/4.8.7/src/function/generate/index.ts) 证实 `preset_name` 的行为。此前的调查使用酒馆助手 `46ec10d`、酒馆 `06bde93` 源码：`js_generation_started` 早于请求参数组装；`GENERATE_AFTER_DATA` 也在参数组装前；`CHAT_COMPLETION_SETTINGS_READY` 位于参数组装后、网络请求前，但事件本身没有 `generation_id`。这些事件都不能直接充当可靠的逐任务“请求已发送”信号。
- 酒馆的 Profile 数据可能缺字段，`/profile-list` 只给名称；`ConnectionManagerRequestService.sendRequest` 虽可按请求选择 Profile，却要求调用方提供已组装的提示词。尚无已验证的公共入口能同时完成 Profile 按请求选择与酒馆助手的完整提示词组装。
- 现有 UI 的 Sample/External 模式均可指定预设；External 还单独配置温度和最大 Token。酒馆助手 4.8.7 的 `convertGenerateWithCustomPreset` 会把命名预设中的 `max_completion_tokens`、`temperature` 等值覆盖进 `custom_api`，因此直接改用 `preset_name` 可能改变 External 显式数值优先级。该差异留待后续预设迁移阶段，不属于当前保守锁处理。
- 已直接核对 SillyTavern 官方 1.19.0 源码：`events.js` 定义了 `GENERATION_STARTED`、`GENERATE_AFTER_DATA`、`TEXT_COMPLETION_SETTINGS_READY`、`CHAT_COMPLETION_SETTINGS_READY` 等事件，没有请求已发送事件。官方 `openai.js` 在 `CHAT_COMPLETION_SETTINGS_READY` 的 `await eventSource.emit(...)` 之后才 `fetch()`；`textgen-settings.js` 在 `getTextGenGenerationData` 返回前触发 `TEXT_COMPLETION_SETTINGS_READY`，实际请求还在后续流程。官方 `script.js` 在组装前触发 `GENERATION_STARTED`，组装后触发 `GENERATE_AFTER_DATA`。这些官方事件都不标识某一任务的网络请求已发出。
- 酒馆助手 4.8.7 的 `eventOn` 直接向酒馆 `eventSource` 注册包装监听器并返回其 Promise；酒馆官方事件发射器逐个 `await` 监听器，所以主聊天可在 `GENERATION_STARTED` 被暂停。但官方 `Generate` 在该事件之后、`GENERATE_AFTER_DATA` 之前有斜杠命令中断、接口前置检查返回以及服务器不可达抛错等路径；单靠 `GENERATE_AFTER_DATA`、`GENERATION_ENDED` 或 `GENERATION_STOPPED` 清理锁，缺乏覆盖全部路径的保证。`WORLDINFO_ENTRIES_LOADED` 事件本身不携带生成 ID，无法在已有并发下可靠判断条目属于主聊天还是事件任务。
- 无宿主补丁方案必须明确处理主聊天在 `GENERATION_STARTED` 后、`GENERATE_AFTER_DATA` 前提前结束而没有后续事件的情况；完成事件后的 1 秒缓冲对此无效。用户指出双向等待可能死锁，设计上不得让任务与主聊天互相持锁等待：先到者完成自己的组装，后到者在进入世界书扫描前等待；若主聊天状态无法确认，事件任务返回明确结果，不能让主聊天等待一个依赖其完成事件的任务。具体异常恢复仍待解决。

## 尚待确认或实施验证

- 已核对 SillyTavern 1.19.0 的 `getWorldInfoPrompt(chat, maxContext, isDryRun, globalScanData)` 与 `checkWorldInfo(...)`：第四参是扫描文本上下文，没有条目过滤参数；`getSortedEntries()` 也无参数。酒馆助手 4.8.7 的 `processWorldInfo` 调用该四参函数，`generate` 未暴露世界书条目过滤字段。由于用户要求原版宿主，不能通过新增按请求过滤参数解决；必须在本项目现有事件与调用边界内处理并发，无法确认空闲时应显式返回 `busy` 而非猜测释放。
- 锁的目的已明确为消除共享状态参与组装时的竞态，不要求精确覆盖到网络发送。酒馆助手 4.8.7 的 `js_generation_started` 带 `generation_id`，但早于组装；`GENERATE_AFTER_DATA` 在组装后、请求参数生成前；`CHAT_COMPLETION_SETTINGS_READY` 在 `fetch()` 前，但不带 `generation_id`。这些事件可用于观察阶段，尚不足以可靠区分主聊天与任务的并发世界书扫描。
- 后续预设迁移阶段再决定命名预设的正则、脚本语义以及版本兼容策略；本阶段不得以这些未决问题扩大实施范围。
- 组装锁的进入与释放边界、全局提示词状态的恢复方式，需要在目标版本的实际生成路径上验证。
- 当前阶段若严格保留全局预设切换的整个生命周期，最保守隔离边界可能需持续到 `generate()`/整链结束；这会让任务与主聊天在模型等待期间串行，与先前“组装后允许模型等待并行”冲突。待用户确认优先级。
- 结果载荷的字段、任务标识、失败与 `busy` 表达，以及结果事件的确切命名规则，需要写成可实施的 API 契约。
- 常规链回滚与事件写入的交错实现、重叠目标警告的检测粒度，需要在迭代设计中具体化；重叠时不承诺同时满足完整回滚与事件写入原样保留。

## 实施约束

- 进入实施前，将上述稳定结论迁入相关 Spec、API 契约和迭代任务；正式工件承接后清理本草稿。
