# CLAUDE.md

`my-dashboard` 的协作约定。动手改代码前先读本文件；与 `README.md` 冲突时以本文件为准。

## Markdown 预览一律使用公共组件

**所有 Markdown 弹窗预览都必须使用 `src/components/MarkdownPreviewModal`。**
学习笔记、文档、报告、日志等任何以弹窗形式查看 Markdown 的场景都适用，不要在页面里
另起一套 `Modal` + Markdown 渲染器，也不要复制这个组件的样式。

统一组件负责的内容：

- 文档排版：标题、表格、引用、代码块、`<details>` 折叠讲解等；
- 导航：header 里、**标题左侧**的上一个 / 下一个图标按钮，配合 `←` / `→` 快捷键；
- 标题导航：弹窗**左侧固定的一列**文档内 h1–h4 目录 sidebar，按层级折成树——每深一层向右
  缩进一段、左侧多一条极淡的引导线（顶层不画线），层级靠线 + 字号 / 字重区分（字号比正文小
  一档，约 13–14px，暗色模式下也不发虚）；有子标题的节点在标题右侧带折叠图标（右对齐），
  **常规只展开第一个节点及其第一个子级，全屏预览时默认全部展开**；点标题会跳转并顺带
  展开，收起只能点图标；**滚动正文时目录跟随高亮当前所在的小节，并把它的祖先链补展开**、
  高亮行滚出目录可视区时自动滚回来（手动收起同一分支会保留，直到滚到别的小节）；
  目录占独立一列（常规 232px、全屏 300px）、高度由布局自然拉伸、只在目录列内滚动
  （不再测量正文高度封顶），滚动条贴右边缘、做细；窄屏（≤720px）目录挪到正文上方一条
  横带、最多占三成高度；
  正文渲染结果必须 `useMemo` 包住（只依赖 `renderedMarkdown`）：`react-markdown` 每次渲染都会
  重新解析整篇，正文节点挂载、刷新、编辑态切换这类内部状态变化时重解析一次就是几十毫秒的
  「点开卡一下」；
- 全屏预览：header 右侧的图标按钮（排在刷新之后、编辑操作之前），点了把整个框体铺满视口
  （去外边距、描边与圆角），目录默认全展开且列加宽，正文行宽收在一栏并居中，只放大可读高度；
  全屏期间 Esc 只退出全屏（不关弹窗），其它关闭路径（关闭按钮 / 遮罩 / 二次确认后关闭）
  会顺带退出全屏，下次打开回到常规大小；
- **弹窗没有 footer**：编辑 / 预览 / 保存 / 放弃改动与状态提示全部收进 header 右侧，
  只留图标 + tooltip（`aria-label` 与 tooltip 同一句人话）：未编辑时是「编辑（铅笔）」，
  进入编辑态换成「退出编辑（返回箭头）/ 预览草稿（眼睛）/ 保存（对勾，主色）」，
  保存成功在图标左侧显示「已保存・HH:MM」并在 3 秒内淡出（连续保存不会互相踩定时器），
  保存失败显示红色错误文案，超长时省略、hover 弹完整内容；关闭按钮仍用 Modal 自带的那个；
- 草稿预览：编辑态点「预览」把正文换成草稿的渲染结果（编辑器只隐藏、不卸载，草稿 / 撤销栈 /
  光标都留着），header 的操作缩成「返回编辑」「保存」；点「返回编辑」回到编辑态接着改，
  点「保存」才落盘。预览草稿期间标题导航可用（只滚动，跨文档的 `<` `>` 与 `←` `→` 仍禁用，
  避免草稿被换掉）；
- 编辑插槽：组件**不带默认编辑器**，具体编辑界面由调用方通过 `Editor` 传入；没有传 `Editor`
  时点「编辑」只弹提示，告知可用 `personalize-edit-markdown` skill 定制；
- 关闭保护：编辑中且有未保存改动时，点关闭 / Esc / 遮罩先在 header 二次确认（提示
  「这份改动还没保存」+「继续编辑（返回箭头）」/「放弃改动并关闭（红色垃圾桶）」），
  不会静默丢改动；编辑态（填表视图）标题目录置灰不可点，切到草稿预览才恢复；
- 关闭、键盘可访问性与焦点管理。

组件契约：

| prop | 类型 | 说明 |
| --- | --- | --- |
| `opened` | `boolean` | 是否打开 |
| `title` | `string` | 标题，通常传文件名 |
| `markdown` | `string` | Markdown 原文 |
| `position` | `{ index: number; total: number }`（可选） | 展示「第几 / 共几」 |
| `onClose` | `() => void` | 关闭 |
| `onPrevious` | `(() => void) \| null`（可选） | 上一篇；`null` 表示到头，按钮置灰 |
| `onNext` | `(() => void) \| null`（可选） | 下一篇；`null` 表示到头，按钮置灰 |
| `onRefresh` | `(() => Promise<void> \| void) \| null`（可选） | header 标题右侧的刷新按钮；调用方重取最新正文并回灌 `markdown`，返回 Promise 时按钮显示 loading，不传则不显示 |
| `onSave` | `(markdown: string) => Promise<{ notice?: string }>`（可选） | 提供后才出现「编辑」；落盘由调用方实现，抛错则显示为保存失败，返回的 `notice` 追加在「已保存」提示后 |
| `Editor` | `ComponentType<MarkdownEditorProps>`（可选） | 这一类文档的定制编辑器；不传则点「编辑」只给定制提示 |

调用方决定「相邻文档是谁」「保存落到哪里」以及「这类文档怎么编辑」，导航与编辑态流程由组件负责。渲染栈固定为
`react-markdown` + `remark-gfm` + `rehype-raw`（需要 GFM 表格与 `<details>` 折叠块）；
新增 Markdown 能力时改这个组件，不要在别处另装渲染器。

## 编辑能力是可定制的

公共组件只提供 `MarkdownEditorProps`（`markdown` 快照 + `onChange` 草稿回传）这一个插槽，
**编辑逻辑按文档类别放在对应页面目录里**，通用的解析 / 控件才上提：

- 英语笔记：`src/pages/English/NoteEditor`（适配层）+ `BlockEditor`（受控控件）+
  `utils/markdown-blocks.ts`（解析与回写）。做法是把正文切成块，表格解析成行 / 单元格矩阵用受控网格
  编辑（可删行、加行、改单元格），其余块编辑自己的源码片段，保存时按块重拼 Markdown。
- 其它模块要编辑时，先跑 skill `personalize-edit-markdown`（仓库内 `.claude/skills/`）：

  ```bash
  # Claude Code 里直接 /personalize-edit-markdown
  ```

  它给出职责边界、契约、目录规则、数据安全底线（不认识的写法要降级为源码编辑）、
  以及「真实文件 parse → serialize 逐字 diff」的验证方式。

**不要走 contentEditable + DOM 反向序列化**：会丢格式、和 React 抢 DOM，且父级刷新时编辑内容
当场消失。新增块类型要同时改解析与序列化两侧。

保存落盘后由同一个 Vite 中间件把该文件提交到 `learn-english`：只 stage 这一个文件，
提交信息半固定为 `docs(notes): 手动编辑 <文件名去扩展名>` + 固定正文「通过 my-dashboard 的
Markdown 预览弹窗保存」；内容无变化时不产生空提交，提交失败不阻断保存、原因回传到 header
的保存状态提示（红色文案）。

**文档结构写不进去时的底线**：不认识的写法一律降级为「源码文本块」，用户直接改原文，
不要硬解析后重排。以英语笔记的表格为例（`isStructuredTableSafe`）：单元格内含标签、
`<thead>` / `<tbody>` / `<tfoot>` / `<caption>`、`<tr>` 带属性、表格嵌套、`&nbsp;` / 数字实体，
都会整表降级，避免往返丢结构。

往返自检在仓库里，改解析或回写逻辑后必须跑：

```bash
pnpm check:md   # scripts/md-roundtrip.mts，夹具在 scripts/fixtures/md/
```

它检查「原文 → parse → serialize」逐字一致、该降级的没有结构化、删行 / 加行只动目标行。
`pnpm lint` 已包含这一步。

参考实现：`src/pages/English/index.tsx`（六列看板 → 弹窗预览，上一篇 / 下一篇只在本列内循环，
打开时 `GET /api/english/notes?name=…` 只取这一篇，保存时 `PUT /api/english/notes`
写回 `learning-record-notes/*.md`）。

## 菜单页面内容统一走 MenuContentLayout

所有侧边栏菜单页的内容必须包在 `src/layouts/MenuContentLayout/` 里：内边距、标题排版、
纵向间距、`fill` 页面的高度都由该组件负责，页面不要再写页面内边距和标题样式，
`index.scss` 里也不要出现 `.page`。404 等非菜单页不受约束。

规则细节、新增菜单页步骤与校验机制见 `docs/pages.md`；页面组织与五维拆分见
`docs/code-splitting.md`。跨 agent 的硬约束速览见根目录 `AGENTS.md`。

## 其它约定

- 页面代码就近放 `src/pages/<Page>/`，`src/features` 已废弃（出现即被结构检查判定失败）；
  页面只做数据拼装与状态编排。
- 页面默认只展示文件名、标题这类索引信息，正文细节交给预览层，不要把所有内容平铺出来。
- 本机仓库数据（如 `../learn-english`）一律通过 `scripts/vite/*` 中间件读盘（英语笔记插件已拆成
  `english-notes.ts` 路由壳 + `english-notes-store.ts` 读写与校验 + `english-notes-commit.ts` 自动提交），前端
  按 `import.meta.env.DEV` 切换接口与构建快照，不新增后端服务；写操作同样走该中间件，
  只在开发模式可用，并且必须校验文件名（禁止路径穿越、禁止写目录说明文件）。
- 仓库内的 skill 目录（`.claude/skills/*`）不会被 agent 自动扫描，需要时按路径手动 `Read`
  `SKILL.md`；不要以为写了 skill 就会自动生效。
- **笔记内容的问题改 `../learn-english` 的 md，不在预览层打补丁**：标题被未闭合的折叠块吞掉、
  字段缺失、模板写歪这类现象，根因在 md 正文，先定位到文件与行号、说清怎么改，由 md（或
  `check_note.py` 这类校验）修掉；不要顺手在 `MarkdownPreviewModal` / `OutlineNav` 里加「兼容
  畸形数据」的兜底——兜底会把数据缺陷藏起来，还会被后来者当成正常契约。判据：把那段 md 改
  成正确形态后现象是否消失，消失即修数据。通用原则见 `best-react-code` 的《先判根因归属》。
