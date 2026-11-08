# 菜单页与布局

侧边栏菜单项对应的页面（当前为 `服务` / `英语`）必须套 `src/layouts/MenuContentLayout`，
**新增菜单页同样适用**。非菜单页（如 404）不受此约束。

## MenuContentLayout 负责什么

1. 标题通过 `title` prop 传入（`ReactNode`）。标题样式固定在组件内（Mantine `Title order={2}`
   加统一字距），页面**不得**再自己写 `<Title>`、字号、字重。
2. 内容区内边距固定 `14px 12px`，标题与内容的间距、纵向排列由组件负责。页面 `index.scss`
   **不得**定义 `.page` 选择器，也不得设置页面级 `padding` / `height`。
3. 「整页不滚动、滚动只发生在内部子区域」的页面（如英语看板）传 `fill`，高度由组件按
   `calc(100dvh - var(--app-header-height))` 计算，页面不要自己写高度或 `100dvh`。

## 新增一个菜单页

1. 在 `src/layouts/Sidebar/index.tsx` 的 `navItems` 里加导航项；
2. 在 `src/App.tsx` 加 `<Route>`，指向 `src/pages/<Page>/index.tsx`；
3. 页面用 `MenuContentLayout` 包住内容，只做数据拼装与状态编排；
4. 页面目录需要 `index.scss`（哪怕只是注释——结构检查要求两者成对）。

顺序不能反：先有导航项与路由，页面才自动纳入校验。

## 校验机制（`scripts/check-structure.mjs` 的 `checkMenuPages`）

「哪些页面算菜单页」不靠手工白名单：脚本从 `Sidebar` 的 `navItems` 取路径，经 `App.tsx` 的
`<Route>` 解析到 `src/pages/<Dir>`，解析不到的页面自动跳过；某条侧边栏路径解析不到目录时
检查直接报错。因此新增页只要「加导航项 + 加路由」就会自动纳入，漏登记不会静默放过。

检查内容：页面是否用了 `<MenuContentLayout>`、`index.scss` 是否残留 `.page` 选择器。
由 `pnpm lint` 执行，不合规直接失败。
