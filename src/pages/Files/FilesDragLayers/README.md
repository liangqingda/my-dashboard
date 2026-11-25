# FilesDragLayers

拖拽的三层浮层接线：覆盖侧栏的待拖拽区 `PendingTray`、跟随指针的拖拽影像 `DragGhost`、
点选加入时的飞入动画 `PendingFly`，外加它们与移动会话的收尾联动。
都是 `position: fixed`，与列表布局无关，所以单独一层挂在页面最外层。

- `pending.active` 才画待拖拽区；移动会话开着时把它藏起来（只藏不卸，拖拽源不能没了）。
- 拖拽影像有两个来源：`dragActive` 时取移动会话的 `session.entries`；
  `pending.trayDrag` 非空时取那一批（批量状态下从列表往待拖拽区拖的一程，**不开弹窗**）。
  两者都没有就不画。
- `pending.fly` 非空时画飞入动画，`onDone` 走 `pending.clearFly`。
- 会话结束只摘掉**真正移成功**的那几条：读 `useDragMove` 的 `movedPaths` 调 `pending.removePaths`（幂等）。
  关窗、Esc 取消时 `movedPaths` 是空的，攒着的条目原样留着。
  用 `wasOpen` 记住「开过」再收，避免刚往待拖拽区里加条目就被当成一次会话收掉。

- 从列表往待拖拽区拖的一程（`pending.trayDrag`）由页面在 `onDragStartEntry` 里开（批量状态才走，
  见 `hooks/usePendingDrag`），松手落在面板上由页面的 `onDropPaths` 按路径收进 `pending.addMany`。

调用里用 `entryActions.dragStartEntries(entries)` 起拖——单条与整批走同一个入口，
拖拽源高亮只认第一条（多个条目时弹窗已经盖住列表）。
