---
description: 同步改动到 project_dec 文档并提交至 GitHub
---

1. **回顾改动**：总结本次对话中对代码所做的所有逻辑修改和功能新增。
2. **更新蓝图**：使用 `replace_file_content` 或 `multi_replace_file_content` 更新 `/Users/James/Documents/RO/ro-ke/project_dec/blueprint.md`。
    - 将已完成的任务移至“已完成”列表。
    - 更新“项目状态”以反映最新进展。
3. **更新架构**：如果涉及系统架构、目录结构或关键技术栈的变动，请同步更新 `/Users/James/Documents/RO/ro-ke/project_dec/architecture.md`。
// turbo
4. **提交代码**：
    - `git add .`
    - `git commit -m "docs: sync project_dec and update source code"`
    - `git push`
5. **确认结果**：告知用户文档已同步且代码已成功推送到远程仓库。
