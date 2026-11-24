# PendingTray

待拖拽区：悬浮在列表顶部（连 header 一起盖住）的一条横条，攒好的一批条目摆在这里。
状态在 `hooks/use-drag-pending`，这里只负责展示与「从哪拖起」。

## 三个入口

| 操作 | 结果 |
| --- | --- |
| 拖左侧「N 项待移动」那块（图标堆 + 文案，整块是拖拽源） | 整批一起进移动弹窗 |
| 拖某个小图标（chips 里的某一项） | 只搬它一个 |
| 小图标 hover 浮出的叉号 / 右侧清空按钮 | 移出这一项 / 全部清空 |

拖起时都走 `writeDragPayload`（隐藏原生影像，交给 `DragGhost` 画），
再调页面给的 `onDragAll` / `onDragEntry` 把移动会话打开。

## 藏起来，不卸掉

移动弹窗铺满整屏，`hidden` 时只加 `visibility: hidden; pointer-events: none`、**不卸载**：
正在拖的条目就握在这条里，卸载 DOM 会直接取消整次拖拽（`dragend` 提前到达、落点全失效）。
会话关掉后由 `FilesDragLayers` 把待拖拽区清空。
