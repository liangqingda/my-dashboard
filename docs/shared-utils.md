# 公共能力复用

## 判据

同一段逻辑出现**第二处**就必须抽出来再复用，不许各写一遍。抽取位置：

- 纯函数、跨页面通用 → `src/utils/<kebab-case>.ts`；
- 只在一个页面 / 组件里用 → 该目录自己的 `utils.ts`；
- 组件形态的通用 UI → `src/components/<PascalCase>/`。

## 已抽好的能力

| 场景 | 用哪个 |
| --- | --- |
| 错误对象转提示文案 | `@/utils/error` 的 `getErrorMessage(error, fallback)` |
| 时间格式化 | `@/utils/format` 的 `formatClock` / `formatTime` / `formatDateTime`（内部缓存 `Intl` 实例，不要就地 `new Intl.DateTimeFormat`） |
| 多 class 拼接 | `@/utils/cx` 的 `cx(...)`，不要手写模板串或 `?? ''` 拼空格 |
| 剪贴板复制 | `@/utils/clipboard` 的 `copyText(text)`（含 `execCommand` 兜底） |
| 页面级刷新广播 | `@/utils/page-refresh` 的 `requestPageRefresh` / `onPageRefresh` |
| Markdown 标题目录 | `@/utils/markdown-outline` 的 `extractMarkdownOutline` |
| Markdown 折叠块（`<details>` 讲解） | `@/components/MarkdownDetails`：标题行常显、正文按需展开，预览弹窗通过 react-markdown 的 `components.details` 映射到它；也能单独用（传 `summary` + `children`，不传 `summary` 时自动取 `<summary>`） |
| 单行省略文本 / 截断才提示 | `@/components/TruncatedText`：放得下就正常显示，只有被省略号截断时才在 hover / 聚焦弹 tip；传 `onClick` 渲染成 button，`inline` 用于夹在一行文字里 |

自检方法（各条都应当只在上面那些文件里命中，第二行应当没有结果）：

```bash
grep -rn "instanceof Error\|Intl\.DateTimeFormat\|execCommand\|navigator.clipboard" src
grep -rn '`${styles' src   # 手写 class 模板串
```

## 新增公共能力时

1. 先确认它真的是「跨页面通用」，只是两处长得像但语义不同的，不要硬合并；
2. 文件命名 kebab-case，写 JSDoc 说明用途与边界（为什么这么实现）；
3. 抽取后把原处全部改成引用，不留旧实现做对照。
