# 进度条预览帧（`useVideoFrames`）

给进度条 hover 预览准备帧图：用一支隐藏的**探针视频**（同源同地址的第二支 `<video>`）在后台
均匀抽帧，转成 JPEG data URL 交给控制栏。只在 `FreeVideo` 内使用，播放器之外的调用方不需要知道它。

## 为什么另开一支视频

抽帧必须按时间点 seek，而 seek 会改 `currentTime`、画面跟着跳。正在播的那支不能动，
所以 `FreeVideo` 额外渲染一支 1px、透明、不接指针的 `<video preload="metadata">`，只负责解码与绘制。
它不参与布局（绝对定位 + 1px），也不出声（始终暂停）。

## 抽帧规则

| 项 | 值 | 说明 |
| --- | --- | --- |
| 间隔 | 每 4 秒一帧 | 帧数 = `duration / 4`，夹在 8–40 之间；再密收益很小，只会拖长首轮准备时间 |
| 取帧点 | 每段中点 | `(index + 0.5) * frameSpan`，覆盖整段而不是首尾偏移 |
| 分辨率 | 最长边 528px | `SEEK_PREVIEW_WIDTH * 2`，与预览框（264×160）同源，贴 2x 屏清晰度 |
| 格式 | JPEG q0.86 | data URL 常驻内存，约 1–2 MB（40 帧） |

抽帧是**串行**的：一支探针一次只能 seek 一个点，`captureAt(index)` 抽完一帧再递归下一帧。
不用循环内 `await`（eslint 不允许，也没必要并发）。

## 渐进与降级

- **渐进**：每抽出一帧就更新一次定长数组（按时间顺序），鼠标停在靠前的位置时不必等整轮跑完；
  数组元素为 `null` 表示这一格没抽到，浮层取最近的可用帧（见 `SeekPreview` 的 `frameAt`）。
- **降级**：整轮拿不到元数据 / 浏览器不支持画布时保持 `null`，控制栏的 `label` 回落到原来的数字浮标；
  中途单帧超时只让那一格留空。全程不弹提示，不影响播放。
- **取消**：`src` 变化或组件卸载时 `AbortController.abort()`，异步链路每一步都问一次；
  画到一半取消不会留下脏 state。

## 边界与坑

- `no-unnecessary-condition` 下不能直接 `if (controller.signal.aborted)`：`aborted` 是 readonly，
  TS 会在闭包里把它窄化成恒假。代码里包了一层 `isCancelled()` 来读。
- 探针的 `preload="metadata"`：只先拉元数据，后续 seek 由浏览器按 Range 取需要的片段，
  不会在打开视频时把整部片拉一遍。
- 换片由调用方用 `key` 重挂 `FreeVideo`，本 hook 不监听播放状态，只认 `src` 与探针 ref。
