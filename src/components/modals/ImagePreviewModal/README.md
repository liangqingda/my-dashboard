# ImagePreviewModal

文件页的**图片预览弹窗**：整图展示 + header 上的图片列表弹层。与 `VideoPreviewModal` 同形
（同一个 `FreeModal` 外壳、同一个 `PreviewItemList`、同一个 `useBrowserFullscreen`、同一套浮层
header），但去掉播放器那一套：没有播放 / 快进 / 静音 / 截图；header 的显隐也不跟指针走，只由点击开合。

## 它锁了什么

- 结构：header（标题 + 张数 / 翻篇 + 图片列表 + 设为桌面墙纸 + 全屏 + 删除）浮在整图之上，
  正文只有一张黑底舞台；点遮罩关窗（窗口刚拿回焦点的 400ms 内除外），关闭按钮与 `Esc` 同样有效；
- `defaultFullscreen` 为真时打开就尝试进整屏（文件页设置里的「图片预览打开即全屏」），
  浏览器不给手势就静默停在这个尺寸；
- **header 是毛玻璃浮层**（`FreeModal` 的 `headerOverlay`，`trigger: 'click'`）：打开即是收起态，
  先把整幅图看全；隐藏时淡出上移且不挡点击；
- **只由点击开合，hover 不参与**：点一下图片浮出 header，再点一下收起——指针在画面上怎么移动
  都不会让 header 自己浮出或自己藏起来（不自动出现、也不自动收起）。header 收起时按钮不可点
  （`pointer-events: none`），所以这两下的落点一直在大按钮上；
- **双击切全屏**：双击画面进出整屏全屏（与 `F` 同一档，走同一个 `useBrowserFullscreen`），
  **不切 header 显隐**——单点那一下会先等一个双击窗口（`DOUBLE_CLICK_WINDOW` = 300ms）再开合
  header，第二下到来就把这次开合作废；所以双击只换尺寸、header 一动不动，单点则是「晚 300ms
  生效」的开关；
- **关窗顺手复位**：`Esc` / 关闭按钮 / 点遮罩走同一个关窗入口，退出整屏全屏的同时把 header 的
  显示态与列表弹层清掉，下次打开仍是「先看整幅图、点一下才浮出 header」；
- **图片列表收进 header**：不常驻侧栏，header 里一颗「图片列表」图标按钮点开一层（按钮正下方），
  列当前目录的全部图片（顺序 = 翻篇顺序），高亮正在看的一张，整行可点切换并合上弹层；
  弹层开着时按钮保持主色、header 恒可见；此时点图片**只收弹层、不切 header 的显隐**（按下那一刻的
  开合状态记在 ref 里，等点在外部收起后再由 `click` 判断，避免同一下点击做两件事）；
- 翻篇（按钮 / 列表 / 键盘都算）后左上角浮出一下「3 / 12」，1 秒后自己收掉（`PreviewCounter`）：
  header 默认藏着，用户只需要知道「现在第几个」，不必把整条 header 带出来；刚打开时（还没翻过）不出现；
- 删除只开二次确认层（`onRequestDelete` → 页面的 `DeleteEntryConfirm`），不在弹窗里直接删；
  设为桌面墙纸同理（`onRequestWallpaper` → 页面的 `WallpaperConfirm`），弹窗不碰系统设置；
  删除确认开着时 header 也恒可见（与列表弹层同一档：`suspended` 强制显示）；
- 舞台：整图 `object-fit: contain` 居中装下，加载时压暗并转一个 loader；
  读不出来给「这张图片无法显示」，不留空白也不弹通知；
- 提示配色：header 里的 tooltip 与图片列表的省略提示固定深底浅字（`tipDark`），
  压在画面上不随主题反转。

## 键盘

| 键 | 动作 |
| --- | --- |
| `[` / `]`、`←` / `→` | 上一张 / 下一张（方向键不开快进，图片没有时间轴）；首尾相接循环，只有一张时两端都置灰 |
| `F` | 全屏 / 退出全屏 |
| `Esc` | 全屏里交给浏览器退出；非全屏关闭弹窗 |
| `Delete` / `Backspace` | 触发删除确认 |
| `空格` | 关闭弹窗（与其它弹窗一致；只有视频预览把空格让给了播放 / 暂停） |

删除确认开着时整组快捷键与焦点陷阱都交给那一层（`blocked`），与视频预览同一口径。

## props

见 `types.ts`：`opened` / `items` / `activeId` / `blocked` / `onClose` / `onSelect` /
`onRequestDelete`（不传则没有删除按钮与删除键）/ `onRequestWallpaper`（不传则 header 没有那颗按钮）。

- `items` 的 `id` 用文件路径，与页面的删除、选中状态同一套标识；
- `src` 由页面用 `imageContentUrl` 拼（`/api/files/image?path=`），弹窗只负责显示；
- `activeId` 不在 `items` 里时组件整块不渲染（条目被删或换了目录）。

## 内部件

- `ImageStage/`：单图舞台（加载 / 失败态）。单独成组件只是为了换图时用 `key` 重置加载态，
  不在弹窗里为一个图片状态写 effect；私有件，不需要单独的 README。
- `ImageListMenu/`：header 的「图片列表」按钮 + 点击弹层，开合状态由弹窗持有（弹层开着时
  header 要恒可见），条目排布走公共的 [`PreviewItemList`](../PreviewItemList/README.md)。
