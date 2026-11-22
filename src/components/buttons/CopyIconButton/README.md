# 复制图标按钮（`CopyIconButton`）

点一下把文本写进剪贴板，成功后图标换成对勾、tooltip 文案切成「已复制」，1.5 秒后复原。
外观与「只在被指到时才挂 tip」的口径来自 `FreeIconAction`，本组件只管复制这个动作。

| 项 | 约定 |
| --- | --- |
| 冒泡 | 点击先 `stopPropagation()`：嵌在「整行可点击」的表格里时，复制不会顺带打开那一行 |
| 反馈 | 成功：图标 → `IconCheck`，tooltip → `copiedLabel`（默认「已复制」），`COPY_FEEDBACK_DURATION` 后复原；`aria-label` 不变 |
| 失败 | 只弹一条 `notifications.show`（红色、「复制失败，请手动复制」），不静默失败 |
| 定时器 | 复原定时器在卸载时清掉，避免对已卸载组件 `setState` |
| props | `text`（要复制的文本）、`label`（含义，`aria-label` 与默认 tooltip）、`copiedLabel`、`size`（`xs` / `sm` / `lg`）、`iconSize`、`className`（只补布局） |

## 什么时候用它

任何「把一段文本放到剪贴板」的图标位：表格操作列、弹窗 header、详情页字段行。
**复制逻辑本身**（失败兜底、提示文案）在 `@/utils/clipboard` 的 `copyText` 里，别在这里另写一套
`navigator.clipboard`。
