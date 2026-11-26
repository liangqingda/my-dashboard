# 控制栏显隐（`useControlsVisibility`）

`FreeVideo` 的控制栏什么时候显、什么时候收：**与浮层 header 同一套节奏**——打开即收起态，
指针一动就浮出，静止 `delay` 就淡出下移；指针停在控制栏上时始终显示，离开后才重新计时。
**播放状态不参与**：暂停 / 播完也照常自动收起（不再常驻），视频预览里 header 与它一起浮出、一起收掉。

`useControlsVisibility(delay, { suspended })`：`suspended` 为真时（设置 / 选集这类从控制栏
长出来的弹层开着）控制栏恒为可见、不排收起——面板是 portal，指针移进去就离开了播放器，
不按住的话就会「面板还开着、它的按钮先淡下去了」。

## 为什么单独一个 hook

「指针是否停在控制栏上」这个判断要放在 `ref` 里——收起计时器的回调读不到渲染期的 state。
这份计时器只在这里管：播放器自己不挂 `setTimeout`，也别处不要再挂第二份同样的计时，
否则两套计时会互相把对方收掉。

## 动作

| 动作 | 用在哪 | 行为 |
| --- | --- | --- |
| `reveal` | 播放器 `onPointerMove` | 亮出来，并重新排一次收起 |
| `leavePlayer` | 播放器 `onPointerLeave` | 指针离开播放器，排一次收起 |
| `enterControls` | 控制栏 `onPointerEnter` | 始终显示，清掉计时 |
| `leaveControls` | 控制栏 `onPointerLeave` | 重新排一次收起 |

## 边界

- 收起只是「淡出 + 下移 + `pointer-events: none`」，元素**仍在流里占位**，
  画面尺寸不跟着跳；这一层由调用方的样式保证，hook 只给 `visible`。
- 暂停 / 播完不额外顶出控制栏：想操作就动一下指针，与浮层 header 同一个口径。
- 上层弹层开着（`suspended`）期间不收起，关掉后按指针状态重新计时。
- 卸载时清掉挂着的计时器，不会在组件消失后再 `setState`。
