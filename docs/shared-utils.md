# 公共能力复用

## 判据

同一段逻辑出现**第二处**就必须抽出来再复用，不许各写一遍。抽取位置：

- 纯函数、跨页面通用 → `src/utils/<kebab-case>.ts`；
- 只在一个页面 / 组件里用 → 该目录自己的 `utils.ts`；
- 组件形态的通用 UI → `src/components/<分类>/<PascalCase>/`（分类见 `docs/ui-components.md`）。

**「逻辑提了、UI 提不提」「UI 提了、逻辑留不留」另有一份判据**：见 `docs/reuse-boundaries.md`
（同一件事的 UI 与逻辑分开判，允许只提一半；公共件里不许出现页面语义）。

## 已抽好的能力

只登记**入口**；默认值、坑与行为细节写在该文件的 JSDoc 或组件自己的 `README.md`，这里不复述
（清单是事实，不是规则，判据见 `docs/doc-writing.md`）。

| 场景 | 用哪个 |
| --- | --- |
| 错误对象转提示文案 | `@/utils/error` 的 `getErrorMessage(error, fallback)` |
| 时间格式化 | `@/utils/format` 的 `formatClock` / `formatTime` / `formatDateTime`（不要在调用方就地 `new Intl.DateTimeFormat`） |
| 多 class 拼接 | `@/utils/cx` 的 `cx(...)`（不要手写模板串拼 class） |
| 键盘事件落点是不是输入框 / 可编辑区 | `@/utils/typing-target` 的 `isTypingTarget(target)`（全局快捷键先问它） |
| 剪贴板复制 | `@/utils/clipboard` 的 `copyText(text)` 与 `COPY_FEEDBACK_DURATION` |
| 复制图标按钮 | `@/components/buttons/CopyIconButton` |
| 页面级刷新 | `@/utils/page-refresh` 的 `requestPageRefresh()` / `onPageRefresh(handler)` |
| Markdown 标题目录 | `@/utils/markdown-outline` 的 `extractMarkdownOutline` |
| 单行 / 两行省略文本（默认中间省略，尾部省略传 `ellipsis="end"`）、截断才提示 | `@/components/texts/FreeTruncatedText` |
| 悬停 / 聚焦意图 | `@/hooks/useHoverIntent` |
| 界面状态的本地持久化（展开 / 收起、全屏、视图形态） | `@/hooks/useStoredState` + `@/utils/local-storage` 的 `FLAG_CODEC` / `STRING_CODEC` / `createChoiceCodec(choices, fallback)`；不在组件里直接读写 `localStorage`，也不自己 try/catch |
| 一个弹窗的整组偏好（同一次阅读的全屏 / 字号 / 目录宽度…） | `@/hooks/useStoredField(key, field, codec)` + `FLAG_FIELD_CODEC` / `createChoiceFieldCodec(choices, fallback)` |
| 存储键的拼法（不知道键该怎么起名） | `@/utils/page-storage` 的 `pageStorageScope` / `pageStorageKey` / `scopedStorageKey`；细则见下面「存储键的命名」，不要手拼字符串 |

界面状态持久化的判据：**用户手动切换的展示偏好**才记（展开的日志面板、页面全屏、英语页看板 /
表格形态），刷新后应当还在；**由数据或操作结果推导出来的状态**（正在加载、当前选中的笔记、
排序方向）不记——后者要么能重算，要么记下来反而与真实数据不一致。

### 存储键的命名

界面偏好一律按 `<页面标识>:<组件或能力>` 命名：

- **不带全局前缀**：所有键同属一个应用，`my-dashboard:` 这类前缀区分不了任何东西；
  真正要区分的是「哪一页、哪个组件」。
- **页面标识用路由**：pathname 去掉前导 `/`、段间用 `-` 连（`/english/notes` → `english-notes`、
  `/english/knowledge-base` → `english-knowledge-base`、`/services` → `services`）；
  拼法只走 `@/utils/page-storage`：有 pathname 的地方用 `pageStorageKey(pathname, capability)`，
  页面 / 组件已经知道自己标识的地方用 `scopedStorageKey(scope, capability)`，别一处手拼、一处走工具。
- 例：`english-notes:view-mode`、`english-notes:notes-filter-range`、
  `english-notes:markdown-preview`、`english-notes:anchor-section-preview`、
  `english-knowledge-base:record-detail`、`english-notes:fullscreen`、
  `files:current-dir`、`files:favorites`、`files:type-filter`、`files:view-mode`。
- **同一个公共组件挂在不同页面必须各记一套**：页面把标识传给组件（如 `MarkdownPreviewModal` 的
  `storageScope`），组件内部再拼 `<标识>:<组件>`；组件不许自己写死页面标识，否则两页会共用同一份
  全屏 / 字号。
- 同一组件持有的一组偏好存成一个对象（见上表那一行），字段名也留在该模块 `constants.ts`；
  页面里彼此独立的条件（视图形态、筛选范围 / 关键词）仍可一个键一个值，但前缀必须是这一页的标识；
  只有一项的命名空间不用为了凑格式再多套一层。
- 键名与字段名都不上提成公共常量：页面专属的留在页面 `constants.ts`。

页面全屏的存储键与读取入口单独在 `@/utils/page-fullscreen`（`pageFullscreenKey` /
`readStoredPageFullscreen`，键即 `<页面标识>:fullscreen`）：写入方是 `MenuContentLayout`，
应用级加载占位 `src/components/feedback/PageLoading` 只读它，用于在页面 chunk 挂载前就决定
要不要铺满视口盖住外壳。

自检方法（各条都应当只在上面那些文件里命中，第二行应当没有结果）：

```bash
grep -rn "instanceof Error\|Intl\.DateTimeFormat\|execCommand\|navigator.clipboard" src
grep -rn '`${styles' src   # 手写 class 模板串
grep -rn "localStorage\.(get|set)Item" src   # 应当只命中 src/utils/local-storage.ts
grep -rn "'my-dashboard:" src   # 应当没有结果：键不带全局前缀（用引号只查字面量，跳过注释）
```

## 新增公共能力时

1. **先判该不该自己写**：按 `docs/dependencies.md` 的三问走（先查已在用的依赖，再看会不会带出
   第二套范式），该引库就别自造；
2. 再确认它真的是「跨页面通用」，只是两处长得像但语义不同的，不要硬合并；
3. 文件命名 kebab-case，写 JSDoc 说明用途与边界（为什么这么实现）；
4. 抽取后把原处全部改成引用，不留旧实现做对照。
