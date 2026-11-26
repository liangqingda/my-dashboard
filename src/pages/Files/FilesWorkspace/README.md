# FilesWorkspace

内容区那一行：待拖拽区（`FilesDragLayers`）与列表（`children`）并排。

## 为什么要在列表外面包一层

待拖拽区平时是 `position: fixed`，整块盖住左侧栏那一列，**不占这一行的位置**；页面全屏时侧栏被
页面根盖住、那一列不在眼前，它改成就地占一列（`PendingTray` 的 `inline`，`position: static` +
`align-self: stretch`）——要「挤开列表」就必须和列表是同一个 flex 行里的兄弟，所以列表不能再直接
挂在页面正文里，得由这一行包住。

## DOM 顺序是硬要求

拖拽层必须排在 `children` **之前**。`FilesDragLayers` 自己是 `display: contents`，它的子项直接成为
这一行的 flex item；待拖拽区只有在最前面，才是左边那一列、把列表挤到右边。调到后面就成了「列表在左、
拖拽区在右」。

## 全屏状态在这里读

`usePageFullscreen()` 的 Provider 包在 `MenuContentLayout` 的 `children` 外边，本组件正是作为
`children` 挂进去的那一层，所以读得到真值；**别把这次读取挪回页面组件本体**——页面是 Provider 的
父级，在那儿读恒为 `false`，全屏后会静默停在非全屏形态（待拖拽区仍浮在列表上）。

## 只做排布与接线

拖拽状态（`useFilesDrag`）、待拖拽区状态（`useDragPending`）、条目动作（`useEntryActions`）与
「选择全部」都由页面持有，这里只往下递。样式在 `index.scss`（`.workspace` 这一行），页面自己的
`.shell`（列表那一列撑满剩余宽度）仍留在页面目录下。
