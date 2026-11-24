# useDragPending

待拖拽区的状态：攒了哪些条目（`entries`，顺序即加入顺序），以及加入 / 移除 / 清空这类动作。
展示在 `PendingTray`，接线在 `FilesDragLayers`。

## 一条规矩

**列表的点击语义跟着它变**：待拖拽区非空（`active`）以后，点条目就是「加入 / 移除」，
不再打开文件夹或弹预览；非空之前，`⌘` / `Shift` + 点击可以起选，之后普通点击也算加入。

> 说明：网页里收不到触控板的三指手势（被系统占用），所以这里用修饰键 + 点击代替。
> 真的三指触摸要另接 `touchstart` 的多指判断，不在当前实现范围内。

`has(path)` 给瓦片判「是否已选中」，`remove` 给 chip 上的叉号，`clear` 给顶部那颗「清空」。

## 动作

| 动作 | 用途 |
| --- | --- |
| `toggle(entry, from?)` | 那一下点击的落点：已选中就移除；否则加入，并顺手把 `fly` 设成 `{ entry, from }`，让 `PendingFly` 从瓦片原位飞过去。`from` 只有点选路径（`DirectoryGrid` 量瓦片矩形）才给，拖拽起手不带 |
| `removePaths(paths)` | 一次移动会话成功后，把这几条从面板里摘掉（`FilesDragLayers` 按 `movedPaths` 调） |
| `clearFly()` | 飞入动画播完，动画层自己收掉 `fly` |

`removePaths` 而不是 `clear`：批量里可能只搬了一条（弹窗里拖单条），其余还得留在面板里。
