# FilesDragLayers

拖拽的三层浮层接线：覆盖侧栏的待拖拽区 `PendingTray`、跟随指针的拖拽影像 `DragGhost`、
点选加入时的飞入动画 `PendingFly`，外加它们与移动会话的收尾联动。
都是 `position: fixed`，与列表布局无关，所以单独一层挂在页面最外层。

- `pending.active` 才画待拖拽区；移动会话开着时把它藏起来（只藏不卸，拖拽源不能没了）。
- `dragActive` 才画拖拽影像，条目取 `session.entries`（会话还没开时退回待拖拽区里的那批）。
- `pending.fly` 非空时画飞入动画，`onDone` 走 `pending.clearFly`。
- 会话结束只摘掉**真正移成功**的那几条：读 `useDragMove` 的 `movedPaths` 调 `pending.removePaths`。
  关窗、Esc 取消时 `movedPaths` 是空的，攒着的条目原样留着。
  用 `wasOpen` 记住「开过」再收，避免刚往待拖拽区里加条目就被当成一次会话收掉。

调用里用 `entryActions.dragStartEntries(entries)` 起拖——单条与整批走同一个入口，
拖拽源高亮只认第一条（多个条目时弹窗已经盖住列表）。
