# 主视频元素动作与事件（`useVideoElement`）

`FreeVideo` 主 `<video>` 上的播放 / 暂停、seek、音量、静音，以及 `loadeddata` /
`loadedmetadata` / `timeupdate` 等事件到播放器 state 的同步，都收在这一个 hook 里；
播放器主体只把事件挂上来，不再逐段判断「元素存不存在、播没解出来」。

## 动作

| 动作 | 用在哪 | 行为 |
| --- | --- | --- |
| `togglePlay` | 播放键、点画面、空格 | 元素暂停就播（失败不抛错），在播就暂停 |
| `seek` | 进度条拖动 | 写 `currentTime`，同步时间文本 |
| `changeVolume` | 竖向音量条 | 写音量；调到非零时自动取消静音 |
| `toggleMute` | 喇叭键、`M` 键 | 翻转静音位 |
| `handlePause` | `pause` / `ended` | 记成未播放（只管播放图标；控制栏的显隐另有自己的计时，不因暂停常驻） |
| `handlePlaying` | `playing` | 记成在播、清掉缓冲转圈 |

## 事件处理

`handleCanPlay` / `handleError` / `handleLoadedData` / `handleLoadedMetadata` /
`handlePause` / `handlePlaying` / `handleTimeUpdate` / `handleVolumeChange` / `handleWaiting`
逐个对齐 `<video>` 同名事件，把元数据、当前时间、音量、播放 / 缓冲状态写回调用方给的 setter；
`loadedmetadata` 同时把画面宽高比交回 `onAspect`。

## 边界

- hook 不持有播放器 state：所有状态留在 `FreeVideo`，它只提供动作与事件处理。
- 元素不存在时动作直接返回，不报错；播放失败（编码不支持）由 `error` 事件接管，
  不在这里弹错。
