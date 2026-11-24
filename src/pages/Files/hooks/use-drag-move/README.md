# useDragMove

文件页的「拖拽移动会话」：从拖起一条目开始，到松手落下（或取消）为止的全部状态与动作。
弹窗 `DragMoveModal` 只负责呈现，页面通过 `useEntryActions` 把它接到拖动源的开始 / 结束事件上。

## 调用

```ts
const dragMove = useDragMove({
  currentDir,      // 页面当前目录；没打开目录时为 null，这时 open 不生效
  currentName,     // 弹窗最外层的目录名
  currentFolders,  // 页面已有的子文件夹列表：最外层不再多发一次请求
  moveEntry,       // (source, targetDir) => Promise<boolean>，成功才播音效
});
```

页面侧只有三个入口：`open(path, name)`（dragstart）、`endDrag()`（dragend）、`reset()`（切目录清场）；
弹窗用 `levels` / `loading` / `error` / `hoverPath` / `springPath` / `parentHovering` / `dragEnded` 渲染，
用其余动作处理落点。

## 目录栈与读盘

`levels[0]` 恒为拖拽起点，之后每深入一层追加一条。只有 `folders === null` 的层会触发一次读盘
（`fetchFileDir`），同一会话内按路径缓存，来回进出不重复扫盘；换层时优先命中缓存，
没缓存才进 effect 拿 `AbortController` 读一次，切层即中止，迟到的响应由 `fillLevelFolders`
挡在「还没结果的那一层」之外。

每一层的列表都过一道 `stripSelf`：**被拖的那个文件夹不进列表**——它本来就摆在自己这一层，
留着就会出现一个「移进自己」的落点。

`loading` 是派生值（`folders === null && error === null`），不另存一份状态——否则中止请求、
退回上层这类路径要额外维护它，最容易漏成「一直转圈」。

## 三条互斥判定

- **悬停计时**：`hoverFolder(path)` 只在「目标换了」时才起 `SPRING_HOVER_MS` 计时，
  同一目标的连续 `dragover` 不会把计时器反复重启；满 1.5 秒先置 `springPath` 播弹起动画，
  再等 `SPRING_ENTER_MS` 真正换层（`enterFolder`）。
- **立刻松手**：`dropOnFolder` 直接移动，不进入——它先清计时器，再关弹窗、提交移动。
  计时器不清的话，松手后它还会把用户带进某个文件夹。
- **退回计时**：`hoverParentZone()` 管底部「上一层」停靠区，满 `PARENT_HOVER_MS`（0.5 秒）
  退一层；同一次停留只退一次（`parentArmedRef`），指针离开再进来才重新计时，免得一直停着
  就把目录栈一路退到顶。

所有落点动作（含 `dropOnBlank` / 取消区 / 「上一层」 / 关闭 / `endDrag`）都先 `resetHover`。

## 底部两个停靠区

都在 `stepBack(steps)` 里收口：多层时退回 `steps` 层并**留着弹窗**，已在起点层则取消并关窗。

- 右下角取消区 → `dropOnCancelZone`，`steps` 取当前层数，一次退回最外层；
- 左下角「上一层」 → `dropOnParentZone`，`steps = 1`，退一层。

`hoverParentZone` 命中后走的也是 `goOuter(1)`，区别是这时拖拽还在继续，没有松手。

## 松手之后为什么还能留在那儿

浏览器在 `drop` 那一刻就结束了整次拖拽，`dragend` 随后一定到。要让「退回上层，弹窗不关闭」
成立，就先 `keepOpen()` 立一个标记，`endDrag` 见到它便不关窗，并把 `dragEnded` 置真。
这时拖拽已经结束，弹窗里只剩**点选**一条路（弹窗据此换提示、并给文件夹瓦片挂 `onClick`）；
点一下就走 `dropOnFolder`，点右下角取消走 `close`。

## 事件里的「此刻」

拖拽事件频率高、闭包容易读到上一次渲染的状态，所以会话、目录栈、悬停目标、计时器句柄
都另存一份 ref（`sessionRef` / `levelsRef` / `hoverRef` / …），动作读 ref、渲染读 state。

## 副作用清理

- 三个计时器（文件夹悬停、进入延迟、上一层退步）在离开、松手、换层、关窗时都清；
  卸载时再兜一次（`useEffect` 返回的清理函数），清完句柄置回 `null`（`clearTimer`）；
- 读盘请求用 `AbortController`，切层或关窗即中止；
- 移动请求用 `movingRef` 挡住重复提交：`drop` 与 `dragend` 之间、连点两下的情况只认第一次。
