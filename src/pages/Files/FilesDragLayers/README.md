# FilesDragLayers

拖拽的两层浮层接线：顶部悬浮的待拖拽区 `PendingTray` + 跟随指针的拖拽影像 `DragGhost`，
外加两者与移动会话的收尾联动。都是 `position: fixed`，与列表布局无关，所以单独一层挂在页面最外层。

- `pending.active` 才画待拖拽区；移动会话开着时把它藏起来（只藏不卸，拖拽源不能没了）。
- `dragActive` 才画拖拽影像，条目取 `session.entries`（会话还没开时退回待拖拽区里的那批）。
- 移动会话结束（成功移入或关窗）清空待拖拽区：那一批条目已经各有去处。
  用 `wasOpen` 记住「开过」再清，避免刚往待拖拽区里加条目就被清掉。

调用里用 `entryActions.dragStartEntries(entries)` 起拖——单条与整批走同一个入口，
拖拽源高亮只认第一条（多个条目时弹窗已经盖住列表）。
