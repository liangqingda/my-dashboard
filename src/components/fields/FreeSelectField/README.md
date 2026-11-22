# 弹层面板里的字段组（`FreeSelectField`）

标题 + 一档下拉 + 下面一行口径说明，给弹层面板里的字段组用。**只统一外观与下拉的
默认行为**，选项、当前值、说明文案、值怎么编解码、选中后改什么状态都由调用方给。

| 项 | 约定 |
| --- | --- |
| 结构 | `Stack gap={4}`：`Select`（`size="xs"`、`allowDeselect={false}`）+ 可选的一行 `Text c="dimmed" size="xs"` |
| 字段间距 | 标题下 4px，取 `IconPopoverButton/constants.ts` 的 `PANEL_FIELD_STYLES`，不在本组件里另抄一份 |
| 下拉门户 | 固定 `comboboxProps={{ withinPortal: false }}`：面板本身已在弹层里，列表再套一层 Portal 会被判成「点在外面」，点选项面板就没了 |
| props | `label`、`data`（Mantine `SelectProps['data']`）、`value`、`onChange`（只回传档名，不会是 `null`）、`description`（不传则不占位） |
| 不负责 | 编码解码（调用方在 `onChange` 里自己 `codec.decode`）、筛选口径、持久化 |

## 什么时候用它

面板里出现「一档下拉 + 一句口径说明」就先用它；**只有一处用、且不像这套外观**时直接吃 Mantine
`Select`（见 `docs/reuse-boundaries.md` 的形态 ②）。下拉选项里只放档名，口径别塞进选项——
面板宽度只有 272px，塞进去会把下拉撑宽。
