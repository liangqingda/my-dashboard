# FreeTruncatedText

省略文本的**全站唯一截断入口**：放不下才省略，且只有**确实被截断、且当前被指到**时才弹 tip
展示完整内容。文本本来放得下就不弹提示，不给读者加噪音。

## 锁定了什么

| 项 | 口径 |
| --- | --- |
| 省略 | 默认单行尾部省略；`lines={2}` 截到两行；`ellipsis="middle"` 头部与尾部都保留、中间省略；更多行数不在它的范围 |
| tip 内容 | 恒为原文（`text`），不接受自定义节点 |
| tip 时机 | 被悬停 / 键盘聚焦 **且** 当场量出被截断，三者缺一不弹 |
| 测量时机 | end 档被指到的那一刻才量（`hooks/useIsTruncated`，含 1px 亚像素容差）：单行量宽、两行量高；middle 档必须在渲染时定好头尾拼法，只在挂载 / 文案变化后量一次；两档都不挂常驻 `ResizeObserver` |
| tip 挂载 | 用 `Tooltip` 的 `target` 指向文本节点、挂在旁边，不替换文本元素本身（焦点与鼠标状态留在原地） |
| 逐个条目成本 | 列表几百条也只付一次定位实例成本（见 `@/hooks/useHoverIntent`） |

## props

| prop | 类型 | 说明 |
| --- | --- | --- |
| `text` | `string` | 文本内容，也是 tip 内容 |
| `className` | `string?` | 只管字号 / 颜色 / 布局；**不要自己写 `overflow` / `text-overflow`** |
| `onClick` | `() => void?` | 传了就渲染成 `UnstyledButton`（可点条目），不传是 `span` |
| `disabled` | `boolean?` | 按钮不响应点击，且不弹 tip（编辑态这类场景） |
| `inline` | `boolean?` | 夹在一行文字里时用 `inline-block`；默认整块占满容器宽度 |
| `position` | `FloatingPosition?` | tip 方向，默认 `right`；贴边 / 被遮挡时改 `top` 等 |
| `lines` | `1 \| 2?` | 最多保留行数，默认 `1`；传 `2` 按两行截断并按高度判断截断 |
| `ellipsis` | `'end' \| 'middle'?` | 省略位置，默认 `end`（尾部省略）；`middle` 保留头尾、中间省略，适合扩展名 / 后缀重要的文件名 |

## 边界

- 需要**三行及以上**省略：不用本组件，要么业务自己控制行数，要么另立一个 Free 层组件。
- 中间省略按字符切分，含 astral 码位（部分 emoji）的文案可能切断代理对；当前条目场景不涉及。
- 只想给普通文本加提示、不涉及截断：直接用 `Tooltip`，别借它。
- 业务侧不要再手写 `white-space: nowrap` + 省略号 + `Tooltip` 的组合——那是在复制本组件。
