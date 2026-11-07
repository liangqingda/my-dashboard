# AGENTS.md

`my-dashboard` 的跨 agent 协作入口：Claude Code 之外的 agent（Codex、豆包等）读这份。
完整约定见 `CLAUDE.md`（组件契约、编辑能力、数据链路等细节都在那边）；本文件只列**必须照做、
不许自行发挥**的硬约束。硬约束与 `CLAUDE.md` 冲突时，先按本文件执行，并同步修正 `CLAUDE.md`。

## 一、菜单页面必须用 MenuContentLayout

侧边栏菜单项对应的页面（当前为 `概览` / `服务` / `英语`，即 `src/pages/<Page>/index.tsx`），
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

这条不是口头约定：`pnpm lint` 里的 `scripts/check-features.mjs` 会检查每个页面是否用了
`<MenuContentLayout>`、`index.scss` 是否还残留 `.page`，不合规直接失败。

## 二、其它硬约束（摘要）

- Markdown 弹窗预览统一用 `src/components/MarkdownPreviewModal`，不要在页面里另起 Modal +
  渲染器；编辑能力按文档类别放在各自 feature 里，不走 contentEditable 反向序列化。
  （细节与 prop 契约见 `CLAUDE.md`）
- 目录与命名：公共组件 `src/components/<PascalCase>/`，功能模块 `src/features/<kebab-case>/`，
  每个组件目录 `index.tsx` + `index.scss`；跨模块导入统一用 `@/`，不造 barrel 文件。
- 前端 / 视觉类改动默认**不做浏览器实测**：不启 dev server、不截图验证，以
  `pnpm typecheck` 与 `pnpm lint` 为准；除非用户明确要求浏览器验证。
- 本机仓库数据（如 `../learn-english`）一律通过 `scripts/vite/*` 中间件读盘，不新增后端服务；
  写操作只在开发模式可用，且必须校验文件名。

## 三、提交约定

- 仓库内文件有改动时：完成即提交**一次**，只包含本次改动；提交前跑 `pnpm typecheck` /
  `pnpm lint`（husky 也会跑），有 origin 时随后推送，并在回复里报 commit hash 与推送结果。
- 纯只读任务、或没有仓库文件改动时，不要造空提交。
