# PendingTray

待拖拽区：**整块盖住左侧栏**（`#main-navigation` 那一列、顶栏之下）的一条面板，
攒好的一批条目竖着排在里面。状态在 `hooks/use-drag-pending`，这里只负责展示与「从哪拖起」。

## 位置

面板不是「贴着列表的一块浮层」，而是替换掉侧栏那一列的观感：`index.tsx` 用
`getElementById('main-navigation').getBoundingClientRect()` 量出真实矩形（`left/top/width/height`）
内联上去，窗口 `resize` 时重量一次；量不到（窄屏侧栏收起）时退回样式表里的兜底尺寸
（`top: 44px; left: 0; width: 184px; height: calc(100vh - 44px)`，与 `BasicLayout` 的 AppShell 配置一致）。
所以它跟侧栏严丝合缝，也不压到内容区。

## 三个入口

| 操作 | 结果 |
| --- | --- |
| 拖条目列表下面那块**空白**（`.main`，整块是拖拽源，带 `data-pending-drop`） | 整批一起进移动弹窗 |
| 拖**某一条**（chips 里的某一项，自己 `draggable` 且 `stopPropagation`） | 只搬它一个，其余留在这里 |
| 某一条 hover 浮出的叉号 / 顶部「清空」 | 移出这一项 / 全部清空 |

拖起时都走 `writeDragPayload`（隐藏原生影像，交给 `DragGhost` 画），
再调页面给的 `onDragAll` / `onDragEntry` 把移动会话打开。
面板里所有名字的 hover 提示都 `disabled`：正在拖的时候不该冒出 tooltip。

## 藏起来，不卸掉

移动弹窗铺满整屏，`hidden` 时只加 `visibility: hidden; pointer-events: none`、**不卸载**：
正在拖的条目就握在这条里，卸载 DOM 会直接取消整次拖拽（`dragend` 提前到达、落点全失效）。
`data-pending-drop` 同时是「飞入动画」的落点：点选（`⌘` / `Shift` + 点击）把瓦片收进来时，
`PendingFly` 就朝这块面板的左上角飞。

## 收尾

会话结束后由 `FilesDragLayers` 调 `pending.removePaths(movedPaths)`——**只摘掉真正移成功的**，
其余继续面板里等着；关窗或 Esc 取消则什么都不摘。
