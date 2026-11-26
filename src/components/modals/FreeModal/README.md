# FreeModal

基础弹窗外壳：把 Mantine `Modal` 包成项目默认的「文档 / 详情阅读窗」长相——框体、紧凑 header、
正文工作区、全屏、翻页与计数，全站所有阅读类弹窗都基于它封装，不各自拼 `Modal`。

## 它锁了什么

- **框体**：`radius="md"`、`padding={0}`、遮罩 `backgroundOpacity 0.5 + blur 2`、140ms fade；
  正文高度 `82dvh`（上限 `88dvh`），全屏时铺满 `100vw / 100dvh`。
- **配色分两层**（与页面外壳 `BasicLayout` 同一条口径，两个变量都在 `.content` 上打包下发）：
  header 与侧栏（业务侧的目录列）共用软底 `--preview-chrome`（`--app-surface-subtle`），
  正文区是画布纸 `--preview-paper`（`--app-bg`）；两层之间靠一条 `--app-line` 细线分界，
  业务弹窗不再各自挑底色。`height="auto"` 的普通弹窗同样成立（没有侧栏时就是「header 一档、正文一档」）。
- **header**：紧凑版（上下内边距 6px，高度由行内最高按钮决定，约 41px），用 `.content .header`
  双类名压掉 Mantine 的 `min-height` —— 单类名会被它那套 padding / min-height 顶回来。
- **header 的两种排布**：默认在正文上方占一行（普通流）；传 `headerOverlay` 后改为浮层
  （absolute，相对 `.content`——它同时充当定位祖先，否则浮层会爬到视口顶部、看着像全屏 header）
  压住正文顶部，配合 `headerHidden` 淡出上移——视频这类「平时藏起来、
  动鼠标才浮出」的弹窗用它，收起时正文能占满整块高度。浮层 header 走毛玻璃：半透明 chrome
  渐变 + 背景虚化，与播放器控制栏同一口径；普通流 header 仍是实心 chrome 底。隐藏只改外观，按钮仍由调用方决定是否可用。
- **header 里的按钮**：翻页与全屏走 `FreeIconAction`（`size="sm"`、语气恒为 `normal`、tip 与 `aria-label` 同句，
  键位提示走 `tooltipLabel`），**外壳不自维护图标按钮样式**；关闭按钮是组件库 `Modal` 内建的 `closeButton`。
- **header 的顺序与间距**：翻页与计数 → 标题 → `headerActions` → 全屏 → `headerTail` →
  `headerSecondary` → 竖线 → Mantine 关闭按钮。`headerActions` 里的按钮**彼此固定 8px 间距**
  （`.actions` 的 `gap: 8px`）：这是全站弹窗 header 操作的统一口径，业务侧直接铺自己的图标按钮，
  不要再包一层窄 gap 的 `Group` 去覆盖它。标题与右侧操作组之间恒留 20px（`.titleGap`），
  标题单行不换行、放不下才省略（hover 看全名），宽度再窄也压不到按钮上。
  竖线只有一条，画在**关闭按钮之前**（操作区与关闭的分界），组与组之间不再画线；
  没有关闭按钮（`closeButton={false}`）或右侧一个图标都没渲染时也不画，免得留一条孤线。
- **键盘口径统一在这里**（`hooks/useModalShortcuts`），业务弹窗不各自补快捷键：
  - `Esc`：关窗（Mantine 的 `closeOnEscape`）；
  - **空格**：关窗（传了 `media.onTogglePlay` 时改为播放 / 暂停，不关窗），并 `preventDefault`
    掉浏览器「空格 = 点击当前焦点按钮」——焦点常留在 header 图标上，不拦的话按空格会莫名翻到
    下一条 / 切了全屏；`closeOnSpace` 默认跟随 `closeOnEscape`；
  - **`[` / `【` 上一个；`]` / `】` 下一个**：有 `nav` 且未禁用时；
  - **`←` / `→`**：默认同方括号翻篇；传了 `onSeek` 就整组交给它（视频快进 / 后退），
    翻篇只剩方括号 —— 方向键在两种归属里只能选一种；
  - **`F`**：切换全屏（给了 `fullscreen.onToggle` 就生效；`showToggle: false` 只是不在外壳画按钮，快捷键仍保留）；
  - **`M` 静音**：传了 `media.onToggleMute` 才生效（视频预览里是静音）；
  - **`Enter` 截图**：传了 `onCapture` 时触发（视频预览截当前帧）；还没解出画面等
    由调用方自己判断，外壳只把按键转成一个回调；
  - **`C` 复制**：传了 `copy` 时把那段文本写进剪贴板，并给一条成功 / 失败提示（走固定通知 id）；
  - **`Delete` / `Backspace` 删除**：传了 `onRequestDelete` 时触发它（调用方只打开二次确认层，
    不在这里直接删）。两个键都认：macOS 键盘上印着 delete 的那颗发出来的就是 `Backspace`；
  - **业务自己的单键**：传 `extraKeys`（键名小写 → 动作）挂进这一套监听，只在本窗开着时生效；
    业务弹窗要加一个快捷键就传它，不要自己 `addEventListener`（否则会和 Esc / 空格两套抢键）。
  放行口径：带 ⌘ / Ctrl / Alt 的组合键不拦、正在输入（输入框 / 可编辑区）不拦、按住连发不算；
  翻页、方向键、全屏、静音、面板显隐、截图、复制与删除可由 `shortcutsEnabled` 整组收掉（加载中、上层浮层开着时），
  收掉时**连空格一起收**——上层确认层开着，底下的播放器不该还在响应播放 / 暂停。
  复制与删除的键位收在外壳：同一操作只要有两扇弹窗都要用，键位就必须只有一份（留在一处就会出现
  「这边能用、那边不能用」）；具体复制什么、删除时怎么确认仍归调用方。
- **初始焦点**：内容最前面固定放一个 `FocusTrap.InitialFocus`（`data-autofocus` 隐藏节点，
  `tabindex=-1` 且全局样式不给它画焦点环）。焦点陷阱先落它，而不是第一颗 header 图标——
  否则弹窗一开「上一条」就被聚焦，之后按任何键那颗按钮都会亮出主色焦点环；用户按 Tab
  才进入真实控件序列。业务弹窗不要再自己放第二个。
- **正文区**：`.body` 是 flex 纵向容器（`flex: 1 1 auto; min-height: 0`），正文自己决定怎么滚
  （`ScrollArea` 或整块不滚）；全屏由调用方持有状态（正文排版要用），这里只画按钮。

## 它不管什么

- 标题文案、翻页数据与范围（`nav.index / total / onPrevious / onNext` 由调用方算）；
- 每个按钮的组件与能力（复制、筛选、字号、编辑流程、删除按钮都由调用方塞进对应插槽）；
  外壳只管**键位**：复制复制什么、删除时怎么确认仍归调用方（`copy.text` 与 `onRequestDelete`）；
- 正文内容与其滚动方式；
- 全屏状态的存储（用下面的 `useModalFullscreen` 才记得住，不传 `fullscreen` 就没有全屏按钮）。

## props

| prop | 说明 |
| --- | --- |
| `opened` / `onClose` | 开合；Esc、点遮罩（`closeOnClickOutside` 为真时）、点关闭按钮都走 `onClose` |
| `title` | header 标题（`ReactNode`），通常是文件名 / 条目名 |
| `nav` | `FreeModalNav`：`index`（从 1 起）、`total`、`onPrevious` / `onNext`（到头传 `null` 置灰）、`previousLabel` / `nextLabel`、`shortcutHint`（只进 tooltip）、`disabled`（整组禁用，如编辑中） |
| `headerActions` | 第一组操作（阅读类：复制、筛选、刷新…） |
| `headerTail` | 排在全屏之后的末尾位，保证「删除」始终在最右 |
| `headerSecondary` | 第二组操作（如编辑流程），紧接在 `headerTail` 之后、关闭按钮的竖线之前 |
| `headerOverlay` / `headerHidden` | header 是否浮在正文之上（绝对定位）、是否处于隐藏态（淡出上移、不接收指针事件）；只影响外观，不卸载按钮 |
| `media` | `{ onTogglePlay, onToggleMute }`；传了 `onTogglePlay` 之后空格切播放 / 暂停、不再关窗，传了 `onToggleMute` 才有 `M` 静音 |
| `zIndex` | 层级，默认走组件库的弹窗档；要压在另一扇已打开的弹窗之上时显式抬高（二次确认层由 `ConfirmModal` 默认给 `320`） |
| `onCapture` | `Enter` 的动作（视频预览截当前帧）；不传则该键不动作 |
| `onSeek` | `(direction: 'backward' \| 'forward') => void`；传了之后 `←` / `→` 交给它（视频快进 / 后退），翻篇只剩 `[` / `]` |
| `fullscreen` | `{ active, onToggle?, showToggle? }`；不传则没有全屏外观与按钮。`showToggle` 默认 `true`，传 `false` 只收掉 header 按钮；`onToggle` 给了的话 `F` 键照常生效（进编辑这类不该换尺寸的场景，回调与按钮都不给） |
| `copy` | `{ text, message }`；传了就有 `C` 复制键（`text` 进剪贴板，`message` 是成功提示），与 header 的复制按钮同一口径 |
| `onRequestDelete` | 传了就有 `Delete` / `Backspace` 删除键；只应打开二次确认层，不直接删 |
| `extraKeys` | 业务自己的单键动作（`{ c: 开合收藏面板 }` 这类，键名小写）；只在本窗开着时生效，业务侧不自己监听 keydown |
| `closeButton` | 是否显示关闭按钮，默认显示（编辑态这类「关不掉」的场景传 `false`） |
| `closeOnClickOutside` | 点遮罩是否关窗，默认 `true`。遮罩点击由外壳自己接管：窗口拿回焦点后 400ms 内的那一下只当「回焦」不关窗，避免从外部应用切回来时误关 |
| `closeOnEscape` / `closeOnSpace` / `trapFocus` | Esc 与空格是否关窗（`closeOnSpace` 默认跟随 `closeOnEscape`）、上层浮层开着时由调用方关掉，避免一下全关 / 焦点被抢、是否锁焦点 |
| `shortcutsEnabled` | 默认 `true`；加载中、上层浮层开着时传 `false`，一次收掉翻页、方向键、`F` 全屏、`M` 静音、`S` 面板、`C` 复制与删除键（空格也一并收；只关窗的 `closeOnSpace` 另把关） |
| `size` / `centered` / `closeLabel` | 宽度档（默认 `min(980px, 92vw)`）、是否垂直居中、关闭按钮的 `aria-label` |
| `contentClassName` / `bodyClassName` / `innerClassName` | 只加增量类名，复制框体 / header 样式不算；`innerClassName` 加在 Mantine 内层定位容器上（全屏时清两侧 5vw 内边距用） |

## 全屏偏好：`hooks/useModalFullscreen`

这里管的是「框体放大到视口」的阅读全屏；视频预览的**整块屏幕全屏**走浏览器 Fullscreen API，
不用这个 hook（见 `VideoPreviewModal/README.md`）。


```ts
const { fullscreen, toggle } = useModalFullscreen(storageKey);
```

- 每个业务弹窗**一个自己的命名空间**（localStorage 里的一个 JSON 对象，全屏存在它的 `fullscreen` 字段）：
  键是 `<页面标识>:<组件>`（页面标识 = 路由，拼法见 `docs/shared-utils.md` 的「存储键的命名」），
  如 `english-notes:markdown-preview`、`english-notes:anchor-section-preview`、
  `english-notes:details-section-preview`、`english-knowledge-base:record-detail`——
  md 预览的三层与记录详情各记各的；同一个弹窗挂到第二页时由那一页传自己的标识，不能沿用第一页的；
- 状态由调用方持有，用来参与正文排版；`Esc` 永远关弹窗（连带退出全屏），不是切全屏。

## 两种高度模式

- `height="reading"`（默认）：固定 `82dvh` 的阅读窗，配翻篇 / 全屏 / 目录；
- `height="auto"`：高度随内容、上限 `88dvh`、正文自己滚（`.body` 自带 `overflow-y: auto`
  与左右内边距），给说明、短表单、列表这类普通弹窗。

`ConfirmModal`（二次确认）就是基于 `height="auto"` 这一档封的通用业务组件：说明块 +
可选额外内容 + 取消 / 确认，业务侧不再各自拼确认框。

## 基于它封装的业务弹窗

- `MarkdownPreviewModal`：`DocumentActions` → `headerActions`、编辑流程 → `headerSecondary`、
  删除 → `headerTail`、翻篇 → `nav`；
- `Review/RecordDetailModal`：记录详情，`nav` 传上一条 / 下一条，正文用 `ScrollArea` + `.paper` 留白。

业务弹窗不回头直连 `Modal`、不复制框体 / header 样式；需要新插槽时先加在本组件，哪怕只有一处用
（同一类形态全站只该有一套，第二处出现时两处一起往这里靠）。
