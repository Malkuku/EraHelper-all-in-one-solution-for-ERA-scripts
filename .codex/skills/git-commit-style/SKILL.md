---
name: git-commit-style
description: 规范化生成中文 git commit 信息。Use when 任何 git 提交场景
---

# Git Commit Style

使用 Conventional Commits，提交说明使用中文：

```text
type(scope): 中文提交说明
````

* `scope` 使用简短稳定的小写英文、数字或连字符，优先模块、目录、功能或文档域；无法确定时可省略。
* `type` 按实际变更选择，如 `feat`、`fix`、`refactor`、`docs`、`test`、`chore`。

## 提交拆分

生产代码、SPEC 文档、测试代码必须分别提交,并使用相同的commit message：

* 生产代码：按实际性质使用 `feat` / `fix` / `refactor` 等。
* SPEC：使用 `docs`，scope 优先 `me2ai`、`ai2ai` 或对应文档域。
* 测试：使用 `test`，scope 优先被验证模块。

同一类别中需要独立审阅或发布的变更也应继续拆分。

提交前检查暂存区，确保单个 commit 不混合上述类别，以支持选择性 cherry-pick。

## 生成规则

根据实际 `git diff`、`git status` 或变更摘要判断主要变化并生成提交信息，不得添加未发生的改动。

涉及 API、协议、持久化、文档同步或项目要求的验证时，确认对应变更和验证是否已处理。
