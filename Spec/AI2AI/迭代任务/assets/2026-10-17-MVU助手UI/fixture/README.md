# 本轮完整 App 浏览器验收脚手架

2026-10-17 工作台减负与自由删除后，`configuration.cjs`、`dialogs.cjs`、`first-use.cjs` 已按新交互和宽松编辑契约改写并正式验收。当前工作台的可重放命令为先 `build.cjs`，再这三个入口；使用同一生产 App fixture。前轮 `group-layout.cjs`、`behavior.cjs`、`geometry.cjs` 的工作台 selector 和旧布局断言只对应当时历史界面，不代表本轮通过。新的工作台截图/测量与验收结论见 [本轮验收](../../../2026-10-17-工作台减负与自由删除验收.md)。其余未受影响页面的历史证据仍按原记录解释。

此目录保存2026-10-17独立验收可执行证据。它实际编译生产App、router及页面，宿主/worldbook/MVU/model-list使用模拟接口。长期确定性主入口是根目录 `tests/mvu-editing.cjs` 和 `tests/async-tasks/`；本目录不复制业务算法。

从仓库根目录使用已安装的项目依赖运行。需要Edge及独立安装的Playwright；本机脚本默认使用本轮现存npm缓存模块，其他机器可设置 `PLAYWRIGHT_MODULE` 指向已安装的 `playwright` 模块，不修改项目依赖。

```powershell
$fixture = 'Spec/AI2AI/迭代任务/assets/2026-10-17-MVU助手UI/fixture'
node "$fixture/build.cjs"
node "$fixture/geometry.cjs"
node "$fixture/group-layout.cjs"
node "$fixture/behavior.cjs"
node "$fixture/configuration.cjs"
node "$fixture/dialogs.cjs"
node "$fixture/version.cjs"
node "$fixture/runs.cjs"
node "$fixture/first-use.cjs"
node "$fixture/tree-keyboard.cjs"
node "$fixture/contrast.cjs"
```

`build.cjs` 在当前目录生成 `entry.ts`、`bundle.js`、异步路由chunk及 `index.html`；这些临时产物不作为长期证据提交。后续脚本生成测量JSON及截图，精选版本保存在上级目录。

Edge默认路径为 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`；需要其他浏览器时修改各脚本 `executablePath`。此fixture执行file协议，未连接真实酒馆。

`geometry.cjs` 的683×384测量表示1366×768在200%时的等效CSS可用空间，不代表原生浏览器zoom或移动软键盘实测。`contrast.cjs` 抽样实际computed style，并对照WCAG相对亮度公式测量；不代表完整无障碍认证。

`group-layout.cjs` 是用户截图后补充的定向回归证据：五任务组和两个空组，验证紧凑列表、独立展开、导航前两项与组操作；`first-use.cjs` 的组选择按钮名称同步为“选择此组”。脚本不复制业务判断，不新增平行确定性suite。
