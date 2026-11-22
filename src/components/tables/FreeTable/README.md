# 基础表格（`FreeTable`）

表格的唯一入口：`Mantine Table` + 项目外观（边框、表头、吸顶、行 hover）。**业务表格在它上面加增量**，
不自己写 `<table>` 或再 import 一份 Mantine `Table`——那样会长出第二套表头与行高。

| 项 | 约定 |
| --- | --- |
| 外观 | 列间无竖线，单元格只有下边线；表头小字号 + 字段色（`--app-ink-soft`）+ 强下边线（`--app-line-strong`） |
| 吸顶 | 默认开（`stickyHeader`）：表头用页面底色盖住滚上去的行，`z-index: 1`；页面自己没有滚动容器时表头跟页面一起滚 |
| 行 hover | 默认开，色值 `--app-surface-hover`；不可点的表格由调用方传 `highlightOnHover={false}` 关掉 |
| 数字列 | 金额 / 计数这类要等宽对齐的列传 `tabularNums`，不要自己在 th 上写字族 |
| 密排 | `compact`：编辑器那种网格用，只收紧内边距（2px 6px）并把垂直对齐改成居中，字号由所属编辑器自己定 |
| 分段组件 | `FreeTable.Thead / Tbody / Tr / Th / Td / Tfoot / Caption` 从本组件取，业务别 import Mantine 的那几个 |
| 透传 | 其余 props 全部透传给 Mantine `Table`，所以 `withColumnBorders`、`stickyHeader` 等按需覆盖 |

## 不归它管

- 分页、排序、虚拟滚动、选中状态（那是业务表格的事，见 `NotesTable`）；
- 列宽与单元格内容样式（业务在自己的 `index.scss` 里加增量）；
- 操作列的图标按钮：用 `th / td` 的 `text-align` 居中，不要给按钮加 margin。

## 注意

- 不要在业务里给 `td` 再写 `border-bottom`：行分隔线是这张表的口径，写第二份就会出现「有的表格有线、有的没有」。
- 单元格默认 `vertical-align: middle`：列表行的行高常被图标按钮 / 徽标撑起来，贴顶会让文字偏上、行底留白；只有真正多行、需要贴顶的单元格，才在业务样式里局部覆盖 `top`，别在业务里重复写 `middle`。
