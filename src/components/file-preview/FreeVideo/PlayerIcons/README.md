# 播放器图标（`PlayerIcons/`）

`FreeVideo` 控制栏与视频弹窗控制栏专用的自绘 SVG 图标。图标只画形状，**颜色一律走
`currentColor`**（由按钮自身文字色决定），不在 SVG 里写死颜色。

## 为什么自绘

- B 站风格的实心播放 / 暂停 / 翻篇三角，与 `@tabler/icons-react` 的描边口径不一致；
- 网页全屏（框体铺满视口）与整屏全屏（浏览器 Fullscreen API）是两件事，图标必须分开：
  网页全屏是「小矩形 + 四角对角箭头」，整屏全屏才是两条大对角箭头。

## 清单

| 图标 | 用途 |
| --- | --- |
| `PlayerPlayIcon` | 播放：实心三角 |
| `PlayerPauseIcon` | 暂停：两根圆角竖条 |
| `PlayerStepBackwardIcon` | 上一条 / 后退：竖条 + 左三角 |
| `PlayerStepForwardIcon` | 下一条 / 前进：右三角 + 竖条 |
| `PlayerVolumeIcon` | 喇叭三态：`off` / `low` / `high` |
| `ViewportFullscreenIcon` | 网页全屏 / 退出网页全屏，`active` 切态 |

## 约束

- 入参统一 `PlayerIconProps`（`size` / `stroke`）；需要额外状态（音量档、激活态）就在各自
  组件的 props 里加，不动共同入参。
- 视口固定 `24` 网格；填充型图标用 `fill="currentColor"`，描边型走 `stroke="currentColor"`。
- 新增播放器图标先看 `@tabler` 是否已有同口径形状；没有现成 B 站风格的才在这里自绘。
