# PendingFly

「条目挪进待拖拽区」的那一下动画：点选（`⌘` / `Shift` + 点击，或待拖拽区非空后的普通点击）
把一个瓦片收进去时，从瓦片原位飞一块小图标到侧栏面板上，让人看清「它被挪到哪儿了」。

## 怎么做

- 起点：点选那一刻瓦片的屏幕矩形，由 `DirectoryGrid` 量好、经 `useDragPending` 的 `toggle(entry, from)`
  存进 `fly: { entry, from }`；
- 终点：`document.querySelector('[data-pending-drop]')`（`PendingTray` 里那块空白）实测矩形，
  再往里内缩 `DROP_INSET`；
- 用 Web Animations API 一次 `translate + scale(0.36) + 淡出`，`FLY_MS = 420`、
  `cubic-bezier(0.32, 0.72, 0.24, 1)`、`fill: 'forwards'`；`onfinish` 回调页面 `clearFly` 收掉这一层。

## 兜底

- 系统开了「减少动态」（`prefers-reduced-motion`）→ 不做位移，直接 `onDone`；
- DOM 上没有起点或终点（侧栏收起、面板刚卸）→ 同样直接 `onDone`，不留在屏幕上；
- 回调放 `doneRef`（在 effect 里同步），effect 只依赖 `fly`：父级每次渲染的新函数不会让动画重启动。
