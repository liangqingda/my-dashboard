# 视频预览弹窗（`VideoPreviewModal`）

视频预览的**唯一入口**：文件页里的视频条目点开后，在 `FreeModal` 里播放、翻篇、看当前目录
的视频列表、截当前一帧。它只做「容器」——播放能力组合自独立的
[`FreeVideo`](../../file-preview/FreeVideo/README.md)（`file-preview` 分类），本组件不重复实现
控制栏与播放状态。选型见 `docs/ui-components.md`；本文件讲行为契约与实现约束。

## 它锁了什么

- **组合关系**：`FreeModal`（外壳：标题 / 翻篇 / 计数 / 键位）+ `FreeVideo`（播放器）+
  `VideoSidebar`（目录）。播放器与弹窗互不依赖：`FreeVideo` 不认识弹窗，弹窗只传 `src` 与
  `videoRef`；全屏、header、侧栏、截图都留在本组件。
- **整屏全屏**：走浏览器 Fullscreen API（`document.documentElement.requestFullscreen()`），
  占的是**整块屏幕**，不是把框体撑满视口。`fullscreenchange` 是唯一状态源：浏览器里按 `Esc`
  退出全屏的状态也由它同步，组件不自己猜。
- **header 自动隐藏**：只在全屏里生效。鼠标静止 3s 收起 header（淡出上移、不接收指针事件），
  鼠标一移动 / 按下 / 滚轮就重新浮出并重置计时。header 是**浮层**（绝对定位覆盖画面顶部），
  收起时正文占满整块高度。
- **侧栏**：列当前目录的全部视频（顺序 = 翻篇顺序），高亮正在播放的一条，整行可点切换。
  常规尺寸默认显示；**进全屏默认收起**，由 header 的列表图标按钮唤出。两份开关分开记：
  全屏收起不影响常规尺寸。
- **截图**：header 的相机图标把当前视频帧画进离屏 canvas（PNG），交给调用方落盘；
  失败 / 还没解出画面各给一条通知，不生成空白图。截图不改播放状态，暂停时截当前帧。
- **翻篇与计数**：`FreeModal` 的 `nav`，到头置灰不循环；`[` / `]` / `←` / `→` 键位由外壳给。
  换片用 `key` 重挂播放器实例，不重挂弹窗（全屏与侧栏状态不跟着重置）。
- **空格**：切播放 / 暂停（`FreeModal` 的 `media`），不关窗。`Esc` 在全屏里交给浏览器退出全屏，
  非全屏才是关窗；关窗前先退出整屏，免得弹窗没了、页面还停在全屏。

## props

| prop | 说明 |
| --- | --- |
| `opened` | 是否打开 |
| `items` | 当前目录的视频：`{ id, name, src }`，`id` 由页面给（文件页用路径） |
| `activeId` | 当前条目；不在 `items` 里时组件不渲染内容（调用方应同时关窗） |
| `onSelect` | 切到某一条（翻篇与侧栏点选共用） |
| `onClose` | 关闭（内部会先退出整屏） |
| `onCapture` | 把 PNG data URL 落盘，返回 `{ message }`（提示里通常带实际文件名） |

弹窗**不知道**文件在哪、桌面在哪：路径与落盘都由调用方实现；组件只给「当前帧」这一份数据。

## 实现约束

- `FreeVideo` 只认 `src` / `videoRef` / `className`；视频元素引用交给弹窗复用（截图与空格播放都读它）。
- 换片是 `key={id}` 重挂 `FreeVideo`——在同一个 `<video>` 上换 `src` 需要清理播放状态与进度，
  重挂比在 effect 里逐项复位更省心。
- 浏览器解不了的编码（mkv / avi / wmv 等常见）走 `error` 事件，舞台中央给一句人话，
  不静默停在黑屏。
- 本组件内部的键盘监听为**零**：能按的键都在 `FreeModal`（翻篇、全屏、空格）里判，
  业务层不自己 `addEventListener('keydown')`。
- 视频流由 Vite 中间件 `GET /api/files/content` 按 Range 提供，截图由 `POST /api/files/capture`
  写进桌面；两者都只在开发模式存在（见 `docs/local-repo-data.md`）。
