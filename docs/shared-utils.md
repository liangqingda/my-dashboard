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
| 剪贴板复制 | `@/utils/clipboard` 的 `copyText(text)`（含 `execCommand` 兜底）与 `COPY_FEEDBACK_DURATION`（复制成功后对勾的停留时长） |
| 复制图标按钮 | `@/components/CopyIconButton`：点击复制 `text`，成功后图标 1.5 秒内变对勾；点击不冒泡（嵌在整行可点击的表格里不会顺带打开那一行），失败弹一条提示 |
| 页面级刷新 | `@/utils/page-refresh` 的 `requestPageRefresh()`（等页面取完数才 resolve，返回 `empty` 表示无订阅者）/ `onPageRefresh(handler)` |
| Markdown 标题目录 | `@/utils/markdown-outline` 的 `extractMarkdownOutline` |
| 单行省略文本 / 截断才提示 | `@/components/TruncatedText`：放得下就正常显示，只有被省略号截断时才在 hover / 聚焦弹 tip；传 `onClick` 渲染成 button，`inline` 用于夹在一行文字里（量宽与 tip 都在被指到时才做，见下一行） |
| 悬停 / 聚焦意图（把重组件推迟到真被指到） | `@/hooks/useHoverIntent`：返回 `[是否被指到, 四个事件处理器]`，handlers 铺在被指的元素上；可选 `onEnter` 在进入的同一事件里跑一次（现场量宽这类）。列表里成百上千个条目**不要**各自常驻 `Tooltip` / `ResizeObserver`，按这个模式改成按需创建 |
| 界面状态的本地持久化（展开 / 收起、全屏、视图形态） | `@/hooks/useStoredState` 配 `@/utils/local-storage` 的 `FLAG_CODEC`（开关）或 `createChoiceCodec(choices, fallback)`（枚举形态）；存储键常量放各自模块的 `constants.ts`。不在组件里直接读写 `localStorage`，也不自己 try/catch |

界面状态持久化的判据：**用户手动切换的展示偏好**才记（展开的日志面板、页面全屏、英语页看板 /
表格形态），刷新后应当还在；**由数据或操作结果推导出来的状态**（正在加载、当前选中的笔记、
排序方向）不记——后者要么能重算，要么记下来反而与真实数据不一致。

页面全屏的存储键与读取入口单独在 `@/utils/page-fullscreen`（`pageFullscreenKey` /
`readStoredPageFullscreen`）：写入方是 `MenuContentLayout`，应用级加载占位
`src/components/PageLoading` 只读它，用于在页面 chunk 挂载前就决定要不要铺满视口盖住外壳。

自检方法（各条都应当只在上面那些文件里命中，第二行应当没有结果）：

```bash
grep -rn "instanceof Error\|Intl\.DateTimeFormat\|execCommand\|navigator.clipboard" src
grep -rn '`${styles' src   # 手写 class 模板串
grep -rn "localStorage\.(get|set)Item" src   # 应当只命中 src/utils/local-storage.ts
```

## 新增公共能力时

1. 先确认它真的是「跨页面通用」，只是两处长得像但语义不同的，不要硬合并；
2. 文件命名 kebab-case，写 JSDoc 说明用途与边界（为什么这么实现）；
3. 抽取后把原处全部改成引用，不留旧实现做对照。
