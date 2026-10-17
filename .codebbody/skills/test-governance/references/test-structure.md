# Test Structure

仅在以下情况读取本文件：

- 新建、移动或重命名稳定测试资产；
- 建立或修改测试索引；
- 无法判断测试应归属哪个责任域；
- 怀疑存在平行测试入口或权威路径分裂。

## 1. 语义索引与物理目录

测试体系同时存在两棵树：

```text
测试索引树：业务能力 → 行为 → 测试责任关系
测试目录树：责任域 → 测试层 → 测试资产
```

索引表达多对多语义关系；
目录表达唯一稳定物理归属。

两者应能互相导航，但不要求完全同构。

## 2. 测试索引的最小模型

索引只记录稳定导航信息：

- `test`：测试类、文件或稳定 suite；
- `layer`：验证边界；
- `role`：责任角色；
- `mode`：执行依赖；
- `responsibility`：具体保护什么。

不要人工维护测试方法列表、方法数量或其他可机械生成的信息。

### Layer

仓库可使用自己的术语；必要时映射为：

- `unit`
- `component`
- `contract`
- `integration`
- `environment-acceptance`

### Mode

可按项目需要记录：

- `deterministic`
- `fixture`
- `external`
- `migration`

测试层和执行模式不是同一概念。

### Role

`primary`
：某行为在某一测试层中的主要责任入口，不是该行为唯一测试。

`supporting`
：保护更小的实现边界、特殊分支或诊断能力。

`acceptance`
：从 Spec / 验收标准独立证明行为。

`provisional`
：开发、调查或临时验收产生，收口前必须重新分类。

允许：

```text
一个行为 → 多个测试层
一个测试 → 多个行为
```

不要强迫业务行为和测试类一对一。

## 3. 权威物理路径

每个稳定测试资产只保留一个 canonical location。

推荐优先按稳定业务能力或技术责任域组织，再按测试层细分：

```text
tests/
├─ aggregate-search/
│  ├─ component/
│  ├─ contract/
│  └─ acceptance/
├─ attachment-parser/
│  └─ powerpoint/
│     ├─ component/
│     └─ acceptance/
└─ infrastructure/
```

这是结构原则，不是语言绑定规范。
优先服从仓库已有成熟测试目录约定。

## 4. 新测试归属

新建测试前确认：

1. 哪个责任域拥有该行为或契约？
2. 该责任域的 canonical test path 在哪里？
3. 是否已有测试能够自然承载新场景？
4. 新文件是否会制造第二个平行入口？
5. 新文件是否真的形成新的稳定测试职责？

如果只是为了当前任务方便，不创建新的责任目录或测试类别。

## 5. 跨能力测试

一个测试覆盖多个能力时，不复制文件。

选择最稳定的物理归属，优先考虑：

- 谁拥有该契约；
- 谁定义该行为；
- 测试失败时首先应由哪个责任域处理。

其他能力通过索引引用。

## 6. 索引示例

```md
## aggregate-search / pagination

| Test | Layer | Role | Mode | Responsibility |
|---|---|---|---|---|
| AggregateSearchServiceContractDeterministicTest | contract | primary | deterministic | 聚合搜索分页契约 |
| SearchDocumentAggregateServiceDeterministicTest | component | supporting | deterministic | service 内部聚合行为 |
| AggregateSearchProviderRouterPaginationTest | component | supporting | deterministic | router 分页传递 |
| AggregateSearchStablePaginationFormalAcceptanceTest | environment-acceptance | acceptance | deterministic | 独立稳定分页验收 |
```

多个测试涉及 pagination 不自动构成重复。

## 7. 机械检查与语义判断

脚本适合发现：

- 索引引用目标不存在；
- 文件移动或重命名；
- 新稳定测试完全未索引；
- 路径违反项目约定；
- 类、tag、suite 等机械信息变化。

脚本不得自动决定：

- primary；
- 业务重复；
- acceptance 是否退出；
- 某测试是否仍承担稳定契约。

这些必须依据 Spec 和测试内容判断。
