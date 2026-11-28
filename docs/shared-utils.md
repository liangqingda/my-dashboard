# 公共能力复用：本项目清单与落点

通用判据（高频中性能力先提、第二处兜底、持久化边界、UI / 逻辑分开）见 `best-react-code` 的
《能力上提与持久化边界》与《公共化边界：UI 与逻辑分开判》。本文件只登记本项目已有的入口、
键名规则与落点，不重复判据。

## 本项目落点

- 纯函数 → `src/utils/<kebab-case>.ts`
- 跨页面状态机 → `src/hooks/`
- 页面自己的状态机 / 纯函数 → 该页 `hooks/` / `utils.ts`
- 组件形态 → `src/components/<分类>/<Name>/`（分类见 `docs/ui-components.md`）

新增同类能力先查下表，再按 skill 判据决定放哪；不要在页面里另写一份。

## 已抽好的能力

只登记**入口**；默认值、坑与行为细节写在该文件的 JSDoc 或组件自己的 `README.md`，这里不复述
（清单是事实，不是规则）。

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
| 把本机文件交给外部应用打开 | `@/utils/open-file` 的 `openFileExternally(path, appName?)`（页面与程序坞窗口共用） |
| 开合动画的几何算式（`from` / `to` 两个矩形 → 平移 + 等比缩放）、是否要减少动效 | `@/utils/motion-geometry` 的 `shiftBetweenRects(from, to)` / `prefersReducedMotion()`（程序坞与弹窗共用） |
| 「用户从哪一点打开的」记录（`pointerdown` / 键盘回退、过期判定） | `@/utils/pointer-origin` 的 `readPointerOrigin()` / `resolveOriginRect(origin)` |
| 单行 / 两行省略文本（默认中间省略，尾部省略传 `ellipsis="end"`）、截断才提示 | `@/components/texts/FreeTruncatedText` |
| 悬停 / 聚焦意图 | `@/hooks/useHoverIntent` |
| 组件是否仍挂载（异步回调写状态前挡卸载后的迟到响应） | `@/hooks/useMounted` |
| 单击 / 双击的区分（单击延后一个双击窗口，第二下到来就作废） | `@/hooks/useSingleOrDoubleClick` |
| 界面状态的本地持久化（展开 / 收起、全屏、视图形态） | `@/hooks/useStoredState` + `@/utils/local-storage` 的 `FLAG_CODEC` / `STRING_CODEC` / `createChoiceCodec(choices, fallback)` / `createRangedNumberCodec(min, max, fallback)`（滑块这类固定档位，脏值与越界回落默认）；不在组件里直接读写 `localStorage`，也不自己 try/catch |
| 一个弹窗的整组偏好（同一次阅读的全屏 / 字号 / 目录宽度…） | `@/hooks/useStoredField(key, field, codec)` + `FLAG_FIELD_CODEC` / `createChoiceFieldCodec(choices, fallback)` |
| 存储键的拼法（不知道键该怎么起名） | `@/utils/page-storage` 的 `pageStorageScope` / `pageStorageKey` / `scopedStorageKey`；细则见下面「存储键的命名」，不要手拼字符串 |

界面状态持久化的判据（只记用户手动切换的展示偏好，不记数据推导状态）见 skill；本项目的键名规则如下。

### 存储键的命名

界面偏好一律按 `<页面标识>:<组件或能力>` 命名：

- **不带全局前缀**：所有键同属一个应用，`my-dashboard:` 这类前缀区分不了任何东西；
  真正要区分的是「哪一页、哪个组件」。
- **页面标识用路由**：pathname 去掉前导 `/`、段间用 `-` 连（`/english/notes` → `english-notes`、
  `/english/knowledge-base` → `english-knowledge-base`、`/services` → `services`）；
  拼法只走 `@/utils/page-storage`：有 pathname 的地方用 `pageStorageKey(pathname, capability)`，
  页面 / 组件已经知道自己标识的地方用 `scopedStorageKey(scope, capability)`，别一处手拼、一处走工具。
- **改名即失效，不写兼容**：本项目单人本地自用，页面标识或字段名一改，旧键里的偏好就直接不读；
  不写旧键迁移、不保留旧字段别名。
- 例：`english-notes:view-mode`、`english-notes:notes-filter-range`、
  `english-notes:markdown-preview`、`english-notes:anchor-section-preview`、
  `english-knowledge-base:record-detail`、`english-notes:fullscreen`、
  `files:current-dir`、`files:favorites`、`files:type-filter`、`files:view-mode`、
  `files:video-preview`（视频预览的一组偏好）、`files:video-open-mode`、`files:video-app`、
  `files:veil-opacity`（hover 玻璃层透明度 0–100）、
  `files:image-preview-fullscreen`、`files:video-preview-fullscreen`。
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

1. 先按 skill 判据确认它真的是「跨页面通用」，并查上表是否已有入口；
2. 再按 `docs/dependencies.md` 判要不要引库；
3. 文件命名 kebab-case，写 JSDoc 说明用途与边界（为什么这么实现）；
4. 抽取后把原处全部改成引用，不留旧实现做对照。
