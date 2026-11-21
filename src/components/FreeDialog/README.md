# FreeDialog

普通弹窗的基础外壳：Mantine `Modal` + 项目基线。确认、说明、短表单、列表这类
**高度随内容**的弹窗都用它；阅读窗（固定高度、翻篇、全屏、目录）用 `FreeModal`。

全站只有这两扇窗外壳可以直接 import Mantine `Modal`，业务 / 页面代码一律基于它们封装
（`scripts/check-structure.mjs` 会在 lint 里拦）。

## 它锁了什么

- **框体**：`radius="md"`、`padding={0}`、`--app-surface` 底色、`1px` 强描边、遮罩
  `backgroundOpacity 0.4 + blur 2`、140ms fade；高度随内容，**上限 `88dvh`**。
- **header**：紧凑版（上下 10px），`左侧标题 + 右侧操作 + Mantine 关闭按钮`；用
  `.content .header` 双类名压掉 Mantine 的 `min-height` 与内边距。
- **正文**：`.body` 是 `overflow-y: auto` 的可滚区（`flex: 1 1 auto; min-height: 0`），
  左右内边距与 header 对齐；**没有 footer 插槽**——取消 / 确认这类按钮由业务写在正文末尾，
  这样「先读、再选、最后做」的顺序和间距都由它自己排。

## props

| prop | 说明 |
| --- | --- |
| `opened` / `onClose` | 开合；Esc、点遮罩、点关闭按钮都走 `onClose` |
| `title` | header 标题（`ReactNode`，可以是一行说明 + 一行对象名） |
| `children` | 正文 |
| `headerActions` | 关闭按钮之前的操作（如刷新） |
| `closeButton` / `closeLabel` | 是否显示关闭按钮（请求进行中传 `false`）、关闭按钮的 `aria-label` |
| `closeOnEscape` / `closeOnClickOutside` / `trapFocus` | 提交中这类「先别关」的状态由调用方关掉 |
| `size` / `centered` | 宽度档（默认 `min(520px, 92vw)`）、是否垂直居中 |
| `contentClassName` / `bodyClassName` | 只加增量类名，复制框体 / header 样式不算 |

## 与 `FreeModal` 的分工

| | `FreeModal` | `FreeDialog` |
| --- | --- | --- |
| 高度 | 固定 `82dvh`（全屏铺满） | 随内容，上限 `88dvh` |
| header | 翻页计数 + 标题 + 操作组 + 全屏 + 关闭 | 标题 + 操作 + 关闭 |
| 键位 | 空格 / Esc 关窗、`[` `]` 翻篇、`F` 全屏（`hooks/useModalShortcuts`） | 空格 / Esc 由 Mantine 的 `closeOnEscape` + 遮罩负责 |
| 适合 | 文档 / 条目阅读 | 确认、说明、短表单、列表 |

两者外观口径一致（描边、遮罩、淡入、紧凑 header），差别只在内容形态与交互；
选错会得到一扇「小内容却占满屏」的窗，或一扇「长文档被压成 88dvh 还得滚两次」的窗。
