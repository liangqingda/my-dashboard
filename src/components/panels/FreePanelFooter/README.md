# 弹层面板底部收尾（`FreePanelFooter`）

左侧一句「这块筛选只影响什么」，右侧「重置」。两处在用：预览弹窗的正文筛选面板与英语列表的
笔记筛选面板。**只管排布、按钮形态与置灰口径**，文案与动作由调用方给。

| 项 | 约定 |
| --- | --- |
| 结构 | `Group gap={8} justify="space-between" wrap="nowrap"`：左侧 `Text c="dimmed" size="xs"` + 右侧 `Button variant="subtle" size="compact-xs"` |
| props | `hint`（左侧边界说明）、`disabled`（无条件可清时置灰，口径由调用方判）、`onReset` |
| 不负责 | 有没有条件生效、重置清什么、重置后要不要落存储 |

## 为什么它是公共件

两个面板原来各写一遍：一处手写 `UnstyledButton` + 自定义 scss（`color: var(--app-accent)`、
0.78rem），一处用组件库 `Button`——同一个动作在两页长得不一样。现在统一走组件库，
外观改动只改这里；按钮文字的 `type="button"` 也一并固定，避免在弹层里被当成表单提交。
