# useDragPending

待拖拽区的状态：攒了哪些条目（`entries`，顺序即加入顺序）、有没有正在往这儿拖的一批
（`trayDrag`）、条目在列表与面板之间那一记动画（`flight`），以及加入 / 移除 / 清空这类动作。展示在 `PendingTray`，接线在 `FilesDragLayers`。

## 两条规矩

1. **列表的点击语义跟着它变**：`active` 以后点条目就是「加入 / 移除」，不再打开文件夹或弹预览；
   非空之前，`⌘` / `Shift` + 点击可以起选，之后普通点击也算加入。
2. **批量状态下列表的拖拽先不开弹窗**：拖起来只是把这一批往侧栏拖（`trayDrag`），
   松手落在待拖拽区才收进来；要搬的时候从待拖拽区整块拖起，那一程才开移动弹窗。
   列表这侧的开合判定在 `hooks/usePendingDrag`。

> 说明：网页里收不到触控板的三指手势（被系统占用），所以这里用修饰键 + 点击 / 拖拽代替。

## 动作

| 动作 | 用途 |
| --- | --- |
| `toggle(entry, from?)` | 点一下的落点：已选中就移除；否则加入，并把 `flight` 设成 `{ direction: 'in', entry, from }`，让 `PendingFly` 从瓦片原位飞到它落座的那一格。`from` 只有点选路径才给。同时把连选锚点落在这条上 |
| `selectRange(ordered, path)` | `Shift` + 点击的连选：把锚点到这一条之间（含两端）整段收进来，已在里面的跳过；锚点跟着这一条走。还没有锚点（第一下就是 `Shift` + 点）时只收它自己。`ordered` 由列表层按当前显示顺序拼（`[...folders, ...files]`），网格与表格共用同一份 |
| `add(entry)` / `addMany(entries)` | 直接加入（`addMany` 已在里面的跳过）：从列表拖进待拖拽区走 `addMany`；图片 / 视频预览的「加入 / 移出」走 `usePendingDrag` 的 `handleTogglePendingPreview`（认条目 + 加或移 + 弹提示） |
| `has(path)` / `remove(entry, from?)` / `clear()` | 判选中 / 点条目移出（给了那一格的矩形就播「飞回列表」，那一条先留在 `entries` 里、那一格收成虚位，落定后才摘）/ 整体清空（Esc 也走 `clear`，不逐条飞） |
| `removePaths(paths)` | 移动会话成功后把移成功的几条摘掉；只搬了一条时其余留下 |
| `beginTrayDrag(entries)` / `endTrayDrag()` | 「正从列表往待拖拽区拖」那一程的开合，`FilesDragLayers` 据此画拖拽影像与落点高亮 |
| `clearFlight()` | 动画播完，动画层自己收掉 `flight`；正在飞出去的那条（`leaving`）到这一刻才从 `entries` 里摘掉 |
| `leaving` | 正飞回列表的那一条仍在 `entries` 里占位（那一格是虚位），飞行落定才撤 |
