# ImagePreviewModal

文件页的**图片预览弹窗**：左侧列当前目录的图片，右侧整图展示。与 `VideoPreviewModal` 同形
（同一个 `FreeModal` 外壳、同一个 `PreviewSidebar`、同一个 `useBrowserFullscreen`），
但去掉播放器那一套：没有播放 / 快进 / 静音 / 截图。

## 它锁了什么

- 结构：header（标题 + 张数 / 翻篇 + 全屏 + 删除）→ 正文两列：左侧图片列表、右侧黑底舞台；
  点遮罩关窗（窗口刚拿回焦点的 400ms 内除外），关闭按钮与 `Esc` 同样有效；
- `defaultFullscreen` 为真时打开就尝试进整屏（文件页设置里的「图片预览打开即全屏」），
  浏览器不给手势就静默停在这个尺寸；
- header 与侧栏默认常驻，**点一下图片**把它们一起收起（看整幅），再点一下展开；
  不做「鼠标静止自动隐藏」——收起只由点击决定（视频那套 `useAutoHideHeader` 只在
  「全屏 + 侧栏收起」时启用，这里没有那种形态）；
- 删除只开二次确认层（`onRequestDelete` → 页面的 `DeleteEntryConfirm`），不在弹窗里直接删；
- 舞台：整图 `object-fit: contain` 居中装下，加载时压暗并转一个 loader；
  读不出来给「这张图片无法显示」，不留空白也不弹通知。

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
`onRequestDelete`（不传则没有删除按钮与删除键）。

- `items` 的 `id` 用文件路径，与页面的删除、选中状态同一套标识；
- `src` 由页面用 `imageContentUrl` 拼（`/api/files/image?path=`），弹窗只负责显示；
- `activeId` 不在 `items` 里时组件整块不渲染（条目被删或换了目录）。

## 内部件

- `ImageStage/`：单图舞台（加载 / 失败态）。单独成组件只是为了换图时用 `key` 重置加载态，
  不在弹窗里为一个图片状态写 effect；私有件，不需要单独的 README。
