# UI 组件：先用组件库，再 FreeXxx，最后业务组件

**能用组件库（Mantine）的都一律用组件库，不自己手写一套。** 原生标签只在组件库没有对应能力、
或只是纯语义容器（`<section>`、`<li>`）时出现，每一处都要能当场说出理由。

## 场景 → 用哪个

新写任何 UI 先在这张表里找，找不到再看下面三层判据；**表里有的一律不许手写原生标签**。

| 场景 | 用什么 |
| --- | --- |
| 普通按钮（主次操作 / 提交） | `Button`（`variant` 区分主次，不自己写配色） |
| 纯图标按钮 | `FreeIconAction`（尺寸档 / 语气 / tooltip 都在它里面，别直连 `ActionIcon` + `Tooltip`，也别用 `UnstyledButton` 当图标位） |
| 长得像文字、或整行 / 整块可点的入口 | `UnstyledButton` |
| 表格 | `FreeTable`（业务再包一层，见下文） |
| 阅读类弹窗（文档预览 / 条目详情） | `FreeModal`（业务弹窗基于它封装，见下文） |
| 普通弹窗（说明 / 短表单 / 列表） | `FreeModal` 传 `height="auto"`（高度随内容、正文自己滚） |
| 二次确认（删除 / 覆盖等不可逆操作） | `ConfirmModal`（基于 `FreeModal` 的通用业务组件：说明块 + 可选额外内容 + 取消 / 确认） |
| 任何 Markdown / 文档预览 | `MarkdownPreviewModal`，不自己接渲染器（行为见 `src/components/modals/MarkdownPreviewModal/README.md`） |

**弹窗只有一扇壳**：`Modal` **只允许**出现在 `src/components/modals/FreeModal` 内部，页面 / 业务组件
一律 `@/components/modals/FreeModal`（二次确认再基于它封 `ConfirmModal`），不 import Mantine `Modal`、
也不 import `Modal.Root` 自己拼 header。`scripts/check-structure.mjs` 会扫这一条，命中即 lint 失败。
| 单行输入 | `TextInput` |
| 搜索框（左搜索图标 + 一键清空） | `FreeSearchInput` |
| 多行输入（普通表单） | `Textarea` |
| 下拉单选 / 多选 | `Select` / `MultiSelect` |
| 弹层面板里的字段（标题 + 下拉 + 一行口径说明） | `FreeSelectField` |
| 弹层面板底部（一句边界说明 + 重置） | `FreePanelFooter` |
| 日期选择 | `@mantine/dates` 的 `DatePicker`（内联日历）/ `DatePickerInput`（带弹层的日期输入）；全站日历口径（中文、周一为第一天）由 `src/main.tsx` 的 `DatesProvider` 统一给，不要自己拼日历或改用原生 `type="date"` |
| 分段切换（视图模式、日志类别） | `SegmentedControl` |
| 悬停 / 聚焦提示 | `Tooltip`（截断后的完整内容走 `FreeTruncatedText`）；**列表里成百上千个条目不要给每条常驻一个 `Tooltip`**，用 `@/hooks/useHoverIntent` 在被指到时才挂一个（`target` 指向被指的节点，不替换它），`FreeTruncatedText`、`FreeIconAction` 与 `CopyIconButton` 已内置这套做法 |
| 加载中 | `Loader`（占位骨架 `Skeleton`） |
| 一次性提示 | `notifications.show`（不自己造 toast） |
| 折叠 / 展开 | `Collapse`、`Accordion` |
| 布局排布 | `Stack`、`Group`、`Box`、`AppShell` 等布局组件，不堆自定义 flex 容器 |
| 徽标 / 状态标记 | `Badge` |
| 进度 | `Progress`、`RingProgress` |

## 三层：组件库 → Free 层 → 业务组件

| 层 | 判据（一遍问下来只落一层） | 落点 |
| --- | --- | --- |
| 组件库 | 这个品类还没有 Free 层，也没有「全站只允许一种形态」的口径 | 就地直接用 Mantine |
| `FreeXxx`（项目标准层） | 这一类对象**全站只允许一种形态 / 一套交互**，业务不许越过它直连底层 | `src/components/<分类>/FreeXxx/` |
| 业务组件 | 有业务语义（特殊列、特殊交互、特殊数据形态），但所属品类已有 Free 层 | `src/pages/<Page>/<Name>/`，基于 Free 层加增量 |

- **`Free` 标的是「唯一入口」，不是「包了组件库」**：`FreeTable` 底下是 Mantine `Table`，
  `FreeVideo` / `FreePdf` 底下可能是第三方库，`FreeTruncatedText` 底下是自研逻辑；
  前缀承诺的是「这类东西全站只有这一个入口」，不承诺「从名字看出包的是谁」。
- **业务组件不许越过 Free 层**：品类已有 Free 层时，业务侧再直接 import 底层（`Table` / `Modal` /
  播放器 / 自己写截断逻辑）就是缺陷——**只有一处用也不例外**；缺 props / 插槽就先给 Free 层加，
  不在业务里另起一套口径。
- **「有没有第二处」不是判据**：判据是「同一类对象是否只允许一种形态」。一处用也走 Free 层；
  反过来，只出现在一页、且不构成某类对象唯一形态的东西留在页面，别上提。
- **`FreeXxx` 必须真的锁住东西**（尺寸档、边框、表头、间距、键位、加载 / 错误态这类默认外观与
  默认行为）。说不清锁什么的，说明它只是组件库的别名，先别建——**不提前造薄壳**指的是这一条，
  不是「等第二处」。
- **场景限定不是例外**：只服务弹层面板的 `FreeSelectField`、只服务面板底部的 `FreePanelFooter`
  同样算 Free 层——它们在该场景内是唯一入口、且锁了外观。真正不挂 `Free` 的是「提供某个动作的
  现成实现、不构成某类对象唯一形态」的件（复制、筛选、图标弹层、二次确认、文档预览）。
- **不复制样式**：业务组件要改外观通过 props / 自己的 `index.scss` 加增量，不把 `FreeXxx`
  的规则抄一遍。
- **配置对象也算样式**：`{ label: { marginBottom: 4 } }` 这种「同一套外观的 params」出现第二处
  就上提成一份常量，别在每个调用方各复制一份——复制的那几份注释里往往还写着「同一份口径」，
  那正是该上提的信号。
- **不接第二套渲染栈**：已经该用 `MarkdownPreviewModal` 的场景，页面里再出现 `react-markdown`
  直连、或另起 `Modal` + 渲染器，等同于复制整套组件。

## 公共组件按类型分目录

`src/components` **不扁平铺**：公共组件先按类型进分类目录，再放组件目录——
`src/components/<分类>/<组件>/`（例：`src/components/modals/FreeModal/index.tsx`）。

| 分类目录 | 放什么 | 现有组件 |
| --- | --- | --- |
| `modals` | 弹窗外壳与弹窗类组件（阅读弹窗、二次确认） | `FreeModal`、`ConfirmModal`、`MarkdownPreviewModal` |
| `buttons` | 按钮、图标按钮、按钮触发的弹层外壳 | `FreeIconAction`、`CopyIconButton`、`FilterButton`、`IconPopoverButton` |
| `tables` | 表格基线 | `FreeTable` |
| `fields` | 字段 / 输入控件组 | `FreeSelectField`、`FreeSearchInput` |
| `panels` | 面板级排布件（底栏、面板内布局） | `FreePanelFooter` |
| `texts` | 文本展示与截断 | `FreeTruncatedText` |
| `feedback` | 加载、空态、提示这类状态呈现 | `PageLoading` |

- **分类目录一律小写**（`@liangqingda/eslint-config` 1.8.0 起放行 `components` 下一层的分类名单，
  名单在 `config/web-naming-rules.js`；进入分类目录后组件目录仍是 `PascalCase`）；
  `scripts/check-structure.mjs` 再校验一次：`src/components` 下只允许上表这七个分类目录，
  分类目录下只允许 `PascalCase` 组件目录且必须有 `index.tsx`。
- **一个组件只进一个分类**：先看它包的是哪个组件库根组件（`Modal` → `modals`、`Button` / `ActionIcon`
  → `buttons`、`Table` → `tables`），再看它回答的是哪类能力（文本截断 → `texts`，加载态 → `feedback`）。
- **不新建「杂项」目录**：放不进上表的先回到三层判据——说不清它锁什么，就别提公共，直接用组件库。
- **新增分类要走三处**：`scripts/check-structure.mjs` 的 `COMPONENT_GROUPS`、共享包
  `config/web-naming-rules.js` 的 `reactComponentGroupDirectoryNames`（需发版）、本文件的表；
  只改一处会出现「能建目录但 lint 拦」或「lint 放行但结构检查拦」。

## 命名与位置

| 类型 | 命名 | 位置 |
| --- | --- | --- |
| 项目标准层（某类对象的全站唯一入口） | `Free` 前缀 + 组件名（`FreeTable`、`FreeModal`、`FreeTruncatedText`…） | `src/components/<分类>/FreeXxx/` |
| 能力件（某个动作的现成实现，不构成某类对象的唯一形态） | 能力语义，**不挂 `Free`**（`CopyIconButton`、`FilterButton`、`ConfirmModal`…） | `src/components/<分类>/<Name>/` |
| 业务组件 | 业务语义（`NotesTable`、`TableEditor`…），不挂 `Free` | `src/pages/<Page>/<Name>/` |

**`Free` 前缀的唯一含义是「全站唯一入口」**，不是「包了某个组件库组件」。三条判据从上往下问：

1. 这类东西全站只允许一种形态 / 一套交互、业务不许越过它直连底层？是 → `FreeXxx`
   ——**不看底下包的是组件库还是自研**（表格、弹窗、输入、图标按钮、搜索框、视频播放、PDF 预览、
   文本截断都属于这一列）。
2. 它只是某个动作的现成实现，各场景按需要选用、并不构成某类对象的唯一形态？→ 不挂 `Free`
   （复制、筛选、图标弹层、二次确认、文档预览是一套能力，不是某类对象的唯一入口）。
3. props 里出现只有某一页才成立的语义（某页的筛选项、某页的文档结构）？→ 它不该在
   `src/components`，回 `src/pages/<Page>/`（判据见 `docs/reuse-boundaries.md` 的形态 ④）。

`FreeModal` 是 1 的典型例子：底下是 Mantine `Modal`，锁的是框体 / header / 正文区这套外观与键位；
阅读弹窗（`MarkdownPreviewModal`、`Review/RecordDetailModal`）用它默认的 `height="reading"`，
普通弹窗（快捷命令、最近操作）用它 `height="auto"`，二次确认则是**基于它的通用业务组件** `ConfirmModal`
（形态 2：单一能力、名字回答「干什么」），**谁都不再各自拼 `Modal`**。
`FreePanelFooter` 是 1 的边缘案例：它底下没有现成的 Mantine 组件，锁的是「面板底部布局 +
`Button` subtle 小号」这套外观，但**在该场景内它仍是唯一入口**，所以留 `Free`；同理，新写的
面板级排布件只要在该场景内不许另起一套长相，就按这一类走，否则当能力件或留页面。
把「全站只允许一种形态」推到品类级别看：`FreeInput` / `FreeVideo` / `FreePdf` 都属于这一列
（现有清单还没落地，见下节）。`PageLoading` 不在此列：它是页面 chunk 的**占位实现**（全屏铺满 +
居中 `Loader`），不构成「全站加载态的唯一入口」——普通加载仍直接 `Loader` / `Skeleton`。

目录结构与其它组件一致（见 `docs/code-splitting.md`）：`index.tsx` + `types.ts`（需要跨文件共享时），
要写自己的样式才加 `index.scss`，一个 `index.tsx` 只放一个组件。

## 现有 Free 层组件

| 组件 | 统一了什么 | 不管什么 |
| --- | --- | --- |
| `FreeTable` | Mantine `Table` + 项目外观：边框、表头、吸顶、行 hover；取分段统一走 `Thead` / `Tbody` / `Tr` / `Th` / `Td` | 不接分页、排序、虚拟滚动（那是业务组件的事） |
| `FreeSelectField` | 弹层面板里的字段组：标题 + 一档下拉 + 一行口径说明；尺寸档、字段间距、下拉不进门户 | 选项、当前值、说明文案、编解码、选中后的状态 |
| `FreePanelFooter` | 弹层面板底部一行：左侧边界说明 + 右侧「重置」（组件库 `Button` subtle 小号） | 说明文案、置灰口径、重置动作 |
| `FreeModal` | 弹窗外壳（唯一一扇）：框体与遮罩、紧凑 header（顺序为翻页 → 标题 → 第一组操作 → 全屏 → 末尾位 → 第二组操作）、全屏开关按钮与整套键位（空格 / 翻篇 / `F` / `C` 复制 / `Delete` 删除）；两种高度模式：`reading`（固定 `82dvh`）/ `auto`（随内容、上限 `88dvh`、正文自己滚）；全屏偏好走它的 `useModalFullscreen(storageKey)` | 标题文案、翻页数据、各组按钮的组件与能力（复制什么、删除怎么确认）、正文内容与滚动方式 |
| `FreeTruncatedText` | 单行文本的截断口径：放不下才省略、**只有被截断且被指到时**才弹 tip；量宽与 tip 创建都推迟到被指到那一刻 | 多行省略、tip 内容定制（tip 恒为原文）、业务字号与颜色 |
| `FreeIconAction` | 图标按钮的形状与档位：`subtle` 变体、`xs` / `sm` / `lg` 三档尺寸、`normal` / `accent` / `danger` 三档语气（只改颜色）、tooltip 与 aria-label 同句且**被指到时才挂**、`tooltipLabel` 承载变化中的文案（如「已复制」） | 图标本身与像素尺寸、点击后做什么、是否 `stopPropagation`；`layouts/Header` 品牌区那颗切换按钮不在此列（26px 与 `--app-ink-soft` 色调，属全局品牌视觉） |
| `FreeSearchInput` | 搜索框口径：`size="xs"` + 左侧搜索图标 + 值非空才出现的清空按钮（点完清空并**把焦点留在输入框**）；`autoFocus` / 标题 / 说明 / 面板字段间距按需传入 | 值、占位文案、回车与快捷键行为（`onKeyDown` 由调用方给） |

**规划中、尚未落地**：`FreeInput`（普通表单输入框的尺寸档与标签 / 错误提示位；搜索框已由
`FreeSearchInput` 收口）、`FreeVideo`（全站唯一播放器）、`FreePdf`（全站唯一 PDF 预览）。
判据成立但组件还没建：等真需要统一时再建，**建之前不许在业务里各自起一套口径**（那正是要上提的信号）。

`FreeSelectField` / `FreePanelFooter` / `FreeModal` / `FreeTruncatedText` / `FreeIconAction` /
`FreeSearchInput` 的契约（props、锁定项的取值理由、坑）写在各自目录的 `README.md`——判据：只有改它的人
才需要读 → 跟代码走。`FreeTable` 的约定就在本文件（它是样式基线的示例）：props 透传 Mantine `TableProps`，
`compact` 只收紧内边距。
单元格默认 `vertical-align: top`（编辑器那类多行内容要贴顶）；**单行内容 + 徽标 / 图标按钮的
列表表格**在自己页面样式里加 `.row td { vertical-align: middle }`——行高被最高的图标按钮撑起来，
贴顶会让文字明显偏上、行底留一截空白；操作列的图标按钮用 `th/td` 的 `text-align` 居中
（`margin: auto` 在表格单元格里对 `inline-flex` 的 `ActionIcon` 不生效）。

## 基础组件锁的是「外观 + 行为」

`FreeXxx` 不只是包样式：这个组件的 UI 定义里还包括它的**默认交互**——怎么开合、`Esc` / 空格怎么退出、
翻篇与全屏这类全局键位、初始焦点落在哪。判据只有一条：**同一时刻只能有一套**。

- 同类交互第二次出现在别的业务弹窗 / 页面 → 下沉到 `FreeXxx`（交互逻辑放它目录下的 `hooks/`），
  同时删掉上层那一份监听，绝不两边各写一遍；
- **给已有弹窗新增 header 操作也按这条判**：先问「另一扇弹窗有没有这个操作、它是哪个键」——
  有就一次上提（键位、通知与 tooltip 键位标注一起搬），不要只在当前这一处补按钮，
  否则用户看到的就是「一边能用、另一边不能用」；
- 业务组件只传数据与插槽（`nav` / `headerActions` / `onClose` …），自己不 `addEventListener`；
- 键位与放行口径（⌘ / Ctrl / Alt 放行、输入中不抢字符、按住连发不算）只写一份，示例见
  `FreeModal/hooks/useModalShortcuts`，业务侧的整组开关走 `shortcutsEnabled` 这类中性 prop。

反面教材（真实发生过，已改正）：md 预览曾把 `[` `]`、`←` `→`、`F` 全屏、`C` 复制与 `Delete` 删除
写在自己的业务 `hooks/` 里，记录详情弹窗复用同一个外壳时这些键位全都不在——用户感知就是
「笔记页能用、这边不能用」。结论：读 / 写类能力（复制、删除）如果两扇阅读弹窗都要，键位与通知
一并收进 `FreeModal`，业务侧只传「复制哪段文本、删除时打开哪个确认」这两个中性参数。

**这套「哪些提公共、提到哪一层」的判据不在本文件**，见 `docs/reuse-boundaries.md`：
本文件管「UI 形态怎么选」，那份管「UI 与逻辑各自该不该提公共」。

## 例外：编辑器表层的输入控件

只有 `BlockEditor` 这类**编辑器表层**允许出现原生 `<input>` / `<textarea>`：单元格输入框、
块源码文本框要贴着格子排、字号与行高跟着编辑器走，而组件库的 `TextInput` / `Textarea` 会套一层
root 容器并带上自己的高度 / 内边距 / 边框体系，全部覆盖反而更难对齐。放开的前提：

- 必须在组件里写一行注释说明理由（写不清的就是「瞎写」）；
- 只限编辑器表层，不扩散到普通表单——表单、设置项一律用 `TextInput` / `Select` 等，搜索框走
  `FreeSearchInput`。

## 同族组件：封了壳就只走壳

`Modal` 是最容易漏的一个，规则对**所有** `FreeXxx` 同样成立：既然已经封了 `FreeTable` /
`FreeSelectField` / `FreePanelFooter`，业务侧就只传数据与插槽，不再 import 底层的
Mantine `Table` / `Select` / 自己拼一套底栏——两套外观迟早会漂，而且改基线时要改两处。

- 已封壳的场景里出现底层组件 → 算缺陷，改成壳 + 缺 props 就先给壳加插槽；
- 属于「某类对象全站只允许一种形态」但还没封 → 按上文三层判据封 `FreeXxx`
  （一处用也封；连同键位、开合这类默认行为一起收）；
- 不属于上述两类（单处用、也不构成某类对象的唯一形态）→ 继续直接用组件库，不造薄壳。

## 自检

```bash
# 弹窗只能出现在两扇壳里（check-structure 已拦，这里是自查用）
grep -rn "Modal" --include="*.tsx" src | grep "from '@mantine/core'"

grep -rn "<table\|<button\|<input\|<select" --include="*.tsx" src
```

不是要求零命中，而是**每一处命中都要说得清**：组件库没有对应能力，或只是纯语义容器。
说不清的，改成组件库组件；同类形态全站只该有一套的，封 `FreeXxx`；有业务特殊能力的，
基于 `FreeXxx` 封业务组件。
