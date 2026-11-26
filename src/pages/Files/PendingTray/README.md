# PendingTray

待拖拽区：整块盖住左侧栏（`#main-navigation` 那一列、顶栏之下）的一条面板，
攒好的一批条目竖着排在里面，底部固定一条三个按钮的底部条。
状态在 `hooks/use-drag-pending`，这里只负责展示、收件与那颗「拖拽全部」。

## 位置

面板不是贴着列表的一块浮层，而是盖住侧栏那一列：`index.tsx` 用
`getElementById('main-navigation').getBoundingClientRect()` 量出真实矩形（`left/top/width/height`）
内联上去，窗口 `resize` 时重量一次；量不到（窄屏侧栏收起）时退回样式表里的兜底尺寸
（`top: 44px; left: 0; width: 184px; height: calc(100vh - 44px)`，与 `BasicLayout` 的 AppShell 配置一致）。

## 交互

| 操作 | 结果 |
| --- | --- |
| 底部的**「拖拽全部」**（大按钮，本身是拖拽源） | 整批一起进移动弹窗；面板本身**不再是**拖拽热区，想整批搬只能按它。设置里选了「直接拖到文件夹」且当前这一层没有文件夹时，`dragAllDisabled` 把它画成禁用态、也不再作为拖拽源（拖出去没有落点） |
| 从列表拖条目过来（列表处于批量状态时） | **整条面板都是热区（含 header）**：收件的 `dragenter/over/drop` 挂在面板根上，松手就收进来；
拖拽经过时整块面板（含四周留白）亮成落点。header 上的文字 `user-select: none`，拖拽不会拖出选择区 |
| **点某一条**（`.chip`，带 `data-pending-chip`） | 移出待拖拽区，并从这一格做一记「缩小成小图标 → 飞回去 → 长回瓦片大小 → 落定」的动画；
不动画期间那一格不撤，先收成**虚位**（`placeholderPath`，虚线框 + 透明内容），飞行落定后才整格消失。
不挂 hover 叉号，也不支持单独拖它 |
| 在列表里再点一次已经选中的条目 | 同上：从待拖拽区那一格起飞，飞回被点的那张瓦片（取消选择） |
| 底部的**「选择全部」** | 当前列表里（已筛过的）所有条目一次收进来，已在里面的跳过 |
| 底部的**「取消」** | 全部清空（不做逐个飞回的动画），面板滑出淡掉 |

面板和里面的条目都不单独作为拖拽源：要单独搬某一条，去移动弹窗里的待拖拽区拖它那一行。
header 上只有一句「N 项待移动」，不再挂清空叉号——清空在底部条上。
收件判定只看载荷类型（`utils/drag-image.ts` 的 `hasDragPaths`）：`dragover` 阶段浏览器不让读
`getData` 的具体内容，等真去读就永远 `preventDefault` 不了、也就收不到 `drop`。
面板里名字的 hover 提示一律 `disabled`：拖拽时不该冒 tooltip。

## 三块的分层

顶部 header（计数）与底部 footer（三颗按钮）用面板底色 `--app-surface`，中间的条目区
（`.main`）换成浅一档的 `--app-surface-subtle` 并描一圈 `--app-line`：一眼能分出「上面说的是什么、
中间攒着什么、下面能做什么」。条目本身回到面板底色（`--app-surface`），在浅底上能立起来。

## 常挂 DOM，靠类收起

这条面板**始终挂载**，没有条目时加 `.closed`：`opacity / transform / visibility` 一起过渡，
所以清空或 `Esc` 取消时是「往侧栏方向滑出 + 淡出」的退场，而不是瞬间消失；
`prefers-reduced-motion` 下只淡出、不位移。`closed` 时 `pointer-events: none`、`aria-hidden`。

## 藏起来，不卸掉

移动弹窗铺满整屏，`hidden` 时只加 `visibility: hidden; pointer-events: none`、**不卸载**：
正在拖的条目就握在这条里，卸载 DOM 会直接取消整次拖拽（`dragend` 提前到达、落点全失效）。
`data-pending-chip` 同时是飞入动画的落点：`Shift` 连选 / 普通点选把瓦片收进来时，
`PendingFly` 直接飞到**这一条真正落座的格子**，不是飞到面板上某个大概位置。

## 收尾

移动会话结束后由 `FilesDragLayers` 调 `pending.removePaths(movedPaths)`——**只摘掉真正移成功的**，
其余继续等着；关窗或 Esc 取消则什么都不摘。
