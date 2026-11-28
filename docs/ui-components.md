# UI 组件：先用组件库，再 FreeXxx，最后业务组件

**能用组件库（Mantine）的都一律用组件库，不自己手写一套。** 原生标签只在组件库没有对应能力、
或只是纯语义容器（`<section>`、`<li>`）时出现，每一处都要能当场说出理由。

通用分层判据（组件库优先、唯一入口壳、业务不越层、同一交互只落一处、不造薄壳）见
`best-react-code` 的《UI 分层与唯一入口》。本文件只保留本项目的 Mantine 选型、`FreeXxx` 命名、
分类目录与 `check-structure` 检查。

## 场景 → 用哪个

新写任何 UI 先在这张表里找，找不到再看下面三层判据；**表里有的一律不许手写原生标签**。

| 场景 | 用什么 |
| --- | --- |
| 普通按钮（主次操作 / 提交） | `Button`（`variant` 区分主次，不自己写配色） |
| 纯图标按钮 | `FreeIconAction`（尺寸档 / 语气 / tooltip 都在它里面，别直连 `ActionIcon` + `Tooltip`，也别用 `UnstyledButton` 当图标位） |
| 图标按钮 + 就近弹层 | `IconPopoverButton`（按钮本体是 `FreeIconAction`，别自己拼 `Popover` + `ActionIcon`） |
| 长得像文字、或整行 / 整块可点的入口 | `UnstyledButton` |
| 表格 | `FreeTable`（业务再包一层，见下文） |
| 阅读类弹窗（文档预览 / 条目详情） | `FreeModal`（业务弹窗基于它封装，见下文） |
| 普通弹窗（说明 / 短表单 / 列表） | `FreeModal` 传 `height="auto"`（高度随内容、正文自己滚） |
| 二次确认（删除 / 覆盖等不可逆操作） | `ConfirmModal`（基于 `FreeModal` 的通用业务组件：说明块 + 可选额外内容 + 取消 / 确认） |
| 任何 Markdown / 文档预览 | `MarkdownPreviewModal`（`FreeModal` + `FreeMarkdown`，不自己接渲染器；行为见 `src/components/modals/MarkdownPreviewModal/README.md`） |
| Markdown 渲染（不要弹窗外壳） | `FreeMarkdown`（全站唯一的渲染栈：`react-markdown` + gfm + raw；只管把文本渲染成节点，排版、目录、筛选归调用方） |
| 视频播放 | `FreeVideo`（全站唯一的播放器，不自己拼 `<video>` 控制栏；行为见 `src/components/file-preview/FreeVideo/README.md`） |
| 图片展示 / 缩放 | `FreeImage`（全站唯一的图片舞台：整图装下 + 加载 / 失败态 + 捏合缩放与平移；行为见 `src/components/file-preview/FreeImage/README.md`） |
| 图片框选（裁剪选框、标记选区） | `FreeImageSelection`（全站唯一的图片选框：叠在画面上，拖框平移 + 8 手柄改尺寸，只回传比例矩形，不裁剪 / 不写盘；盒子由 `FreeImage` 的 `overlay` 给；行为见 `src/components/file-preview/FreeImageSelection/README.md`） |
| 视频预览 | `VideoPreviewModal`（`FreeModal` + `FreeVideo`，B 站式控制栏 + 选集弹层；行为见 `src/components/modals/VideoPreviewModal/README.md`） |
| 图片预览 | `ImagePreviewModal`（`FreeModal` + `FreeImage` + `FreeImageSelection` + header 的图片列表弹层；裁剪的会话与写盘仍归弹窗；行为见 `src/components/modals/ImagePreviewModal/README.md`） |
| 单行输入（无搜索语义） | `FreeInput` |
| 搜索框（左搜索图标 + 一键清空） | `FreeSearchInput` |
| 多行输入（普通表单） | `Textarea` |
| 下拉单选 / 多选 | `Select` / `MultiSelect` |
| 弹层设置面板里的一组设置（浅底色分组 + 组标题） | `FreePanelGroup`（组内字段配 `FreePanelField`） |
| 弹层设置面板里的字段（标题 + 控件，可带当前值、可整行） | `FreePanelField` |
| 弹层面板里的字段（标题 + 下拉 + 一行口径说明） | `FreeSelectField` |
| 弹层面板底部（一句边界说明 + 重置） | `FreePanelFooter` |
| 日期选择 | `@mantine/dates` 的 `DatePicker`（内联日历）/ `DatePickerInput`（带弹层的日期输入）；全站日历口径（中文、周一为第一天）由 `src/main.tsx` 的 `DatesProvider` 统一给，不要自己拼日历或改用原生 `type="date"` |
| 分段切换（视图模式、日志类别） | `SegmentedControl` |
| 悬停 / 聚焦提示 | `Tooltip`（截断后的完整内容走 `FreeTruncatedText`）；**列表里成百上千个条目不要给每条常驻一个 `Tooltip`**，用 `@/hooks/useHoverIntent` 在被指到时才挂一个（`target` 指向被指的节点，不替换它），`FreeTruncatedText`、`FreeIconAction` 与 `CopyIconButton` 已内置这套做法。全站 `Tooltip` 默认多行、最大宽 `360px`（随视口收窄）、最大高 `42vh`（上限 `280px`），超出纵向滚动；长文案不要自己再撑宽 |
| 加载中 | `Loader`（占位骨架 `Skeleton`） |
| 一次性提示 | `notifications.show`（不自己造 toast） |
| 折叠 / 展开 | `Collapse`、`Accordion` |
| 布局排布 | `Stack`、`Group`、`Box`、`AppShell` 等布局组件，不堆自定义 flex 容器 |
| 徽标 / 状态标记 | `Badge` |
| 进度 | `Progress`、`RingProgress` |

**弹窗只有一扇壳**：`Modal` **只允许**出现在 `src/components/modals/FreeModal` 内部，页面 / 业务组件
一律 `@/components/modals/FreeModal`（二次确认再基于它封 `ConfirmModal`），不 import Mantine `Modal`、
也不 import `Modal.Root` 自己拼 header。`scripts/check-structure.mjs` 会扫这一条，命中即 lint 失败。

## 遮罩与浮层玻璃

全站只有一套毛玻璃配方，令牌在 `src/styles/global.scss` 的 `--app-glass-*`：

- 遮罩按背后的内容分三档：普通弹窗 `--app-glass-overlay`、列表加载 `--app-glass-overlay-soft`、
  媒体预览 `--app-glass-overlay-media`（图片 / 视频的 `FreeModal` 传 `overlayTone="dark"`）；
- 浮层（浮动 header、播放器控制栏、瓦片 veil、操作组、进度预览）用 `--app-glass-panel` 或
  `--app-glass-float`，虚化与饱和都取 `--app-glass-blur-*` / `--app-glass-saturate`；
- 压在媒体画面上的常驻 chrome（预览 header、播放器控制栏）固定浅字，取 `--app-glass-on-*`
  一组，渐变收边走 `--app-glass-fade-media-*`；亮色下 chrome 偏浅，叠一层半透明墨色压住画面，
  浅色图标才压得住，普通弹窗仍走 ink / chrome 自适应，不套这一组；
- 业务侧不写裸的 `blur(12px)` / `saturate(1.3)` 这类数值，一律取 `--app-glass-*`；现有档位不够时
  在令牌里加一档，不在页面 / 业务组件里另起一套配方。
- 叠层遮罩（二次确认压在预览上）两层材料会自然叠加、更浓更糊；业务侧不要再手动补一层虚化或加深底色。

## 三层：组件库 → Free 层 → 业务组件

| 层 | 判据（一遍问下来只落一层） | 落点 |
| --- | --- | --- |
| 组件库 | 这个品类还没有 Free 层，也没有「全站只允许一种形态」的口径 | 就地直接用 Mantine |
| `FreeXxx`（项目标准层） | 这一类对象**全站只允许一种形态 / 一套交互**，业务不许越过它直连底层 | `src/components/<分类>/FreeXxx/` |
| 业务组件 | 有业务语义（特殊列、特殊交互、特殊数据形态），但所属品类已有 Free 层 | `src/pages/<Page>/<Name>/`，基于 Free 层加增量 |

- **`Free` 前缀只承诺「某类对象的全站唯一入口」**，不是「包了组件库」：底层是 Mantine、第三方库
  还是自研都行（`FreeTable` / `FreeVideo` / `FreeTruncatedText`）。
- **业务不许越过 Free 层**：品类已有 Free 层时，业务侧再直接 import 底层（`Table` / `Modal` /
  播放器 / `react-markdown` / 自己写截断）就是缺陷——**只有一处用也不例外**；缺 props / 插槽就先给 Free 层加，
  不在业务里另起一套口径。
- **`FreeXxx` 必须真的锁住东西**：尺寸档、边框、表头、间距、键位、加载 / 错误态这类默认外观与
  默认行为。说不清锁什么的，说明它只是组件库的别名，先别建。
- **场景限定不是例外**：只服务弹层面板的 `FreeSelectField`、只服务面板底部的 `FreePanelFooter`
  同样算 Free 层——它们在该场景内是唯一入口、且锁了外观。真正不挂 `Free` 的是「提供某个动作的
  现成实现、不构成某类对象唯一形态」的件（复制、筛选、图标弹层、二次确认、文档预览）。
- **按钮要当锚点也走 Free 层**：需要把图标按钮摆进只容得下一个能接 `ref` 的元素的位置
  （`Popover.Target`、`Tooltip` 这类），用 `FreeIconAction` 的 `tooltip="none"` 只取按钮本体，
  不许因为塞不进去就另抄一份按钮外观。
- **不接第二套渲染栈**：已经该用 `MarkdownPreviewModal` 的场景，页面里再出现 `react-markdown`
  直连、或另起 `Modal` + 渲染器，等同于复制整套组件。

## 公共组件按类型分目录

`src/components` **不扁平铺**：公共组件先按类型进分类目录，再放组件目录——
`src/components/<分类>/<组件>/`（例：`src/components/modals/FreeModal/index.tsx`）。

| 分类目录 | 放什么 | 现有组件 |
| --- | --- | --- |
| `modals` | 弹窗外壳与弹窗类组件（阅读弹窗、媒体预览、二次确认） | `FreeModal`、`ConfirmModal`、`MarkdownPreviewModal`、`VideoPreviewModal`、`ImagePreviewModal`、`PreviewItemList` |
| `buttons` | 按钮、图标按钮、按钮触发的弹层外壳 | `FreeIconAction`、`CopyIconButton`、`FilterButton`、`IconPopoverButton` |
| `tables` | 表格基线 | `FreeTable` |
| `fields` | 字段 / 输入控件组 | `FreeSelectField`、`FreeSearchInput` |
| `panels` | 面板级排布件（底栏、分组、字段） | `FreePanelFooter`、`FreePanelGroup`、`FreePanelField` |
| `texts` | 文本展示与截断 | `FreeTruncatedText` |
| `feedback` | 加载、空态、提示这类状态呈现 | `PageLoading`、`PreviewCounter` |
| `file-preview` | 把文件内容渲染 / 播放出来的组件（视频、图片、Markdown 文档，后续 PDF） | `FreeVideo`、`FreeImage`、`FreeImageSelection`、`FreeMarkdown` |

- **分类目录一律小写**（`@liangqingda/eslint-config` 1.8.0 起放行 `components` 下一层的分类名单，
  名单在 `config/web-naming-rules.js`；进入分类目录后组件目录仍是 `PascalCase`）；
  `scripts/check-structure.mjs` 再校验一次：`src/components` 下只允许上表这八个分类目录，
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
   `src/components`，回 `src/pages/<Page>/`（判据见 `docs/reuse-boundaries.md` 落点表的
   「两者都不提」一档）。

边缘情形回同一条判据问：**这个场景内，这类对象是否只允许一种形态 / 一套交互。**

- 是，哪怕它底下没有现成的组件库组件，也留 `Free`（锁住的可以是布局 + 组件库小件组合）；
- 不是，只是某个动作的现成实现 → 能力件；只是某一页的语义 → 回 `src/pages/<Page>/`。

判据不看「底下包的是谁」，也不看现有清单里有没有同类组件。

示例：`FreeModal` 锁框体 / header / 正文区外观与键位（底下是 Mantine `Modal`）；`FreePanelFooter`
锁面板底部布局 + `Button` subtle 小号（底下没有现成组件）；`PageLoading` 是页面 chunk 的占位实现，
不构成「全站加载态唯一入口」，所以不挂 `Free`。密码框不另立组件：它是 `FreeInput` 的一档
（`type="password"`，遮罩与「眼睛」一起锁在里面），单独封一层就等于同一类对象有两个入口。

目录结构与其它组件一致（见 `docs/code-splitting.md`）：`index.tsx` + `types.ts`（需要跨文件共享时），
要写自己的样式才加 `index.scss`，一个 `index.tsx` 只放一个组件。

## 公共件契约索引

组件的「锁了什么 / 不管什么 / props」写在各自目录的 `README.md`——判据：只有改它的人才需要读
→ 跟代码走。本文件只维护选型表与分层判据，不复制组件规格。「层」一列按命名判据标：
`Free` 是全站唯一入口，能力件只是某个动作的现成实现。

| 组件 | 层 | 契约 |
| --- | --- | --- |
| `FreeTable` | `Free` | `src/components/tables/FreeTable/README.md` |
| `FreeSelectField` | `Free` | `src/components/fields/FreeSelectField/README.md` |
| `FreePanelFooter` | `Free` | `src/components/panels/FreePanelFooter/README.md` |
| `FreePanelGroup` | `Free` | `src/components/panels/FreePanelGroup/README.md` |
| `FreePanelField` | `Free` | `src/components/panels/FreePanelField/README.md` |
| `FreeModal` | `Free` | `src/components/modals/FreeModal/README.md` |
| `FreeTruncatedText` | `Free` | `src/components/texts/FreeTruncatedText/README.md` |
| `FreeIconAction` | `Free` | `src/components/buttons/FreeIconAction/README.md` |
| `FreeSearchInput` | `Free` | `src/components/fields/FreeSearchInput/README.md` |
| `FreeInput` | `Free` | `src/components/fields/FreeInput/README.md` |
| `FreeVideo` | `Free` | `src/components/file-preview/FreeVideo/README.md` |
| `FreeImage` | `Free` | `src/components/file-preview/FreeImage/README.md` |
| `FreeImageSelection` | `Free` | `src/components/file-preview/FreeImageSelection/README.md` |
| `FreeMarkdown` | `Free` | `src/components/file-preview/FreeMarkdown/README.md` |
| `PreviewItemList` | 能力件 | `src/components/modals/PreviewItemList/README.md` |
| `VideoPreviewModal` | 能力件 | `src/components/modals/VideoPreviewModal/README.md` |
| `ImagePreviewModal` | 能力件 | `src/components/modals/ImagePreviewModal/README.md` |

## 交互键位归外壳

通用判据（同一交互只落一处、键位与 tooltip 标注一起上提）见 skill《UI 分层与唯一入口》。

本项目落在 `FreeModal` 目录下的 hooks：`Esc` / 空格 / 翻篇 / 全屏 / `⌘M` 只在那里挂；业务组件只传
`nav` / `headerActions` / `onClose` / `shortcutsEnabled` 这类中性参数，自己不 `addEventListener`。
给已有弹窗新增 header 操作也按这条判：先问另一扇弹窗有没有这个操作、它是哪个键；有就一次上提，
键位、通知与 tooltip 键位标注一起搬。`check-structure` 拦业务层自己监听 `keydown`，但「只加按钮
没挂键」看不出来，仍需手动对。

## 例外：编辑器表层的输入控件

只有 `BlockEditor` 这类**编辑器表层**允许出现原生 `<input>` / `<textarea>`：单元格输入框、
块源码文本框要贴着格子排、字号与行高跟着编辑器走，而组件库的 `TextInput` / `Textarea` 会套一层
root 容器并带上自己的高度 / 内边距 / 边框体系，全部覆盖反而更难对齐。放开的前提：

- 必须在组件里写一行注释说明理由（写不清的就是「瞎写」）；
- 只限编辑器表层，不扩散到普通表单——表单、设置项一律用 `TextInput` / `Select` 等，搜索框走
  `FreeSearchInput`。

## 封了壳就只走壳

通用判据见 skill《UI 分层与唯一入口》。本项目由 `scripts/check-structure.mjs` 拦：`Modal` /
`Table` / `TextInput` / `ActionIcon` 只许出现在对应的 Free 组件里，别处 import 一律报错；
例外只有在脚本白名单里登记过才放过——当前只有两处（`layouts/Header` 品牌区主题切换、
`ProseFontControl` 的 `A-` / `A+`），且必须同时写在本文件与对应组件的 README。
**新增例外等于同时改脚本、改文档、写理由**，不写理由的一律按「漏改」处理。

## 自检

```bash
# 越层直连、组件目录缺 README、手写单行省略：pnpm lint 里的 check-structure 已拦，这里只做自查
pnpm lint

grep -rn "<table\|<button\|<input\|<select" --include="*.tsx" src
```

`check-structure` 现在会报的四类：越过 Free 层直连（`Modal` / `Table` / `TextInput` / `ActionIcon`）、
公共组件目录缺 `README.md`、样式里自己写 `text-overflow: ellipsis`、业务层自己监听 `keydown`。

不是要求零命中，而是**每一处命中都要说得清**：组件库没有对应能力，或只是纯语义容器。
说不清的，改成组件库组件；同类形态全站只该有一套的，封 `FreeXxx`；有业务特殊能力的，
基于 `FreeXxx` 封业务组件。
