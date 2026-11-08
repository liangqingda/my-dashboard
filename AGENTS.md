# AGENTS.md

`my-dashboard` 的跨 agent 协作入口：Claude Code 之外的 agent（Codex、豆包等）读这份。
完整约定见 `CLAUDE.md`（组件契约、编辑能力、数据链路等细节都在那边）；本文件只列**必须照做、
不许自行发挥**的硬约束。硬约束与 `CLAUDE.md` 冲突时，先按本文件执行，并同步修正 `CLAUDE.md`。

## 一、菜单页面必须用 MenuContentLayout

侧边栏菜单项对应的页面（当前为 `服务` / `英语`，即 `src/pages/<Page>/index.tsx`），
内容一律包在 `src/layouts/MenuContentLayout` 里，**新增菜单页也必须如此**：

1. 页面标题通过 `title` prop 传入（`ReactNode`）。标题样式固定在组件内（Mantine `Title order={2}`
   加统一字距），页面**不得**再自己写 `<Title>`、字号、字重。
2. 内容区内边距固定 `14px 12px`、标题与内容的间距、纵向排列全部由组件负责。页面 `index.scss`
   **不得**再定义 `.page` 选择器，也不得设置页面级 `padding` / `height`。
3. 「整页不滚动、滚动只发生在内部子区域」的页面（如英语看板）传 `fill`，
   高度由组件按 `calc(100dvh - var(--app-header-height))` 计算，页面不要自己写高度或 `100dvh`。
4. 新增菜单页的顺序：先在 `src/layouts/Sidebar/index.tsx` 加导航项，再写 `src/pages/<Page>/`
   并用 `MenuContentLayout` 包住内容；页面只做数据拼装与状态编排。
5. 非菜单页不受此约束，且**不需要手工登记**：检查脚本从 `src/layouts/Sidebar/index.tsx` 的
   `navItems` 取路径，经 `src/App.tsx` 的 `<Route>` 解析到 `src/pages/<Dir>`，解析不到的页面
   （如 `src/pages/Errors` 的 404）自动跳过。因此新增菜单页只要「加导航项 + 加路由」就会自动纳入
   校验；某条侧边栏路径解析不到页面目录时，检查直接报错，不会静默放过。

这条不是口头约定：`pnpm lint` 里的 `scripts/check-structure.mjs` 会检查每个页面是否用了
`<MenuContentLayout>`、`index.scss` 是否还残留 `.page`，不合规直接失败。

## 二、页面代码就近放，按五个维度拆分

**`src/features` 已废弃，不要重建**（结构检查会直接报错）。页面代码写在 `src/pages/<Page>/`
里，页面自己的组件、hook、工具函数都放页面目录下，只有**真正跨页面复用**的才上提到
`src/components` 或 `src/utils`。

拆分按这五个维度，属于哪类就落到哪个文件/目录，非公共的就近放在用它的目录里：

| 维度 | 放哪 | 判据 |
| --- | --- | --- |
| 类型 | `types.ts` | 跨文件共享的 type / interface，不放组件文件里 |
| 纯函数 | `utils.ts`，多了建 `utils/` 目录按主题拆多个文件 | 无 React 依赖；同一逻辑出现两处即上提 |
| 副作用 / 状态 | `hooks/`，一个 hook 一个文件 | 需要 useEffect / useState / 订阅 |
| 展示单元 | 一个组件一个目录：`<name>/index.tsx` + `index.scss` | 能在别处复用的 UI 片段 |
| 常量 | `constants.ts` | 魔法数字、文案、插件数组、存储键 |

其它硬性要求：

- 单个 `index.tsx` 只放一个组件，**不得**在一个文件里堆多个组件；超长文件按上面的维度拆开，
  `MarkdownPreviewModal` 这类公共组件同样适用（它现在拆成 `types.ts` / `constants.ts` /
  `hooks/` / `outline-nav/` / `footer/`）。
- 组件目录内**不嵌套** `components/` 层，子组件目录直接放父组件目录下。
- 页面目录内用相对路径，跨出页面目录一律用 `@/` 别名（结构检查会拦）。
- 在组件里定义的局部变量不要与 import 进来的组件/函数同名（例如两个图标别名不要叫
  `ActionIcon`，会和 Mantine 的 `ActionIcon` 撞名，读代码时极难分辨）。

## 三、公共能力不许重复实现

同一段逻辑出现第二处时，必须抽到 `src/utils/`（或就近的 `utils.ts`）再复用：

| 场景 | 用哪个 |
| --- | --- |
| 错误对象转提示文案 | `@/utils/error` 的 `getErrorMessage(err, fallback)` |
| 时间格式化 | `@/utils/format` 的 `formatClock` / `formatTime` / `formatDateTime` |
| 多 class 拼接 | `@/utils/cx` 的 `cx(...)`，不要手写模板串或空格拼接 |
| 剪贴板复制 | `@/utils/clipboard` 的 `copyText`（含 execCommand 兜底） |

## 四、每次改完代码，自检自改自优化一遍

提交或交付前**必须**再走一遍，不能只保证「能跑」：

1. `pnpm typecheck` / `pnpm lint` / `pnpm build` 全绿（`pnpm lint` 含结构检查与 `check:md`）。
2. 自查重复：有没有同样的文案、格式化、class 拼接、复制逻辑散在多处。
3. 自查复杂度：**禁止 O(n²)** 写法（在循环里 filter / find 已收集的结果、循环里反复展开数组），
   一律用 Map / Set / 单次遍历建索引；昂贵派生值用 `useMemo` 缓存，不要每次渲染重算。
4. 自查注释与实现是否一致（层级、常量、边界都说对了？），过时注释直接改掉。
5. 自查边界：空数组、加载失败、空态、越界索引（如 `activeIndex === -1`）是否都有明确处理，
   错误态不要谎报成空态。
6. 自查是否还有遗留的旧目录 / 旧引用（如 `features/…`、已删页面）与失效的文档段落。

## 五、其它硬约束（摘要）

- Markdown 弹窗预览统一用 `src/components/MarkdownPreviewModal`，不要在页面里另起 Modal +
  渲染器；编辑能力按文档类别放在**对应页面目录**里，不走 contentEditable 反向序列化。
  （细节与 prop 契约见 `CLAUDE.md`）
- 目录与命名：公共组件 `src/components/<PascalCase>/`，页面目录 `src/pages/<PascalCase>/`，
  每个组件目录 `index.tsx` + `index.scss`；跨目录导入统一用 `@/`，不造 barrel 文件。
- 服务状态**不做后台定时轮询**：只在进入页面、页面重新可见 / 窗口聚焦、手动刷新时取数，
  仅「有服务在启动/部署/操作中」时短暂按 1 秒刷新。新增页面不要自己加 setInterval 轮询。
- 前端 / 视觉类改动默认**不做浏览器实测**：不启 dev server、不截图验证，以
  `pnpm typecheck` 与 `pnpm lint` 为准；除非用户明确要求浏览器验证。
- 本机仓库数据（如 `../learn-english`）一律通过 `scripts/vite/*` 中间件读盘，不新增后端服务；
  写操作只在开发模式可用，且必须校验文件名。

## 六、提交约定

- 仓库内文件有改动时：完成即提交**一次**，只包含本次改动；提交前跑 `pnpm typecheck` /
  `pnpm lint`（husky 也会跑），有 origin 时随后推送，并在回复里报 commit hash 与推送结果。
- 纯只读任务、或没有仓库文件改动时，不要造空提交。
