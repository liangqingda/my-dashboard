# FilesDragLayers

拖拽的三层浮层接线：待拖拽区 `PendingTray`、跟随指针的拖拽影像 `DragGhost`、
点选加入 / 点条目移出时的飞行动画 `PendingFly`，外加它们与移动会话的收尾联动。

这一层挂在页面**内容区那一行里、排在列表之前**：待拖拽区平时是 `position: fixed`（盖在侧栏上、
不占位置），页面全屏时它改成就地占一列（`inline`），得先在内容区出现；影像与飞行动画仍是 `fixed`，
排在哪儿都不影响排布。

- `pending.active` 才画待拖拽区；移动会话开着时把它藏起来（只藏不卸，拖拽源不能没了）。
- `inline` 由页面读 `usePageFullscreen()` 递进来：全屏时待拖拽区不浮在列表上，而是占内容区左侧一列、
  撑满高度，把列表挤到右边（细节见 `PendingTray` 的 README）。
- 拖拽影像是两组、按模式分工：
  - 直接拖模式：`dragEntries`（自己那批）非空、且页面递进来的 `dragImage`（起拖那刻拷下的整条瓦片快照）
    不为空时画 `DragTiles`——拎的是**整条瓦片**，`dragImage` 为空就什么都不画（不退回小图标）；
  - 弹窗模式：`dragActive` 时画 `DragGhost`（一叠小图标 + 数量），`pending.trayDrag`
    （批量状态下从列表往待拖拽区拖的一程，**不开弹窗**）也走这一条。
  两者互斥，同一时刻只有一条在屏幕上。
- `pending.flight` 非空时画飞行动画（进 / 出两个方向飞向真正的落脚格），`onDone` 走 `pending.clearFlight`；
  `DragGhost` 的数量红点只在移动会话里出现，往待拖拽区拖的那一程不标。
- 会话结束只摘掉**真正移成功**的那几条：读 `useDragMove` 的 `movedPaths` 调 `pending.removePaths`（幂等）。
  关窗、Esc 取消时 `movedPaths` 是空的，攒着的条目原样留着。
  用 `wasOpen` 记住「开过」再收，避免刚往待拖拽区里加条目就被当成一次会话收掉。

- 从列表往待拖拽区拖的一程（`pending.trayDrag`）由页面在 `onDragStartEntry` 里开（批量状态才走，
  见 `hooks/usePendingDrag`），松手落在面板上由页面的 `onDropPaths` 按路径收进 `pending.addMany`。

调用里用 `entryActions.dragStartEntries(entries)` 起拖——单条与整批走同一个入口；
页面用 `dragPaths`（直接拖模式下是整批）给列表的条目打「正在被拖走」的弱化态。
