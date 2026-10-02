# API 与数据契约索引

- [分步分析契约](./分步分析契约.md)：脚本变量配置、任务触发、事件、结果合并与备份状态。对应 `src/MVU助手/AsyncAnalyze/` 和 `stores/AsyncAnalyzeStore.ts`。
- [MVU 数据与版本契约](./MVU数据与版本契约.md)：MVU 变量写入、版本规则格式与持久化位置。对应 `src/Utils/MvuUtil.ts`、`stores/EraEditStore.ts` 和 `stores/UseVersionControlStore.ts`。

本目录记录当前代码可证实的边界。外部宿主接口的完整定义仍以 `@types` 和实际宿主实现为准。
