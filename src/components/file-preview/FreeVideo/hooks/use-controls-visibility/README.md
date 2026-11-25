# 控制栏显隐（`useControlsVisibility`）

`FreeVideo` 的控制栏什么时候显、什么时候收：暂停 / 播完常驻，播放中指针静止 `delay`
就淡出下移，指针一停在控制栏上就始终显示，指针一动立刻浮出并重新计时。

## 为什么单独一个 hook

「是否在播」与「指针是否停在控制栏上」这两个判断要放在 `ref` 里——收起计时器的回调
读不到渲染期的 state。这份计时器只在这里管：播放器自己不挂 `setTimeout`，也别处不要再挂
第二份同样的计时，否则两套计时会互相把对方收掉。

## 动作

| 动作 | 用在哪 | 行为 |
| --- | --- | --- |
| `reveal` | 播放器 `onPointerMove` | 亮出来，并重新排一次收起 |
| `hold` | 暂停 / 播完 | 常驻，不再计时 |
| `resume` | 开播 | 先留着，指针一停再收 |
| `leavePlayer` | 播放器 `onPointerLeave` | 按当前状态排一次收起 |
| `enterControls` | 控制栏 `onPointerEnter` | 始终显示，清掉计时 |
| `leaveControls` | 控制栏 `onPointerLeave` | 按当前状态排一次收起 |

## 边界

- 收起只是「淡出 + 下移 + `pointer-events: none`」，元素**仍在流里占位**，
  画面尺寸不跟着跳；这一层由调用方的样式保证，hook 只给 `visible`。
- 卸载时清掉挂着的计时器，不会在组件消失后再 `setState`。
