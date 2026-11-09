# Markdown 编辑能力（插槽与解析回写）

## 职责边界

公共组件只提供 `MarkdownEditorProps`（`markdown` 快照 + `onChange` 草稿回传，可选 `onHandleReady`
交出 `revealHeading` 定位能力）这一个插槽；**编辑逻辑按文档类别放在对应页面目录里**，
通用的解析 / 控件才上提。不要在 `MarkdownPreviewModal` 里为某一类文档写编辑逻辑。

## 英语笔记的实现（参考实现）

三层分工：

| 位置 | 职责 |
| --- | --- |
| `src/pages/English/NoteEditor` | 适配层：把组件插槽接到块编辑器上 |
| `src/pages/English/BlockEditor` | 受控控件：按块渲染编辑界面 |
| `src/pages/English/utils/markdown-blocks.ts` | 解析与回写：正文 ↔ 块 |

做法是把正文切成块，表格解析成行 / 单元格矩阵用受控网格编辑（可删行、加行、改单元格），
其余块编辑自己的源码片段，保存时按块重拼 Markdown。

`NoteEditor` 实现 `onHandleReady`，用 `findBlockIndexForHeading` 把标题换算成块下标，再把该块滚进视野并
聚焦——编辑态正文不渲染，目录只能由编辑器自己定位。

页面侧的数据拼装见 `src/pages/English/index.tsx`（六列看板 → 弹窗预览，上一篇 / 下一篇只在本列内循环，
打开时 `GET /api/english/notes?name=…` 只取这一篇，保存时 `PUT /api/english/notes` 写回
`learning-record-notes/*.md`）；读盘链路见 `docs/local-repo-data.md`。

## 新增一类可编辑文档

先跑仓库内 skill `personalize-edit-markdown`（`.claude/skills/`）：

```bash
# Claude Code 里直接 /personalize-edit-markdown
```

它给出职责边界、契约、目录规则、数据安全底线（不认识的写法要降级为源码编辑），以及
「真实文件 parse → serialize 逐字 diff」的验证方式。仓库内的 skill 目录不会被 agent 自动扫描，
需要按路径手动 `Read` `SKILL.md`。

## 硬性禁止

**不要走 contentEditable + DOM 反向序列化**：会丢格式、和 React 抢 DOM，且父级刷新时编辑内容当场消失。
新增块类型要同时改解析与序列化两侧。

## 数据安全底线：不认识的写法一律降级

**文档结构写不进去时的底线**：不认识的写法一律降级为「源码文本块」，用户直接改原文，不要硬解析后重排。

以英语笔记的表格为例（`isStructuredTableSafe`）：单元格内含标签、`<thead>` / `<tbody>` / `<tfoot>` /
`<caption>`、`<tr>` 带属性、表格嵌套、`&nbsp;` / 数字实体，都会整表降级，避免往返丢结构。

## 往返自检（改解析或回写后必须跑）

```bash
pnpm check:md   # scripts/md-roundtrip.mts，夹具在 scripts/fixtures/md/
```

它检查「原文 → parse → serialize」逐字一致、该降级的没有结构化、删行 / 加行只动目标行。
`pnpm lint` 已包含这一步。
