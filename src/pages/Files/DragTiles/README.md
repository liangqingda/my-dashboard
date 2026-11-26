# DragTiles

直接拖模式（设置里「拖拽移动 → 直接拖到文件夹」）的拖拽影像：跟着指针走的是**整条瓦片**。

- 瓦片本体在**起拖那一刻**由 `utils/drag-tile-image` 的 `captureTileImage(path)` 拷成
  `{ html, width, height }`（`cloneNode(true)` + 量矩形，顺手摘掉 `dragging` / `pending` 这类状态类名），
  组件本身只接这份快照、不读 DOM——这样拷到的是**弱化之前**的样子，也避开在 effect 里读 DOM 再 setState；
- 画出来的视频帧、文件名、体积、文件夹图标与版式都和列表里一致，只是被「拎起来」了：
  略缩到 94%、加投影、半透明；
- 位置取共用的 `hooks/useDragPoint`（`dragover` 坐标），瓦片中心压着指针；
- 多条一起拖时画第一条、右上角标数量（`--app-status-danger-fill` 红底白字，`many > 1` 才出现）；
- `pointer-events: none`：它压在指针下面，不能吃掉下方瓦片 / 文件夹格子的 `dragover` / `drop`；
- 与 `DragGhost`（弹窗模式的一叠小图标）分工明确：那条走「手里握着一批」的意象，这条走「拎着这一条」。

快照为空（起拖时没找到那条 DOM，比如已经换目录）就不画，拖拽本身照旧。
