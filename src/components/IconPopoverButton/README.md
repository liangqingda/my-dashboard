# 带弹层的图标按钮（`IconPopoverButton`）

图标按钮 + 就近弹出的一块面板。**只负责外观、定位与开合**：面板里放什么、什么时候收起、
条件存在哪，都归调用方。现有两个使用者：`FilterButton`（筛选）与预览弹窗的 `ProseFontControl`（正文字号）。

| 项 | 约定 |
| --- | --- |
| 位置 | 图标下方就近弹出：`position="bottom-end"`、`offset={8}`、带箭头、`withinPortal` |
| 尺寸 | 与标题栏图标同档：`ActionIcon size="sm" variant="subtle"`；图标尺寸由调用方给 |
| props | `icon`（图标节点）、`label`（`aria-label` 与默认 tooltip 文案）、`hint`（覆盖 tooltip，需要写进当前状态时传）、`active`（生效时常态用主色，且没传 `hint` 时 tooltip 追加「（已生效）」）、`opened` / `onChange`、`width`（默认 272）、`children`（弹层内容，内边距 12px） |
| 不负责 | 开合时机（换篇、切视图、关弹窗时收起由调用方管）、Esc 归属、持久化 |

## 注意

- 弹层内部如果用 `Select`，必须显式 `comboboxProps={{ withinPortal: false }}`：
  下拉再套一层 Portal 会被弹层的「点在外面就收」判成外部点击，一点选项面板就没了。
- 面板里的日历控件（`@mantine/dates` 的 `DatePicker`）是内联渲染、不带自己的弹层，
  同样是为了避开这层嵌套判定。
- 同一屏开多块面板时，互斥（同时只开一块）由调用方维护，本组件不管。
