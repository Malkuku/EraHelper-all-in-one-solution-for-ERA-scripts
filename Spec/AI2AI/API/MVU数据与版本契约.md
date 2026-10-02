# MVU 数据与版本契约

## 变量读写

`EraEditStore.getStatData()` 从最后一条消息的变量读取 `stat_data`。`saveEraEdit()` 调用 `MvuUtil.updateMvuDataByObj()`；后者获取当前消息的 MVU 数据，将其 `stat_data` 设为传入对象，再调用 `Mvu.replaceMvuData` 写入最后一条消息并发出 `mag_variable_update_ended`。消息文本更新由 `Mvu.parseMessage` 解析后写入。这里记录代码调用链；变量保护规则由宿主 MVU 实现决定。

## 版本规则

版本设置保存在当前脚本变量的 `era_data_rule.version_control`，目前字段为 `enable` 和 `lore_name`。当前版本读取自 `stat_data.system.当前版本`，缺失时按 0 处理。

指定世界书条目中的更新块采用 `<del|v="版本号">JSON</del>` 或 `<edit|v="版本号">JSON</edit>`。实现按数值版本升序解析，只应用高于当前版本的块。`del` 递归删除字段，`edit` 递归合并对象并覆盖标量或数组；两者都支持 `$all` 应用到子对象。预览后写入完整目标 `stat_data`，并设置 `system.当前版本` 为目标版本。

更新块格式与 `$all` 语义来自 `UseVersionControlStore.ts` 当前实现，尚无独立的格式验证器或集成测试。变更版本格式时，应同时检查既有世界书数据与 UI 预览流程。
