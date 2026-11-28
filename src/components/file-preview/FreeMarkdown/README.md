# FreeMarkdown

全站唯一的 **Markdown 渲染层**：把 Markdown 原文渲染成节点。它只负责「渲染成什么样」，
排版、目录、筛选、编辑、弹窗外壳都归调用方。

## 它锁了什么

- **渲染栈**：`react-markdown` + `remark-gfm`（表格、任务列表、删除线）+ `rehype-raw`（行内 HTML），
  插件表在 `constants.ts` 里固定一份引用，别处不再各自配一套；
- **只按内容重解析**：组件吃 `markdown` 一个字符串并 `memo`，同一份内容重复渲染直接复用上次结果
  （长文档整篇解析要几十毫秒）；调用方不必再包 `useMemo`，也不要为了「优化」把原文切成段分别渲染。

## 它不管什么

- **排版与样式**：不输出 `className`、不带 `.prose`；正文容器、字号、行高由调用方给
  （`MarkdownPreviewModal` 的 `.prose` 就是这种用法）；
- **目录、筛选、编辑、锚点跳转**：都要原文之外的语义，留在调用方（预览弹窗、编辑器）；
- **弹窗外壳**：要开窗阅读走 `MarkdownPreviewModal`，不自己拿 `FreeMarkdown` 拼 `FreeModal`。

## props

见 `index.tsx` 的 `FreeMarkdownProps`：只有 `markdown`（原文）。

## 边界

- 只读不改：组件不改写原文、不注入段落标记，要做高亮 / 锚点这类后处理时在渲染后的 DOM 上做
  （`MarkdownPreviewModal` 的 `useKeywordHighlight` 就是这种口径）；
- 不接第二套渲染器：页面里不要再直连 `react-markdown`，插件差异会让同一篇文档在两处长成两个样子。
