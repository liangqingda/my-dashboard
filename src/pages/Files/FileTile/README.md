# FileTile

网格里的一条**文件**瓦片：图源居上、文件名与体积居中排在下方，可被拖拽移动。

## 职责边界

- 只渲染这一条文件的外观与交互；列表怎么分组、连选 / 多选判定归 `DirectoryGrid`。
- 图源口径：图片摆缩略图、视频摆中间一帧；摆缩略图时体积旁补一枚分类图标；取不到图源回落分类图标。
- 视频 / 图片（调用方传了 `onOpen`）整块可点，交给对应预览弹窗；其它文件只展示。体积旁的播放器小图标单独走 `onOpenExternal`，绕开弹窗直接交外部应用。
- hover 浮出重命名 / 删除（图片另有「设为桌面墙纸」），同时盖一层暗色遮罩压住偏亮的缩略图；按钮与文字浮在遮罩上。

## Props 要点

| 分组 | 字段 | 口径 |
| --- | --- | --- |
| 选中态 | `dragging` / `pending` / `hideActions` / `tipOff` | 正在拖、已在待拖拽区、待拖拽模式不浮按钮、拖拽中不弹名称 tooltip |
| 打开 | `onOpen` / `onOpenExternal` | 整点开预览；小图标走外部播放器 |
| 条目动作 | `onEdit` / `onRequestDelete` / `onSetWallpaper` | 改名、删除、设墙纸（仅图片条目传） |
| 设置 | `veilOpacity` / `videoApp` / `videoOpenMode` / `videoThumbStyle` | 遮罩透明度；外部模式下视频大图摆播放器图标还是帧 |

## 坑

- 名称最多两行，超出**尾部省略**、hover 给全量（走 `FreeTruncatedText` 的 `ellipsis="end"`，不自己写 `text-overflow`）。瓦片宽度会在静止状态下变（设置面板「瓦片宽度」），尾部省略按当下宽度现量，宽度调小后不会涨成三、四行。
- hover 时图源（缩略图 / 播放器图标 / 分类图标）放大 6%，过渡 180ms；拖拽态与待拖拽态不放大。
- 指针停到视频瓦片上先预取文件头（`prefetchVideoHead`），点开首帧不必再等一次往返；预取失败不影响渲染。
- 组件已 `memo` 包裹：传入的回调必须是稳定引用（hook 层 `useCallback`），数组 / 对象派生值要 `useMemo`，否则 memo 会被新引用击穿。
