# 筛选图标按钮（`FilterButton`）

带弹层的筛选图标按钮，两处在用：预览弹窗 header 的「筛选正文」与英语页 header 的「筛选笔记」。
**它只是按钮 + 弹层外壳**，筛什么、面板长什么样、条件存在哪都由调用方决定。

| 项 | 约定 |
| --- | --- |
| 位置 | 图标下方就近弹出，`position="bottom-end"`、`offset={8}`、带箭头、默认宽 272 |
| props | `label`（tooltip / aria-label 文案，生效时自动加「（已生效）」）、`active`（生效时图标换主色）、`opened` / `onChange`、`width`（放日历等宽控件时放宽） |
| 内容 | `children` 直接塞进 `Popover.Dropdown`（内边距 12px，不预设控件样式） |
| 不负责 | 开合时机（换篇、切视图、关弹窗时收起由调用方管）、Esc 归属、条件持久化 |

## 注意

- 弹层内部如果用 `Select`，必须显式 `comboboxProps={{ withinPortal: false }}`：
  下拉再套一层 Portal 会被弹层的「点在外面就收」判成外部点击，一点选项面板就没了。
- 弹层内容里的日历控件（`@mantine/dates` 的 `DatePicker`）是内联渲染、不带自己的弹层，
  同样是为了避开这层嵌套判定。
