# DragGhost

跟着指针走的拖拽影像：一叠图标 + 左上角红色数量。文件页在 `dragstart` 里把浏览器自带的影像
换成透明像素（`utils/drag-image.ts`），拖拽期间屏幕上只由这一层画。

- 位置只认 `window` 的 `dragover` 坐标；拿到第一帧坐标前不画（`data-placed` 为 false 时透明），
  否则会先在左上角闪一下；`pointer-events: none` 保证它不挡住下面瓦片的 `dragover`。
- 最多叠三层（后排每层往左上错开 5px、缩 12%），数量 > 1 时左上角红点报总数；
  红点抬到 `z-index: 10`，盖在各层图标之上（那些图层各自有 z-index，不抬起来会被压掉半截）。
- 挂载时做一次 0.6 → 1.06 → 1 的缩放入场（`prefers-reduced-motion` 下直接给结果），
  看得出「瓦片里那枚图标变成了拖拽物」。
- 图标按条目类型取（`utils/entry-icon.ts`），与弹窗内待拖拽区、侧栏待拖拽区同一套。

props 见 `types.ts`：`entries` 就是这次要拖的条目，单项时只是一个图标、不挂数量。
