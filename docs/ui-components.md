# UI 组件：先用组件库，再 FreeXxx，最后业务组件

**能用组件库（Mantine）的都一律用组件库，不自己手写一套。** 原生标签只在组件库没有对应能力、
或只是纯语义容器（`<section>`、`<li>`）时出现，每一处都要能当场说出理由。

## 场景 → 用哪个

新写任何 UI 先在这张表里找，找不到再看下面三档判据；**表里有的一律不许手写原生标签**。

| 场景 | 用什么 |
| --- | --- |
| 普通按钮（主次操作 / 提交） | `Button`（`variant` 区分主次，不自己写配色） |
| 纯图标按钮 | `ActionIcon` + `Tooltip`（别用 `UnstyledButton` 当图标位） |
| 长得像文字、或整行 / 整块可点的入口 | `UnstyledButton` |
| 表格 | `FreeTable`（业务再包一层，见下文） |
| 弹窗 | `Modal`；任何 Markdown / 文档预览一律走 `MarkdownPreviewModal`（不自己接渲染器，行为见 `src/components/MarkdownPreviewModal/README.md`） |
| 单行输入 | `TextInput` |
| 多行输入（普通表单） | `Textarea` |
| 下拉单选 / 多选 | `Select` / `MultiSelect` |
| 分段切换（视图模式、日志类别） | `SegmentedControl` |
| 悬停 / 聚焦提示 | `Tooltip`（截断后的完整内容走 `TruncatedText`） |
| 加载中 | `Loader`（占位骨架 `Skeleton`） |
| 一次性提示 | `notifications.show`（不自己造 toast） |
| 折叠 / 展开 | `Collapse`、`Accordion` |
| 布局排布 | `Stack`、`Group`、`Box`、`AppShell` 等布局组件，不堆自定义 flex 容器 |
| 徽标 / 状态标记 | `Badge` |
| 进度 | `Progress`、`RingProgress` |

## 三档判据

| 情况 | 做法 | 放哪 |
| --- | --- | --- |
| 组件库已有等价组件（表格、按钮、输入框、弹窗、提示） | 直接用组件库组件 | 就地 |
| 同一个组件在**第二处**要同一套外观 / 行为 | 封装 `FreeXxx` 前端 UI 基建组件 | `src/components/FreeXxx/` |
| 业务表格 / 弹窗有特殊列、特殊交互、特殊数据形态 | 基于 `FreeXxx`（没有就基于公共组件 / 组件库）再封一层业务组件 | `src/pages/<Page>/<Name>/` |

- **不提前封装**：只在一处用、没有第二处要同款外观的，直接吃组件库，别造薄壳。
- **`FreeXxx` 必须真的承担统一外观 / 默认行为**（边框、表头、hover、间距、尺寸档位），
  否则它只是换个名字的别名，说明该直接用组件库组件。
- **业务组件不回头直连组件库**：已经封了 `FreeTable` 的场景，业务侧再直接 import
  Mantine `Table` 就会出现两套外观，也算违反约定。
- **不复制样式**：业务组件要改外观通过 props / 自己的 `index.scss` 加增量，不把 `FreeXxx`
  的规则抄一遍。
- **不接第二套渲染栈**：已经该用 `MarkdownPreviewModal` 的场景，页面里再出现 `react-markdown`
  直连、或另起 `Modal` + 渲染器，等同于复制整套组件。

## 命名与位置

| 类型 | 命名 | 位置 |
| --- | --- | --- |
| 基础 UI 基建 | `Free` 前缀 + 组件名（`FreeTable`、`FreeModal`…） | `src/components/FreeXxx/` |
| 业务组件 | 业务语义（`NotesTable`、`TableEditor`…），不挂 `Free` | `src/pages/<Page>/<Name>/` |

目录结构与其它组件一致（见 `docs/code-splitting.md`）：`index.tsx` + `index.scss` +
`types.ts`，一个 `index.tsx` 只放一个组件。

## FreeTable（示例，也是现有唯一的 Free 组件）

| 项 | 约定 |
| --- | --- |
| 包什么 | Mantine `Table` + 项目外观：`--app-line` 底边框、表头小字号字段色与 `--app-line-strong` 下边线、表头吸顶、行 hover `--app-surface-hover` |
| 取分段组件 | 统一用 `FreeTable.Thead` / `Tbody` / `Tr` / `Th` / `Td`，业务侧不再 import Mantine 的 `Table` |
| props | 透传 Mantine `TableProps`（`className`、`layout`、`stickyHeader`、`tabularNums` 等）；`compact` 只收紧内边距，给编辑器这类密排网格用 |
| 不做 | 不接分页、排序、虚拟滚动——那是业务组件的事（`NotesTable` 自己管 `onSort` 与 `aria-sort`） |

## 例外：编辑器表层的输入控件

只有 `BlockEditor` 这类**编辑器表层**允许出现原生 `<input>` / `<textarea>`：单元格输入框、
块源码文本框要贴着格子排、字号与行高跟着编辑器走，而组件库的 `TextInput` / `Textarea` 会套一层
root 容器并带上自己的高度 / 内边距 / 边框体系，全部覆盖反而更难对齐。放开的前提：

- 必须在组件里写一行注释说明理由（写不清的就是「瞎写」）；
- 只限编辑器表层，不扩散到普通表单——表单、搜索框、设置项一律用 `TextInput` / `Select` 等。

## 自检

```bash
grep -rn "<table\|<button\|<input\|<select" --include="*.tsx" src
```

不是要求零命中，而是**每一处命中都要说得清**：组件库没有对应能力，或只是纯语义容器。
说不清的，改成组件库组件；第二处要同款外观的，封 `FreeXxx`；有业务特殊能力的，
基于 `FreeXxx` 封业务组件。
