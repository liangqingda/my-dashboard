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
pnpm dev              # 本地开发（默认端口 3000）
pnpm agent            # 前台运行本机服务 agent（默认 127.0.0.1:8787）
pnpm agent:bg         # 后台运行 agent（日志 /tmp/my-dashboard-agent.log）
pnpm agent:stop       # 停止 agent
pnpm typecheck        # 类型检查
pnpm lint             # ESLint + 目录结构检查
pnpm check:features   # 仅目录结构检查
pnpm feature:new <名> # 生成一个 feature 模块（kebab-case）
pnpm component:new <路径> # 生成合规组件（index.tsx + index.scss）
pnpm build            # 类型检查 + 构建
pnpm preview          # 预览构建产物
```

`lint` 会在 ESLint 之后跑 `check:features`（目录结构检查）；提交代码前 pre-commit
钩子会自动执行 `pnpm lint && pnpm typecheck`，不合规直接拦截提交。

## 本机服务 agent

「服务」页与首页概览展示并启停本机各开发服务（如 my-dashboard、study-lab）。
浏览器无法直接操作本地进程，因此由本地 agent（`agent/server.mjs`，零依赖 Node HTTP
服务，仅监听 `127.0.0.1:8787`）负责探测、启停与编译状态判定；前端通过 Vite 的
`/api` 代理访问它。

使用方式：

```bash
pnpm agent:bg   # 先启动 agent
pnpm dev        # 再启动前端（默认 3000）
```

服务清单在 `agent/services.json` 登记（名称、工作目录、启停命令、进程探测模式、
编译成功/失败标记）。新增服务：往数组里加一条配置，重启 agent 即可。
日志落在 `agent/logs/<serviceId>.log`。

agent API：

```
GET  /api/health               健康检查
GET  /api/services             所有服务状态（运行态 / 编译状态 / 日志尾部）
GET  /api/services/:id/log     日志尾部（?lines=N）
POST /api/services/:id/start   启动服务
POST /api/services/:id/stop    停止服务
```

## 目录结构

```
.husky/               # git 提交钩子（pre-commit 跑 lint + typecheck）
agent/                # 本机服务 agent（server.mjs、services.json、logs/）
scripts/              # 工程脚本（结构检查、feature/组件脚手架）
src/
  layouts/            # 布局（BasicLayout / Header / Sidebar）
  pages/              # 页面（各信息模块，如 Home / Services）
  features/services/  # 服务模块（types / api / hooks / 组件）
  styles/             # 全局样式与 design tokens
```

## 约定（由工具强制，不只靠自觉）

- 路径别名：`@/*` → `src/*`
- 新增组件时，同级放置 `index.tsx` + `index.scss`（CSS Module 类名自动 camelCase）
- 组件目录使用 kebab-case 命名
- `src/features/**`：目录一律 kebab-case；组件目录必须有 index.scss；不嵌套
  `components/`（子组件直接放父组件目录）；跨模块一律用 `@/features/...` 别名，
  禁止相对导入跨出模块
- 新建 feature 用 `pnpm feature:new <名>`；新建组件用 `pnpm component:new <路径>`，
  脚手架默认产出即合规
- `pnpm check:features` 强制以上结构规则；pre-commit 钩子拦截不合规提交
- 侧边栏导航在 `src/layouts/Sidebar/index.tsx` 的 `navItems` 中登记
