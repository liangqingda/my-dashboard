# PendingTray

待拖拽区：整块盖住左侧栏（`#main-navigation` 那一列、顶栏之下）的一条面板，
攒好的一批条目竖着排在里面。状态在 `hooks/use-drag-pending`，这里只负责展示、收件与「从哪拖起」。

## 位置

面板不是贴着列表的一块浮层，而是盖住侧栏那一列：`index.tsx` 用
`getElementById('main-navigation').getBoundingClientRect()` 量出真实矩形（`left/top/width/height`）
内联上去，窗口 `resize` 时重量一次；量不到（窄屏侧栏收起）时退回样式表里的兜底尺寸
（`top: 44px; left: 0; width: 184px; height: calc(100vh - 44px)`，与 `BasicLayout` 的 AppShell 配置一致）。

## 交互

| 操作 | 结果 |
| --- | --- |
| 拖面板除 header 外的**整块区域**（`.main`，`data-pending-drop`） | 整批一起进移动弹窗；不要求落在空白处 |
| 从列表拖条目过来（列表处于批量状态时） | 在面板上松手就收进来；拖拽经过时整块亮成落点 |
| **点某一条** | 直接从待拖拽区移出（不挂 hover 叉号，也不支持单独拖它） |
| 顶部右侧「清空」 | 全部清空 |

条目不单独作为拖拽源：要单独搬某一条，去移动弹窗里的待拖拽区拖它那一行。
面板里名字的 hover 提示一律 `disabled`：拖拽时不该冒 tooltip。

## 藏起来，不卸掉

移动弹窗铺满整屏，`hidden` 时只加 `visibility: hidden; pointer-events: none`、**不卸载**：
正在拖的条目就握在这条里，卸载 DOM 会直接取消整次拖拽（`dragend` 提前到达、落点全失效）。
`data-pending-drop` 同时是飞入动画的落点：`⌘` / `Shift` 点选把瓦片收进来时，`PendingFly` 朝它飞。

## 收尾

移动会话结束后由 `FilesDragLayers` 调 `pending.removePaths(movedPaths)`——**只摘掉真正移成功的**，
其余继续等着；关窗或 Esc 取消则什么都不摘。
