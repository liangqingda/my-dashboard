# Markdown 编辑能力（插槽与解析回写）

## 职责边界（对所有文档通用）

公共组件只提供 `MarkdownEditorProps`（`markdown` 快照 + `onChange` 草稿回传，可选 `onHandleReady`
交出 `revealHeading` 定位能力）这一个插槽；**编辑逻辑按文档类别放在对应页面目录里**，
通用的解析 / 控件才上提。不要在 `MarkdownPreviewModal` 里为某一类文档写编辑逻辑。

## 新增一类可编辑文档

1. **接插槽**：页面把 `Editor` 传给预览组件；预览态与保存始终用未筛选原文，草稿只经
   `onChange` 回传。
2. **分三层**：页面适配层（把插槽接到编辑器）→ 受控控件（按块渲染编辑界面）→ 解析 / 回写
   （正文 ↔ 块，纯函数，放该页 `utils/`）。
3. **定降级口径**（见下），不认识的写法一律源码块。
4. **验证**：`pnpm check:md` + 对真实文件做 parse → serialize 逐字 diff。

细节契约、目录规则与验证方式见仓库内 skill `personalize-edit-markdown`（`.claude/skills/`）；
仓库内的 skill 目录不会被 agent 自动扫描，需要按路径手动 `Read` `SKILL.md`。

## 数据安全底线：不认识的写法一律降级

判据是**「往返是否逐字一致」**，不是一份结构白名单：任何解析器无法保证往返不丢结构的写法，
整块降级为「源码文本块」，用户直接改原文，不硬解析后重排。新增块类型要同时改解析与序列化两侧。

示例：英语笔记的表格，单元格内含标签、`<thead>` / `<tbody>` / `<tfoot>` / `<caption>`、`<tr>`
带属性、表格嵌套、`&nbsp;` / 数字实体，都会整表降级（`isStructuredTableSafe`）。

## 硬性禁止

**不要走 contentEditable + DOM 反向序列化**：会丢格式、和 React 抢 DOM，且父级刷新时编辑内容当场消失。

## 往返自检

```bash
pnpm check:md   # scripts/md-roundtrip.mts，夹具在 scripts/fixtures/md/
```

它检查「原文 → parse → serialize」逐字一致、该降级的没有结构化、矩阵里手动增删行时只动目标行。
`pnpm lint` 已包含这一步。

## 示例：英语笔记的实现

三层分工：

| 位置 | 职责 |
| --- | --- |
| `src/pages/EnglishNotes/NoteEditor` | 适配层：把组件插槽接到块编辑器上 |
| `src/pages/EnglishNotes/BlockEditor` | 受控控件：按块渲染编辑界面 |
| `src/pages/EnglishNotes/utils/markdown-blocks.ts` | 解析与回写：正文 ↔ 块 |

做法是把正文切成块，表格解析成行 / 单元格矩阵用受控网格编辑（只改单元格；脚本同步的字段行
整行只读，行结构不在这里增删——信息表的行由记录仓库和笔记脚本按模板维护），其余块编辑自己的
源码片段，保存时按块重拼 Markdown。

`NoteEditor` 实现 `onHandleReady`，用 `findBlockIndexForHeading` 把标题换算成块下标，再把该块滚进视野并
聚焦——编辑态正文不渲染，目录只能由编辑器自己定位。

撤销栈按「步数 + 总字节」双重封顶（`UNDO_DEPTH` / `UNDO_BYTES_LIMIT`）：一份快照就是一份完整块数组，
只按固定步数裁剪会让长笔记的栈随篇幅线性吃内存。

页面侧的数据拼装见 `src/pages/EnglishNotes/index.tsx`（五列看板 → 弹窗预览，上一篇 / 下一篇只在本列内循环，
打开时 `GET /api/english/notes?name=…` 只取这一篇，保存时 `PUT /api/english/notes` 写回
`learning-record-notes/*.md`）；读盘链路（列表只发摘要、正文按名取）见 `docs/local-repo-data.md`。
