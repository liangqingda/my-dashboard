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

入口三个：`open(entry)`（dragstart，条目本体进来：文件夹 / 文件的区别由它身上有没有 `category` 判）、
`endDrag()`（dragend，条目回到手里）、`reset()`（切目录这类页面级清场，连缓存一起丢）。
弹窗里再拖一次走 `beginDrag()`（会话还在，只把拖拽状态重新点亮）；
弹窗里新建 / 改名后走 `refreshView()`（丢掉当前层缓存、重读一次）。

## 三层状态

- `session`：被拖的是谁（`path` / `name` / `file` / `origin` 来源目录）。`file === null` 就是文件夹，
  弹窗据此换图标、决定图标能不能点开预览；
- `view`：`{ path, folders }`，弹窗现在停在哪一层，`folders === null` 表示这一层还等着读盘；
- `dragActive` / `handed`：条目「正在被拖」还是「已经放回手里」，两者互斥地决定提示语与点击是否生效。

只有成功移动（或用户主动关窗）会 `close()`；其余松手一律 `endDrag()` → `handed`，弹窗不关。
渲染用的 `loading` 是派生值（`folders === null && error === null`），不另存状态，
免得中止请求、换层时要额外维护。

## 目录按路径自由上下

`goTo(path)` 是唯一的换层入口：面包屑每一段、点某个文件夹瓦片、悬停满 0.5 秒自动进入，都收敛到这里。
每次换层先 `resetHover()` 再清 `error`，然后看 `cacheRef` 里有没有这一层的 `folders`，没有才交给读盘 effect。

读盘单独收在 `use-view-folders.ts`：只有 `path !== null && folders === null` 才发请求，
结果先写 `cacheRef` 再回填 `view`；切层即 `abort`，迟到的响应按路径挡在外面。
每层的列表都过 `stripSelf`：**被拖条目自己不进列表**——它本来就摆在这一层，
留着就会出现「移进自己」的落点（拖文件夹时尤其致命）。

## 两条互斥判定

- **悬停计时**：`hoverFolder(path)` 只在「目标换了」时才起 `SPRING_HOVER_MS`（0.5 秒）计时，
  同一目标的连续 `dragover` 不重启；满 0.5 秒置 `springPath` 播弹起动画，再等 `SPRING_ENTER_MS`
  调 `goTo` 真正换层。`leaveFolder(path)` 只清自己那份计时，别误清刚停上去的新目标。
- **立刻松手**：`dropOnFolder(targetDir)` 直接移动，不进入——先清计时器再关窗提交，
  计时器不清的话松手后它还会把用户带进某个文件夹。

所有落点动作都先 `resetHover()`。

## 空白区

`dropOnBlank()` 把条目移进当前这一层；当前层正好是 `session.origin`（它原本就在这儿）时
改走 `endDrag()`——没有可移动的距离，只把条目放回手里，弹窗留着（弹窗据此把提示改成「松开不做移动」）。

## 事件里的「此刻」

拖拽事件频率高、闭包容易读到上一次渲染的状态，所以会话、当前层、悬停目标、计时器句柄
都另存 ref（`sessionRef` / `viewRef` / `hoverRef` / `hoverTimerRef` / `enterTimerRef` /
`cacheRef` / `movingRef`），动作读 ref、渲染读 state，由 `useEffect` 把 `view` 同步进 `viewRef`。

## 副作用清理

- 两个计时器（文件夹悬停、进入延迟）在离开、松手、换层、关窗时都清；
  卸载时再兜一次，清完句柄置回 `null`（`clearTimer(id, reset)`）；
- 读盘请求用 `AbortController`，切层或关窗即中止；
- 移动请求用 `movingRef` 挡住重复提交：`drop` 与 `dragend` 挨着来、连点两下都只认第一次。
