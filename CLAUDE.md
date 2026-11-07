# CLAUDE.md

`my-dashboard` 的协作约定。动手改代码前先读本文件；与 `README.md` 冲突时以本文件为准。

## Markdown 预览一律使用公共组件

**所有 Markdown 弹窗预览都必须使用 `src/components/MarkdownPreviewModal`。**
学习笔记、文档、报告、日志等任何以弹窗形式查看 Markdown 的场景都适用，不要在页面里
另起一套 `Modal` + Markdown 渲染器，也不要复制这个组件的样式。

统一组件负责的内容：

- 文档排版：标题、表格、引用、代码块、`<details>` 折叠讲解等；
- 导航：弹窗左上角位于**弹窗之外**的悬浮按钮、header 里的上一个 / 下一个图标按钮、
  `←` / `→` 快捷键；
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

调用方只决定「相邻文档是谁」，导航交互由组件负责。渲染栈固定为
`react-markdown` + `remark-gfm` + `rehype-raw`（需要 GFM 表格与 `<details>` 折叠块）；
新增 Markdown 能力时改这个组件，不要在别处另装渲染器。

参考实现：`src/pages/English/index.tsx`（笔记列表 → 弹窗预览，循环切换上一篇 / 下一篇）。

## 其它约定

- 公共组件放 `src/components/<kebab-case>/`，同样 `index.tsx` + `index.scss`；
  功能模块放 `src/features/<kebab-case>/`，页面只做数据拼装与状态编排。
- 页面默认只展示文件名、标题这类索引信息，正文细节交给预览层，不要把所有内容平铺出来。
- 本机仓库数据（如 `../learn-english`）一律通过 `scripts/vite/*` 插件只读读取，前端
  按 `import.meta.env.DEV` 切换接口与构建快照，不新增后端服务。
