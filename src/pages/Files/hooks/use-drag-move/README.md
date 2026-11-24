# useDragMove

文件页的「拖拽移动会话」：从拖起一条目开始，到松手落下（或放回手里）为止的全部状态与动作。
弹窗 `DragMoveModal` 只负责呈现，页面通过 `useEntryActions` 把它接到拖动源的开始 / 结束事件上。

## 调用

```ts
const dragMove = useDragMove({
  currentDir,      // 页面当前目录；null 时 open 不生效
  currentFolders,  // 页面已有的子文件夹列表：最外层不再多发一次请求
  moveEntry,       // (source, targetDir) => Promise<boolean>，成功才播音效
});
```

入口三个：`open(path, name, kind)`（dragstart，`kind` 决定手持卡片画文件夹还是文件）、
`endDrag()`（dragend，条目回到手里）、`reset()`（切目录这类页面级清场，连缓存一起丢）。
弹窗里再拖一次走 `beginDrag()`（会话还在，只把拖拽状态重新点亮）。

## 三层状态

- `session`：被拖的是谁（`path` / `name` / `kind` / `origin` 来源目录），弹窗开着就有它；
- `view`：`{ path, folders }`，弹窗现在停在哪一层，`folders === null` 表示这一层还等着读盘；
- `dragActive` / `handed`：条目「正在被拖」还是「已经放回手里」，两者互斥地决定提示语与点击是否生效。

只有成功移动会 `close()`；其余松手一律 `endDrag()` → `handed`，弹窗不关。
渲染用的 `loading` / `isRoot` 都是派生值（`folders === null && error === null`、
`path === rootPath(path)`），不另存状态，免得中止请求、退回上层时要额外维护。

## 目录是自由上下，不是栈

`goTo(path)` 换层、`goUp()` 退一层、`goRoot()` 一路退到 `rootPath` 判定的根；
`parentPath(dir)` 用根判定做钳制，家目录不会爬到别人的目录去。
每次换层都先 `resetHover()` / `resetParentZone()` / 清 `error`，再看缓存里有没有这一层的 `folders`。

读盘单独收在 `use-view-folders.ts`：只有 `path !== null && folders === null` 才发请求，
结果先写 `cacheRef` 再回填 `view`；切层即 `abort`，迟到的响应按路径挡在外面。
每层的列表都过 `stripSelf`：**被拖条目自己不进列表**——它本来就摆在这一层，
留着就会出现「移进自己」的落点（拖文件夹时尤其致命）。

## 三条互斥判定

- **悬停计时**：`hoverFolder(path)` 只在「目标换了」时才起 `SPRING_HOVER_MS`（0.5 秒）计时，
  同一目标的连续 `dragover` 不重启；满 0.5 秒置 `springPath` 播弹起动画，再等 `SPRING_ENTER_MS`
  调 `goTo` 真正换层。`leaveFolder(path)` 只清自己那份计时，别误清刚停上去的新目标。
- **立刻松手**：`dropOnFolder(targetDir)` 直接移动，不进入——先清计时器再关窗提交，
  计时器不清的话松手后它还会把用户带进某个文件夹。
- **退层计时**：`hoverParentZone()` 管左停靠区，满 `PARENT_HOVER_MS` 退一层；同一次停留只退一次
  （`parentArmedRef`），指针离开再进来才重新计时。计时回调里先 `goUp()` 再收回标记：
  `goTo` 会重新武装标记，顺序反了会被连续 `dragover` 一路退到根。

所有落点动作都先 `resetHover()`。

## 两个停靠区与空白区

- `dropOnParentZone()` = `goUp()`：退一层，条目留在手里；到根时不动（弹窗据此压淡）。
- `dropOnCancelZone()` = `goRoot()`：一路退到根，条目留在手里。
- `dropOnBlank()`：移进当前这一层；当前层就是 `session.origin`（原地）时改走 `endDrag()`，不提交。

## 事件里的「此刻」

拖拽事件频率高、闭包容易读到上一次渲染的状态，所以会话、当前层、悬停目标、计时器句柄
都另存 ref（`sessionRef` / `viewRef` / `hoverRef` / `hoverTimerRef` / `enterTimerRef` /
`parentTimerRef` / `parentArmedRef` / `cacheRef` / `movingRef`），动作读 ref、渲染读 state，
由 `useEffect` 把 `view` 同步进 `viewRef`。

## 副作用清理

- 三个计时器（文件夹悬停、进入延迟、上一层退步）在离开、松手、换层、关窗时都清；
  卸载时再兜一次，清完句柄置回 `null`（`clearTimer(id, reset)`）；
- 读盘请求用 `AbortController`，切层或关窗即中止；
- 移动请求用 `movingRef` 挡住重复提交：`drop` 与 `dragend` 挨着来、连点两下都只认第一次。
