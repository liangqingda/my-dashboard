# CLAUDE.md

`my-dashboard` 的协作约定。动手改代码前先读本文件；与 `README.md` 冲突时以本文件为准。

## Markdown 预览一律使用公共组件

**所有 Markdown 弹窗预览都必须使用 `src/components/MarkdownPreviewModal`。**
学习笔记、文档、报告、日志等任何以弹窗形式查看 Markdown 的场景都适用，不要在页面里
另起一套 `Modal` + Markdown 渲染器，也不要复制这个组件的样式。

统一组件负责的内容：

- 文档排版：标题、表格、引用、代码块、`<details>` 折叠讲解等；
- 导航：header 里、**标题左侧**的上一个 / 下一个图标按钮，配合 `←` / `→` 快捷键；
- 标题导航：弹窗左上角、**浮在弹窗框体之外**的文档内 h1–h3 目录，点击滚动到对应标题；
- footer：`编辑` / `关闭` 按钮；进入编辑态后变为 `取消` / `保存`，保存成功在 footer 显示
  「已保存・HH:MM」并在 3 秒内淡出；
- 编辑插槽：组件**不带默认编辑器**，具体编辑界面由调用方通过 `Editor` 传入；没有传 `Editor`
  时点「编辑」只弹提示，告知可用 `personalize-edit-markdown` skill 定制；
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
| `onSave` | `(markdown: string) => Promise<{ notice?: string }>`（可选） | 提供后才出现「编辑」；落盘由调用方实现，返回的 `notice` 会追加在「已保存」提示后 |
| `Editor` | `ComponentType<MarkdownEditorProps>`（可选） | 这一类文档的定制编辑器；不传则点「编辑」只给定制提示 |

调用方决定「相邻文档是谁」「保存落到哪里」以及「这类文档怎么编辑」，导航与编辑态流程由组件负责。渲染栈固定为
`react-markdown` + `remark-gfm` + `rehype-raw`（需要 GFM 表格与 `<details>` 折叠块）；
新增 Markdown 能力时改这个组件，不要在别处另装渲染器。

## 编辑能力是可定制的

公共组件只提供 `MarkdownEditorProps`（`markdown` 快照 + `onChange` 草稿回传）这一个插槽，
**编辑逻辑按文档类别放在各自的 feature 里**，通用的解析 / 控件才上提：

- 英语笔记：`src/features/english-notes/note-editor`（适配层）+ `block-editor`（受控控件）+
  `markdown-blocks.ts`（解析与回写）。做法是把正文切成块，表格解析成行 / 单元格矩阵用受控网格
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
Markdown 预览弹窗保存」；内容无变化时不产生空提交，提交失败不阻断保存、原因回传到 footer。

参考实现：`src/pages/English/index.tsx`（分列笔记 → 弹窗预览，循环切换上一篇 / 下一篇，
保存时 `PUT /api/english/notes` 写回 `learning-record-notes/*.md`）。

## 其它约定

- 公共组件放 `src/components/<PascalCase>/`（lint 强制），同样 `index.tsx` + `index.scss`；
  功能模块放 `src/features/<kebab-case>/`，页面只做数据拼装与状态编排。
- 页面默认只展示文件名、标题这类索引信息，正文细节交给预览层，不要把所有内容平铺出来。
- 本机仓库数据（如 `../learn-english`）一律通过 `scripts/vite/*` 中间件读盘，前端
  按 `import.meta.env.DEV` 切换接口与构建快照，不新增后端服务；写操作同样走该中间件，
  只在开发模式可用，并且必须校验文件名（禁止路径穿越、禁止写目录说明文件）。
