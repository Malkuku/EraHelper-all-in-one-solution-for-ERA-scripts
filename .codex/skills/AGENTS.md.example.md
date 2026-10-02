## 核心要求

本项目采用 Spec 驱动开发。开始任务时先阅读 `.codex/skills/spec-driven-agent-workflow/SKILL.md`，并优先通过 `Spec/AI2AI/索引.md` 判断需要阅读哪些项目文档。

`./Spec/AI2AI/` 保存项目长期工程知识，包括核心项目说明、产品定位、业务规则、架构设计、模块契约、测试方案、迭代任务等。具体文档结构根据项目实际需求持续演进，不要求固定层级或固定文件。

长期 Spec 不是只读文档。开发过程中形成新的稳定结论，或既有产品、业务、架构事实发生变化时，应及时更新对应 Spec；已经失效的描述应删除或改写，避免旧结论继续约束后续开发。

阅读原则：

* 优先读取 `Spec/AI2AI/索引.md`。
* 根据索引和当前任务按需读取相关 Spec/API。
* 不要求每次迭代完整读取全部 `AI2AI`。
* CodeBase 只在定位实现、确认当前行为、修改或验证时深入阅读。
* Spec 与实现冲突时明确判断是实现偏差还是 Spec 漂移，不自行忽略差异。

尚未形成稳定结论的需求讨论不直接写入长期 Spec；确定后的产品、业务或架构结论再沉淀到对应文档。

## 文件编码

所有文档和源码默认使用 UTF-8。

在 Windows PowerShell 中读取中文 Markdown 文档时，必须显式指定 `-Encoding UTF8`，例如：

```powershell
Get-Content -Raw -Encoding UTF8 "Spec/AI2AI/索引.md"
```

不要先用默认编码读取中文文档再解释乱码；如果看到中文乱码，优先检查命令是否缺少 `-Encoding UTF8`。

## 编译与启动

优先使用 JetBrains MCP 执行项目编译、启动和关闭，不再优先手写命令。

* 编译/构建：优先调用 JetBrains MCP 的 `build_project`，需要指定模块或文件时传入对应参数。
* 启动当前项目/客户端：优先通过 JetBrains MCP 的 `get_run_configurations` 查找运行配置，再使用 `execute_run_configuration` 启动。
* 如果需要启动后再由 Agent 关闭进程，优先使用 JetBrains MCP 的 `xdebug_start_debugger_session` 启动，并使用 `xdebug_control_session` 的 `STOP` 关闭。
* JetBrains MCP 不可用时，直接中断相关编译或运行步骤并记录任务进度，同时说明无法使用 MCP 的原因。

## Agent 协作

允许根据任务范围自行判断是否使用子 Agent、委派或并行执行。

具体任务分类、Agent 分工、迭代门禁、验证和文档维护规则，以 `.codex/skills/spec-driven-agent-workflow/SKILL.md` 为准。
