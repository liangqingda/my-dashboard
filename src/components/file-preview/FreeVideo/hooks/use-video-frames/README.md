# 进度条预览帧（`useVideoFrames`）

按指针 hover 的时间**现抽一帧**，抽过的按时间桶缓存复用；只在 `FreeVideo` 内使用，
播放器之外的调用方不需要知道它。

## 为什么另开一支视频

抽帧必须按时间点 seek，而 seek 会改 `currentTime`、画面跟着跳。正在播的那支不能动，
所以 `FreeVideo` 额外渲染一支 1px、透明、不接指针的 `<video>`，只负责解码与绘制。
它不参与布局（绝对定位 + 1px），也不出声（始终暂停）。

## 为什么按需抽，而不是预铺网格

均匀网格的帧只在中点时间上准确：指针落在格与格之间时，只能拿最近的那张顶替，
看起来就「差几秒」（时间标签是 hover 位置，画面却是几秒前）。按需抽的是指针那一刻的时间，
画面与标签才对得上。

也**不预抽左右邻帧**：一支探针一次只能 seek 一个点，高码率大文件上一次 seek 要一两秒，
预抽会把探针占住好几秒，指针真停下时反而要等更久。抽帧的代价只花在用户看得见的那一帧上；
重复 hover 同一段靠缓存命中兜住。

## 规则

| 项 | 值 | 说明 |
| --- | --- | --- |
| 缓存粒度 | 0.5 秒/桶 | `bucketOf(time)` 取整到桶号；同桶复用同一张图，半秒内的画面差别看不出来 |
| 缓存容量 | 80 张 | 超出按插入顺序丢最早的（data URL 常驻内存，80 张约 3–5 MB） |
| 分辨率 | 调用方传 `frameLongestEdge` | 预览框宽 × 设备像素比（封顶 2 倍）；源比目标小就不放大 |
| 格式 | JPEG q0.88 | 预览图再高只是多占内存 |
| seek 超时 | 10000ms | 超时这一帧不进缓存，调用方那次留空转圈（高码率大文件 seek 到关键帧可能要好几百毫秒到数秒） |
| 数据可用超时 | 3000ms | `seeked` 后 `readyState` 可能仍停在元数据档 |
| 呈现超时 | 2500ms | 等 `requestVideoFrameCallback` 的上限；超时退回「数据就绪 + 时间对得上」的判据 |
| 呈现容差 | 0.5 秒 | `requestVideoFrameCallback` 的 `mediaTime` 与目标差在此内才算「就是这一帧」 |

## 调度：一支探针，串行

一支探针一次只能 seek 一个点，所以全部任务串行（递归 `step`，不用循环内 `await`）：

- **只留最新请求**：`pendingRef` 只保留最新一个，后来的覆盖先来的（同一桶则只换回调）；
- **旧请求提前收手**：只有真的换了桶才把 `latestRef` 加一（同桶再来只换回调，不打断正在跑的
  seek）；正在跑的那一趟看到代次变了就走人，不必干等旧 seek 的超时（新 `currentTime` 会直接打断旧 seek）；
- **命中缓存同步回调**：`requestFrame` 里直接 `onFrame(url)`，不排队、不跨 tick；
- **没就绪的请求先留着**：探针还没拿到元数据时 `pump` 不取任务，`pendingRef` 里那一帧原样排着，
  `readDuration` 一回来就补跑——早 hover 的人不必再动一下指针才看到帧。

结果通过**回调**交给调用方，不在 hook 里 `setState`：调用方在 hover 事件里拿到图直接更新自己
的状态，既不用为「抽好了」加一层订阅，也避免在 effect 里同步 `setState`。
反过来，调用方要自己丢掉过期回调（`VideoControls` 用递增的 `requestTokenRef` 判断：
图回来时指针已经移开就丢弃），否则慢一步的旧位置图会盖掉新位置。

## 怎么保证「画出来的就是这一秒」

`seeked` 只代表跳转完成，画面上可能还是上一次的位置（这正是「hover 看到的和点过去差几秒」的来源），
所以画之前分三道关：

1. `waitSeeked`：等 `seeked`；
2. `waitData`：等 `readyState >= 2`，否则 `drawImage` 会画出空白；
3. `waitPresented`：用 `requestVideoFrameCallback` 给的 `mediaTime` 与目标时间比对，
   落在 `FRAME_PRESENT_TOLERANCE` 内才算这一帧真的画出来了；对不上就接着等下一帧回调。
   等满 `FRAME_PRESENT_TIMEOUT` 仍没有回调时先**重试一次**：把时间点微移 `FRAME_RETRY_OFFSET`
   再 seek，解码器会重新落帧（暂停的探针常常只解到最近的关键帧，这也是「预览帧比点过去差几秒」
   的来源）；重试仍不中才退回「`readyState >= 2` 且 `currentTime` 已经是目标」兜住，避免永久转圈。

**这一步必须在设 `currentTime` 之前注册**：探针是暂停的，帧一旦画出来就不会再触发回调，
`seeked` 之后再挂会永远等不到（表现为浮层一直转圈、一张图都不出）。

## 降级

- **单次失败**：seek 超时、数据没到、呈现判据全部落空时不写缓存，回调不触发，
  调用方那次留空（浮层转圈）；下次 hover 会重新抽。
- **整轮不可用**：拿不到元数据时 `ready` 保持 false，控制栏回落到原来的数字浮标，界面上不留痕迹。
- **取消**：`src` 或 `frameLongestEdge`（缩窗后分辨率变了）变化、组件卸载时 `AbortController.abort()`，
  异步链路每步问一次；画到一半取消不会留下脏 state。

## 边界与坑

- `no-unnecessary-condition` 下不能直接 `if (controller.signal.aborted)`：`aborted` 是 readonly，
  TS 会在闭包里把它窄化成恒假。代码里包了一层 `isCancelled()` 来读。
- 探针地址由 `FreeVideo` **晚一步**才交过来（主画面就绪 + `PROBE_ARM_DELAY`），没交之前 `src` 是空串，
  这里的 effect 直接不启动、`ready` 保持 false；挂上后 `preload="metadata"`，只取元数据，
  要哪一帧再按位置拉那一段。这样打开 / 连翻视频时不会多出一条整份流跟主视频抢盘
  （进度条一 hover，`useFrameProbe` 会立刻挂上，不再等那一档空档）。
- 首次 hover 的等待就是这个文件一次 seek 的耗时：本地 1080p H.264 通常几百毫秒，
  4K HEVC 这类要重新解码关键帧的能到数秒（实测 4096×2160 长 GOP 素材冷位置 2–5 秒、
  已访问过的位置 200–1200ms，同一位置的 `Range` 请求只要 10ms，慢在解码不在传输）。
  这不是实现能优化的，只能靠缓存复用；代码侧做到的是「不白等」——以
  `requestVideoFrameCallback` 为主信号，且同一个位置上的微抖不会重发、不会打断正在跑的那一帧。
