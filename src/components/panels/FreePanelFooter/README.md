# 弹层面板底部收尾（`FreePanelFooter`）

左侧一句「这块筛选只影响什么」，右侧「重置」。**只管排布、按钮形态与置灰口径**，文案与动作由调用方给。

| 项 | 约定 |
| --- | --- |
| 结构 | `Group gap={8} justify="space-between" wrap="nowrap"`：左侧 `Text c="dimmed" size="xs"`（`flex: 1 1 auto` + `min-width: 0`，可换行可压缩）+ 右侧 `Button variant="subtle" size="compact-xs"`（`flex: 0 0 auto`，不被说明文字挤掉） |
| props | `hint`（左侧边界说明）、`disabled`（无条件可清时置灰，口径由调用方判）、`onReset` |
| 不负责 | 有没有条件生效、重置清什么、重置后要不要落存储 |

## 它锁住什么

同一动作（底栏「说明 + 重置」）全站只有一种形态：走组件库 `Button`，不手写 `UnstyledButton` +
自定义 scss；外观改动只改这里，按钮文字的 `type="button"` 也一并固定，避免在弹层里被当成表单提交。
