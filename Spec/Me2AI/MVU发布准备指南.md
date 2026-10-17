# MVU 发布准备指南

## 开发、候选包与正式发布

日常提交和推送只保存开发进度。维护者手动运行“准备 MVU 发布候选”工作流，才会验证并打包所选分支的助手。

候选包是供维护者核对和测试的文件，不代表玩家已收到更新。本阶段没有在线加载器、客户端更新按钮、正式 Release 发布和 latest 公告。当前关于页的“自更新方案待定”仍然成立。

## 版本资料

修改 `src/MVU助手/release.json`：

- `version`：例如 `2.0.0`，不加 `v`，使用三个数字段。
- `date`：例如 `2026-10-17`，填写实际发布版本对应的日期。
- `changes`：本次版本更新说明，每项是一条面向用户的完整说明。

关于页当前版本、首条更新记录和候选包说明共用该文件。更换当前版本资料时，应将上一版的历史条目加入关于页历史列表，避免覆盖既往说明。不要手动修改生成的候选元数据。

## 本地准备

使用 Node.js 24 和 pnpm 11，安装锁定依赖后，在仓库根目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm release:prepare
```

命令会先验证版本资料，再执行生产构建并打包。输出目录为 `dist/mvu-release/`，不提交到开发分支。

包内包含脚本 `index.js`、对应的 sourcemap（构建引用时）、版本与来源元数据 `release.json`、说明 `release-notes.md` 及 `SHA256SUMS`。元数据记录源码提交和构建前是否有未提交修改；本地开发包可能带 dirty 标记，不能只凭该提交号重现其中未提交的修改。

完整脚本依然依赖酒馆宿主及既有远程运行库，不是可独立离线运行的程序。

## GitHub 手动准备

工作流文件为 `.github/workflows/prepare-mvu-release.yaml`，已通过[最小接入 PR #1](https://github.com/Malkuku/EraHelper-all-in-one-solution-for-ERA-scripts/pull/1) 接入默认分支 `master-erahelper`。默认分支仅增加工作流并取消旧自动标签，不包含2.0业务源码。

接入后，在 GitHub 仓库 Actions 中选择 `Prepare MVU release candidate`，保留工作流所在的默认分支，在 `source_ref` 填写要打包的源码分支、标签或完整提交号（默认 `feature-erahelper-mvu`），再点击 Run workflow。源码必须包含发布工具、版本资料和测试；默认分支仅提供运行入口，不会因此变成2.0源码。

流程会运行测试、生产构建和打包，完成后可在本次运行的 Artifacts 下载版本对应的候选包。包名中的 SHA 来自实际检出的源码，与候选 release.json 的 sourceSha 一致。Artifact 是本次 Actions 的下载文件，不是永久版本链接或 CDN 来源。

[首次成功运行与候选下载](https://github.com/Malkuku/EraHelper-all-in-one-solution-for-ERA-scripts/actions/runs/39038446997) 已完成云端验证；本次源码为 `f95b14b3bbb92e0513457ba2f04e9e322eefd849`，包内无未提交修改，文件摘要已核对。

## 核对和现场测试

先阅读 `release-notes.md`，核对版本号、日期、源码提交和 dirty 标记。用 `SHA256SUMS` 核对文件，摘要一致说明下载文件与打包记录一致，不代表已经通过真实宿主验收。

已有安装应先保存配置和变量草稿、结束任务，并导出配置备份。测试时将 `index.js` 的文本更新到原酒馆助手脚本中，尽量保留原脚本 ID；直接删除旧脚本再导入另一脚本可能使配置和本地密钥的关联失效。新安装可新建酒馆助手脚本并粘贴代码。候选包当前不是酒馆助手脚本 JSON，不能直接把它当作脚本 JSON 导入。

重载会结束当前脚本会话，不能恢复未保存草稿、旧运行日志或回滚 Journal。退回旧脚本不等于撤销已发生的配置迁移和角色数据写入。

确认真实酒馆启动、任务运行及 MVU 持久化后，再处理正式发布。现有扫描代码与仓库许可组合仍按架构文档的对外分发门禁确认。本轮不会自动发布候选包。
