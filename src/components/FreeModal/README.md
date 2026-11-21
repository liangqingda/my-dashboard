# FreeModal

基础弹窗外壳：把 Mantine `Modal` 包成项目默认的「文档 / 详情阅读窗」长相——框体、紧凑 header、
正文工作区、全屏、翻页与计数，全站所有阅读类弹窗都基于它封装，不各自拼 `Modal`。

## 它锁了什么

- **框体**：`radius="md"`、`padding={0}`、遮罩 `backgroundOpacity 0.5 + blur 2`、140ms fade；
  正文高度 `82dvh`（上限 `88dvh`），全屏时铺满 `100vw / 100dvh`。
- **header**：紧凑版（上下内边距 6px，高度由行内最高按钮决定，约 41px），用 `.content .header`
  双类名压掉 Mantine 的 `min-height` —— 单类名会被它那套 padding / min-height 顶回来。
- **header 顺序（固定）**：翻页与计数 → 标题 → `headerActions` → 全屏 → `headerTail` →
  竖线 → `headerSecondary` → Mantine 关闭按钮。
  竖线只在 `headerActions` / `headerTail` 与 `headerSecondary` 同时存在时才有。
- **退出键**：`Esc` 与 **空格** 都关窗（空格会 `preventDefault`，不让浏览器把它当成「点当前焦点按钮」
  —— 那正是「按空格莫名翻到下一条 / 切了全屏」的来源）。两者同一套放行口径：带 ⌘ / Ctrl / Alt
  的组合键不拦、正在输入（输入框 / 可编辑区）不拦、按住连发不算；`closeOnSpace` 默认跟随
  `closeOnEscape`，编辑态与上层浮层开着时一起失效。
- **正文区**：`.body` 是 flex 纵向容器（`flex: 1 1 auto; min-height: 0`），正文自己决定怎么滚
  （`ScrollArea` 或整块不滚）；全屏由调用方持有状态（正文排版要用），这里只画按钮。

## 它不管什么

- 标题文案、翻页数据与范围（`nav.index / total / onPrevious / onNext` 由调用方算）；
- 每个按钮的能力（复制、筛选、字号、编辑流程、删除都是调用方的组件，塞进对应插槽）；
- 正文内容与其滚动方式；
- 全屏状态的存储（用下面的 `useModalFullscreen` 才记得住，不传 `fullscreen` 就没有全屏按钮）。

## props

| prop | 说明 |
| --- | --- |
| `opened` / `onClose` | 开合；Esc、点遮罩、点关闭按钮都走 `onClose` |
| `title` | header 标题（`ReactNode`），通常是文件名 / 条目名 |
| `nav` | `FreeModalNav`：`index`（从 1 起）、`total`、`onPrevious` / `onNext`（到头传 `null` 置灰）、`previousLabel` / `nextLabel`、`shortcutHint`（只进 tooltip）、`disabled`（整组禁用，如编辑中） |
| `headerActions` | 第一组操作（阅读类：复制、筛选、刷新…） |
| `headerTail` | 排在全屏之后的末尾位，保证「删除」始终在最右 |
| `headerSecondary` | 第二组操作（如编辑流程），自动在它与前面一组之间画竖线 |
| `fullscreen` | `{ active, onToggle }`；不传则不显示全屏按钮 |
| `closeButton` | 是否显示关闭按钮，默认显示（编辑态这类「关不掉」的场景传 `false`） |
| `closeOnEscape` / `closeOnSpace` / `trapFocus` | Esc 与空格是否关窗（`closeOnSpace` 默认跟随 `closeOnEscape`）、上层浮层开着时由调用方关掉，避免一下全关 / 焦点被抢、是否锁焦点 |
| `size` / `centered` / `closeLabel` | 宽度档（默认 `min(980px, 92vw)`）、是否垂直居中、关闭按钮的 `aria-label` |
| `contentClassName` / `bodyClassName` | 只加增量类名，复制框体 / header 样式不算 |

## 全屏偏好：`hooks/useModalFullscreen`

```ts
const { fullscreen, toggle } = useModalFullscreen(storageKey);
```

- 每个业务弹窗**一把自己的存储键**（如 `my-dashboard:markdown-preview:fullscreen`、
  `my-dashboard:review:fullscreen`）：md 预览与记录详情各记各的，互不干扰；
- 状态由调用方持有，用来参与正文排版；`Esc` 永远关弹窗（连带退出全屏），不是切全屏。

## 基于它封装的业务弹窗

- `MarkdownPreviewModal`：`DocumentActions` → `headerActions`、编辑流程 → `headerSecondary`、
  删除 → `headerTail`、翻篇 → `nav`；
- `Review/RecordDetailModal`：记录详情，`nav` 传上一条 / 下一条，正文用 `ScrollArea` + `.paper` 留白。

业务弹窗不回头直连 `Modal`、不复制框体 / header 样式；需要新插槽时先加在本组件，哪怕只有一处用
（同款外观出现第二处时，两处要一起往这里靠）。
