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
| 阅读类弹窗（文档预览 / 条目详情） | `FreeModal`（业务弹窗基于它封装，见下文） |
| 普通弹窗（说明 / 短表单 / 列表） | `FreeModal` 传 `height="auto"`（高度随内容、正文自己滚） |
| 二次确认（删除 / 覆盖等不可逆操作） | `ConfirmModal`（基于 `FreeModal` 的通用业务组件：说明块 + 可选额外内容 + 取消 / 确认） |
| 任何 Markdown / 文档预览 | `MarkdownPreviewModal`，不自己接渲染器（行为见 `src/components/MarkdownPreviewModal/README.md`） |

**弹窗只有一扇壳**：`Modal` **只允许**出现在 `src/components/FreeModal` 内部，页面 / 业务组件
一律 `@/components/FreeModal`（二次确认再基于它封 `ConfirmModal`），不 import Mantine `Modal`、
也不 import `Modal.Root` 自己拼 header。`scripts/check-structure.mjs` 会扫这一条，命中即 lint 失败。
| 单行输入 | `TextInput` |
| 多行输入（普通表单） | `Textarea` |
| 下拉单选 / 多选 | `Select` / `MultiSelect` |
| 弹层面板里的字段（标题 + 下拉 + 一行口径说明） | `FreeSelectField` |
| 弹层面板底部（一句边界说明 + 重置） | `FreePanelFooter` |
| 日期选择 | `@mantine/dates` 的 `DatePicker`（内联日历）/ `DatePickerInput`（带弹层的日期输入）；全站日历口径（中文、周一为第一天）由 `src/main.tsx` 的 `DatesProvider` 统一给，不要自己拼日历或改用原生 `type="date"` |
| 分段切换（视图模式、日志类别） | `SegmentedControl` |
| 悬停 / 聚焦提示 | `Tooltip`（截断后的完整内容走 `TruncatedText`）；**列表里成百上千个条目不要给每条常驻一个 `Tooltip`**，用 `@/hooks/useHoverIntent` 在被指到时才挂一个（`target` 指向被指的节点，不替换它），`TruncatedText` 与 `CopyIconButton` 已内置这套做法 |
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
- **配置对象也算样式**：`{ label: { marginBottom: 4 } }` 这种「同一套外观的 params」出现第二处
  就上提成一份常量，别在每个调用方各复制一份——复制的那几份注释里往往还写着「同一份口径」，
  那正是该上提的信号。
- **不接第二套渲染栈**：已经该用 `MarkdownPreviewModal` 的场景，页面里再出现 `react-markdown`
  直连、或另起 `Modal` + 渲染器，等同于复制整套组件。

## 命名与位置

| 类型 | 命名 | 位置 |
| --- | --- | --- |
| 基础 UI 基建（包组件库、上项目基线） | `Free` 前缀 + 组件名（`FreeTable`、`FreeSelectField`…） | `src/components/FreeXxx/` |
| 通用能力件（单一职责、不属于某个页面） | 能力语义，**不挂 `Free`**（`CopyIconButton`、`TruncatedText`…） | `src/components/<Name>/` |
| 业务组件 | 业务语义（`NotesTable`、`TableEditor`…），不挂 `Free` | `src/pages/<Page>/<Name>/` |

**`Free` 前缀只给「组件库某个组件 + 项目基线」的壳**：名字里能看出包的是 Table / Select / Modal，
它锁的是这个组件的尺寸档、边框、表头、间距这类外观。三条判据从上往下问：

1. 它是不是把某个组件库组件包成「项目默认长相 / 默认行为」？是 → `FreeXxx`。
2. 它是不是一个单一能力的通用件，名字回答「干什么」而不是「包的谁」？是 → 不挂 `Free`
   （复制、截断提示、图标弹层、文档预览这些是一套能力，不是一套外观）。
3. props 里出现只有某一页才成立的语义（某页的筛选项、某页的文档结构）？→ 它不该在
   `src/components`，回 `src/pages/<Page>/`（判据见 `docs/reuse-boundaries.md` 的形态 ④）。

`FreeModal` 是 1 的典型例子：包的就是 Mantine `Modal`，锁的是框体 / header / 正文区这套外观与键位；
阅读弹窗（`MarkdownPreviewModal`、`Review/RecordDetailModal`）用它默认的 `height="reading"`，
普通弹窗（快捷命令、最近操作）用它 `height="auto"`，二次确认则是**基于它的通用业务组件** `ConfirmModal`
（形态 2：单一能力、名字回答「干什么」），**谁都不再各自拼 `Modal`**。
`FreePanelFooter` 是 1 的边缘案例，归类按「锁定了什么外观」定：它锁的是「面板底部布局 +
`Button` subtle 小号」这套外观（不是某个 Mantine 组件），所以留 `Free`；同理，新写的面板级排布件
只要**跨页面复用同一套长相**就按这一类走，否则当能力件或留页面。

目录结构与其它组件一致（见 `docs/code-splitting.md`）：`index.tsx` + `index.scss` +
`types.ts`，一个 `index.tsx` 只放一个组件。

## 现有的 Free 组件

| 组件 | 统一了什么 | 不管什么 |
| --- | --- | --- |
| `FreeTable` | Mantine `Table` + 项目外观：边框、表头、吸顶、行 hover；取分段统一走 `Thead` / `Tbody` / `Tr` / `Th` / `Td` | 不接分页、排序、虚拟滚动（那是业务组件的事） |
| `FreeSelectField` | 弹层面板里的字段组：标题 + 一档下拉 + 一行口径说明；尺寸档、字段间距、下拉不进门户 | 选项、当前值、说明文案、编解码、选中后的状态 |
| `FreePanelFooter` | 弹层面板底部一行：左侧边界说明 + 右侧「重置」（组件库 `Button` subtle 小号） | 说明文案、置灰口径、重置动作 |
| `FreeModal` | 弹窗外壳（唯一一扇）：框体与遮罩、紧凑 header（顺序为翻页 → 标题 → 第一组操作 → 全屏 → 末尾位 → 第二组操作）、全屏开关按钮与整套键位；两种高度模式：`reading`（固定 `82dvh`）/ `auto`（随内容、上限 `88dvh`、正文自己滚）；全屏偏好走它的 `useModalFullscreen(storageKey)` | 标题文案、翻页数据、各组按钮的能力、正文内容与滚动方式 |

`FreeSelectField` / `FreePanelFooter` / `FreeModal` 的契约（props、锁定项的取值理由、坑）写在各自目录的
`README.md`——判据：只有改它的人才需要读 → 跟代码走。`FreeTable` 的约定就在本文件（它是
样式基线的示例）：props 透传 Mantine `TableProps`，`compact` 只收紧内边距。
单元格默认 `vertical-align: top`（编辑器那类多行内容要贴顶）；**单行内容 + 徽标 / 图标按钮的
列表表格**在自己页面样式里加 `.row td { vertical-align: middle }`——行高被最高的图标按钮撑起来，
贴顶会让文字明显偏上、行底留一截空白；操作列的图标按钮用 `th/td` 的 `text-align` 居中
（`margin: auto` 在表格单元格里对 `inline-flex` 的 `ActionIcon` 不生效）。

## 基础组件锁的是「外观 + 行为」

`FreeXxx` 不只是包样式：这个组件的 UI 定义里还包括它的**默认交互**——怎么开合、`Esc` / 空格怎么退出、
翻篇与全屏这类全局键位、初始焦点落在哪。判据只有一条：**同一时刻只能有一套**。

- 同类交互第二次出现在别的业务弹窗 / 页面 → 下沉到 `FreeXxx`（交互逻辑放它目录下的 `hooks/`），
  同时删掉上层那一份监听，绝不两边各写一遍；
- 业务组件只传数据与插槽（`nav` / `headerActions` / `onClose` …），自己不 `addEventListener`；
- 键位与放行口径（⌘ / Ctrl / Alt 放行、输入中不抢字符、按住连发不算）只写一份，示例见
  `FreeModal/hooks/useModalShortcuts`，业务侧的整组开关走 `shortcutsEnabled` 这类中性 prop。

反例（真实发生过）：md 预览把 `[` `]`、`←` `→`、`F` 全屏写在自己的业务 `hooks/` 里，后来记录详情弹窗
复用同一个基础外壳却没有键位——用户感知就是「笔记页能用、这边不能用」。这类问题在封壳的那一次
就该判掉，不要等第二个使用方来暴露。

**这套「哪些提公共、提到哪一层」的判据不在本文件**，见 `docs/reuse-boundaries.md`：
本文件管「UI 形态怎么选」，那份管「UI 与逻辑各自该不该提公共」。

## 例外：编辑器表层的输入控件

只有 `BlockEditor` 这类**编辑器表层**允许出现原生 `<input>` / `<textarea>`：单元格输入框、
块源码文本框要贴着格子排、字号与行高跟着编辑器走，而组件库的 `TextInput` / `Textarea` 会套一层
root 容器并带上自己的高度 / 内边距 / 边框体系，全部覆盖反而更难对齐。放开的前提：

- 必须在组件里写一行注释说明理由（写不清的就是「瞎写」）；
- 只限编辑器表层，不扩散到普通表单——表单、搜索框、设置项一律用 `TextInput` / `Select` 等。

## 同族组件：封了壳就只走壳

`Modal` 是最容易漏的一个，规则对**所有** `FreeXxx` 同样成立：既然已经封了 `FreeTable` /
`FreeSelectField` / `FreePanelFooter`，业务侧就只传数据与插槽，不再 import 底层的
Mantine `Table` / `Select` / 自己拼一套底栏——两套外观迟早会漂，而且改基线时要改两处。

- 已封壳的场景里出现底层组件 → 算缺陷，改成壳 + 缺 props 就先给壳加插槽；
- 还没封、但**第二处**要同款外观 / 行为 → 按上文三档判据封 `FreeXxx`（连同键位、开合这类默认行为一起收）；
- 只有一处用、没有第二处同款 → 继续直接用组件库，不造薄壳。

## 自检

```bash
# 弹窗只能出现在两扇壳里（check-structure 已拦，这里是自查用）
grep -rn "Modal" --include="*.tsx" src | grep "from '@mantine/core'"

grep -rn "<table\|<button\|<input\|<select" --include="*.tsx" src
```

不是要求零命中，而是**每一处命中都要说得清**：组件库没有对应能力，或只是纯语义容器。
说不清的，改成组件库组件；第二处要同款外观的，封 `FreeXxx`；有业务特殊能力的，
基于 `FreeXxx` 封业务组件。
