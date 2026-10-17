# My Dashboard

关注信息的个人工作台（前端框架）。

## 技术栈

- React 19 + TypeScript + Vite
- UI：Mantine（`@mantine/core`、`@mantine/hooks`），图标 `@tabler/icons-react`
- 路由：`react-router`
- 规范：`@liangqingda/eslint-config`、`@liangqingda/tsconfig`
- 样式：SCSS，`.scss` 默认按 CSS Module 使用（由 vite 插件隐式处理）

## 脚本

```bash
pnpm dev        # 本地开发（默认端口 3000）
pnpm typecheck  # 类型检查
pnpm lint       # ESLint
pnpm build      # 类型检查 + 构建
pnpm preview    # 预览构建产物
```

## 目录结构

```
src/
  layouts/          # 布局（BasicLayout / Header / Sidebar）
  pages/            # 页面（各信息模块）
  styles/           # 全局样式与 design tokens
```

## 约定

- 路径别名：`@/*` → `src/*`
- 新增组件时，同级放置 `index.tsx` + `index.scss`（CSS Module 类名自动 camelCase）
- 侧边栏导航在 `src/layouts/Sidebar/index.tsx` 的 `navItems` 中登记
