# FolderTile

网格里的一条**子文件夹**瓦片：图标在上、名称在下，可被拖起，也是拖拽的放置目标。

## 职责边界

- 渲染文件夹外观与拖拽落点状态；打开哪一层、移动判定归 `DirectoryGrid` / 拖拽 hook。
- 与 `FileTile` 共用遮罩、选中框、待拖拽态口径，但落点相关状态只文件夹有：`dropActive` / `progress` / `dropBlocked`。

## Props 要点

| 分组 | 字段 | 口径 |
| --- | --- | --- |
| 打开 | `loading` / `onOpen` | 正在打开时按钮不可点、计数位置显示进度 |
| 拖拽 | `onDragStartEntry` / `onDragEnd` / `onDragOver` / `onDragLeave` / `onDrop` | 起拖、结束、经过、离开、松手放入 |
| 落点态 | `dropActive` / `progress` / `dropBlocked` | 悬停目标；直接拖模式下接着画 `done/total` 进度；禁用落点（自己在待拖拽区）画虚线圈并压暗指针 |
| 选中态 | `dragging` / `pending` / `hideActions` / `tipOff` / `veilOpacity` / `iconSize` | 与文件瓦片同口径；`iconSize` 在应用目录里与应用图标同尺寸，不传按瓦片宽度自适应 |
| 条目动作 | `onEdit` / `onRequestDelete` | 改名、删除（先弹二次确认） |

## 坑

- 名称最多两行，超出**尾部省略**、hover 给全量（走 `FreeTruncatedText` 的 `ellipsis="end"`）：瓦片宽度会在静止状态下变，尾部省略按当下宽度现量，调小后不会涨成三、四行。
- hover 时文件夹图标在 16:10 图源盒内放大 6%，过渡 180ms，超出盒子的部分被裁掉；落点 / 搬家 / 拖拽态不额外放大（落点态整块已有 1.045 的浮起）。
- `progress` 由直接拖模式复用瓦片当进度条，不再弹盖住全屏的进度窗；弹窗模式下不传。
- 组件已 `memo`：回调需稳定引用，派生数组 / 对象需 `useMemo`，否则 memo 被新引用击穿。
