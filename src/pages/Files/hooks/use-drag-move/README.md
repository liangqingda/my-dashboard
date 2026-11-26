# useDragMove

文件页的「拖拽移动会话」：从拖起一条条目（或待拖拽区里的一批）开始，
到松手落下（或放回手里）为止的全部状态与动作。
弹窗 `DragMoveModal` 只负责呈现，页面通过 `useEntryActions` 把它接到拖动源的开始 / 结束事件上。

## 调用

```ts
const dragMove = useDragMove({
  currentDir,      // 页面当前目录；null 时 open 不生效
  currentFolders,  // 页面已有的子文件夹列表：最外层不再多发一次请求
  moveEntry,       // (source, targetDir) => Promise<boolean>，成功才播音效
  onAllMoved,      // 可选：整批都搬走、弹窗自动关掉时回传最后落成的目录（页面据此切过去）
  onRestored,      // 可选：弹窗里把「刚搬进来的」某一条取回手卡时，页面同时把它加回待拖拽区
});
```

入口三个：`open(entries)`（dragstart，一批条目本体进来：文件夹 / 文件的区别由它身上有没有 `category` 判）、
`endDrag()`（dragend，条目回到手里）、`reset()`（切目录这类页面级清场，连缓存一起丢）。
弹窗里再拖一次走 `beginDrag()`（会话还在，只把拖拽状态重新点亮）；
弹窗里改搬其中一条走 `focusEntry(path)`（会话收窄到这一条、保留 `origin`，其余条目不参与本次移动，
仍留在页面侧栏的待拖拽区）；新建 / 改名后走 `refreshView()`（丢掉当前层缓存、重读一次）。

## `movedPaths`

一次会话里**真正移成功**的源路径，`open()` 时清空，之后每成功一趟就**累加**（`movedRef` 是判定用的那份），
所以「一批里先搬一条、再搬剩下的」也能正确收尾。
页面靠它做收尾：`FilesDragLayers` 拿 `movedPaths` 调 `pending.removePaths`，只把搬走的那几条从
待拖拽区摘掉；关窗 / Esc 取消时它是空的，攒下的条目原样留着。

## 三层状态

- `session`：被拖的是谁（`entries` 明细 + `origin` 来源目录）。条目里没有 `category` 的就是文件夹，
  弹窗据此换图标、决定图标能不能点开预览；`entries.length > 1` 时弹窗里的待拖拽区平铺多条、可逐条拖起；
- `view`：`{ path, folders }`，弹窗现在停在哪一层，`folders === null` 表示这一层还等着读盘；
- `dragActive` / `handed`：条目「正在被拖」还是「已经放回手里」，两者互斥地决定提示语与点击是否生效。

只有**这一批条目全部搬走**（或用户主动关窗）才 `close()`；只搬走其中一条时弹窗留着，
把剩下的条目接着摆在待拖拽区（`session.entries` 换成剩下的那批），其余松手一律 `endDrag()` → `handed`。
自动关窗发生在「所有待拖拽项都搬走」那次移动之后，并回传最后一个落成的目录（`onAllMoved`）。
渲染用的 `loading` 是派生值（`folders === null && error === null`），不另存状态，
免得中止请求、换层时要额外维护。

## 目录按路径自由上下

`goTo(path)` 是唯一的换层入口：面包屑每一段、点某个文件夹瓦片、悬停满 0.5 秒自动进入，都收敛到这里。
每次换层先 `resetHover()` 再清 `error`，然后看 `cacheRef` 里有没有这一层的 `folders`，没有才交给读盘 effect。

读盘单独收在 `use-view-folders.ts`：只有 `path !== null && folders === null` 才发请求，
结果先写 `cacheRef` 再回填 `view`；切层即 `abort`，迟到的响应按路径挡在外面。
每层的列表都过 `stripSelf`：**被拖的文件夹自己不进列表**（拖一批时按每个路径逐条摘掉）——
它们本来就摆在这一层，留着就会出现「移进自己」的落点（拖文件夹时尤其致命）。

## 两条互斥判定

- **悬停计时**：`hoverFolder(path)` 只在「目标换了」时才起 `SPRING_HOVER_MS`（1 秒）计时，
  同一目标的连续 `dragover` 不重启；满 1 秒置 `springPath` 播弹起动画，再等 `SPRING_ENTER_MS`
  调 `goTo` 真正换层。这 1 秒里**前 0.5 秒不画进度**、后 0.5 秒倒计时条才填满（时间轴在
  `DragMoveModal/FolderGrid/index.scss` 的 `hoverCountdown`）。`leaveFolder(path)` 只清自己那份计时，
  别误清刚停上去的新目标。计时器整套收在 `use-hover-targets.ts`。
- **松手先清计时**：`endDrag()` 一进来就 `resetHover()`。指针还可能压在某一行上，
  不停掉那套 500ms 的「停留＝进入」，松手后它还会接着跑，看起来就是「松手了还要等一下才回去」。
- **立刻松手**：`dropOnFolder(targetDir)` 直接移动（把 `session.entries` 逐个提交），不进入——
  先清计时器再关窗提交，计时器不清的话松手后它还会把用户带进某个文件夹。

所有落点动作都先 `resetHover()`。

## 空白区

`dropOnBlank()` 把这一批条目移进当前这一层；当前层正好是 `session.origin`（它原本就在这儿）时
改走 `endDrag()`——没有可移动的距离，只把条目放回手里，弹窗留着（弹窗据此把提示改成「松开不做移动」）。

## 搬这一趟的节奏（`use-move-runner.ts`）

松手到真正落位的那一程单独收在 `use-move-runner.ts`：逐条提交（进度由 `run-move.ts` 推）、
**至少演 `MIN_MOVE_MS`＝0.5 秒**（本机搬一条是毫秒级的事，进度窗一闪而过反而像没做成），
等满半秒之后才判要不要关窗。中途有一条失败就停在手持态，失败原因由 `moveEntry` 自己弹通知。
搬成功的几条先进 `movedRef`，再按「整批里还剩谁」决定：剩 0 条 → `close()` + 音效 + `onAllMoved(targetDir)`；
还剩 → 会话换成剩下的那批、`handed = true`，弹窗不关。

**提示只弹一条、且在关窗之后**：`moveEntry` 不再逐条弹「已移动」，搬完的总结交给
`notify.ts` 的 `notifyMoveDone`（`已移动 N 个项目`，有被剔出来的就补一句），
顺序固定为「进度走完 → 决定是否关窗 → 关了才提示」。通知层级压在全屏弹窗之上（`main.tsx` 里 `zIndex={800}`）。

## 刚搬进这个文件夹的那几条（`use-landed.ts`）

弹窗没关（只搬走了其中几条）时，**进入那个文件夹就能看到本次搬进去的条目**：
`use-landed.ts` 收一份 `LandedItem[]`（会话级，`open()` 时清空），每条记「搬完后的新路径、
原目录、落进的目录」；弹窗按 `targetDir === view.path` 筛出「这一层的」，交给 `LandedTiles`
用列表里同款瓦片（视频帧 / 文件名 / 文件大小）平铺，位置在文件列表前面。

点某一条＝`restoreLanded(item)`：先把它**真的搬回原目录**（`moveEntry(新路径, origin)`，成功才算数），
再把 `session.entries` 追加回它的原路径（回到手卡）、从 `landed` 里摘掉、从 `movedPaths` 里剔掉
（搬前的新路径与搬回后的原路径都要剔），并经 `onRestored` 把它加回页面待拖拽区——关窗以后它还在
待拖拽区里，而不是「既不在原处、也不在手上」。搬回失败时不改任何状态，`moveEntry` 自己弹提示。
**为什么必须动磁盘**：只还原手卡不搬回的话，它的记录仍在目标文件夹里，下一次往同一个文件夹拖会被
`splitByParent` 判成「本来就在里面」而一动不动——现象就是「放回去以后再也拖不进去」。
回落那一趟的动画不在 hook 里：`hooks/useReturnFly.ts` 量那格与手卡、起 `ReturnFly`。

## 事件里的「此刻」

拖拽事件频率高、闭包容易读到上一次渲染的状态，所以会话、当前层、悬停目标、计时器句柄
都另存 ref（`sessionRef` / `viewRef` / `hoverRef` / `hoverTimerRef` / `enterTimerRef` /
`cacheRef` / `movingRef` / `movedRef`），动作读 ref、渲染读 state，由 `useEffect` 把 `view` 同步进 `viewRef`。

## 副作用清理

- 两个计时器（文件夹悬停、进入延迟）在离开、松手、换层、关窗时都清；
  卸载时再兜一次，清完句柄置回 `null`（`clearTimer(id, reset)`）；
- 读盘请求用 `AbortController`，切层或关窗即中止；
- 移动请求用 `movingRef` 挡住重复提交：`drop` 与 `dragend` 挨着来、连点两下都只认第一次。
