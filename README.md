# My Dashboard

个人工作台。首页以独立小卡片聚合各类信息，目前包含本机服务卡片；服务页提供启停、重启、部署、实时日志、快捷命令及最近操作；英语页把 learn-english 仓库里的全部学习记录做成可搜索的索引卡。

## 技术栈

- React 19 + TypeScript + Vite
- UI：Mantine（`@mantine/core`、`@mantine/hooks`），图标 `@tabler/icons-react`
- 路由：`react-router`
- 规范：`@liangqingda/eslint-config`、`@liangqingda/tsconfig`
- 样式：SCSS，`.scss` 默认按 CSS Module 使用（由 vite 插件隐式处理）

## 环境

使用 Node.js 24+、pnpm 11；本机 agent 使用 macOS/Linux 的 `ps`、`pgrep` 和 `lsof`。数据库命令在服务清单中按当前电脑配置。

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
pnpm test             # 单元测试 + 隔离 agent 的 HTTP/进程集成测试
pnpm test:e2e         # 浏览器交互和响应式布局回归测试
pnpm build            # 类型检查 + 构建
pnpm preview          # 预览构建产物
```

`lint` 会在 ESLint 之后跑 `check:features`（目录结构检查）；提交代码前 pre-commit
钩子会自动执行 `pnpm lint && pnpm typecheck`，不合规直接拦截提交。

## 本机服务 agent

「服务」页展示并启停本机各开发服务（如 my-dashboard、study-lab），首页以独立卡片展示这些服务的状态。
浏览器无法直接操作本地进程，因此由本地 agent（`agent/server.mjs`，零依赖 Node HTTP
服务，仅监听 `127.0.0.1:8787`）负责探测、启停与编译状态判定；前端通过 Vite 的
`/api` 代理访问它。

使用方式：

```bash
pnpm agent:bg   # 先启动 agent
pnpm dev        # 再启动前端（默认 3000）
```

服务清单在 `agent/services.json` 登记（名称、工作目录、端口、启停命令、
编译成功/失败标记）。新增服务：往数组里加一条配置，重启 agent 即可。
可配置 `deployedUrl` 为部署后的网页地址，服务卡片会显示「线上网页」按钮，
在新标签页打开；本地服务停止或 agent 离线时仍可访问。

进程归属按实际监听端口校验。Node 开发服务同时校验可执行文件和项目工作目录；
PostgreSQL、Redis 等服务通过 `executable` 配置指定绝对可执行文件路径。
不会再通过 `node_modules/` 或 `scripts/dev.mjs` 的全局子串匹配终止进程。
`launcherScript` 可配置项目内的开发编排脚本（如 `scripts/dev.mjs`），只会在已确认
监听进程的祖先链中查找它。需要由 brew 等工具管理的服务继续使用 `stopCmd`，
停止失败返回错误，不会强行杀掉外部托管的数据库。

运行日志位于 `agent/logs/<serviceId>.log`，部署日志单独位于
`agent/logs/<serviceId>-deploy.log`，部署输出不会改变运行服务的编译状态。
日志尾部按字节分块读取（最多 256 KiB / 1000 行）；每 30 秒检查轮转，超过
5 MiB 时复制归档并截断原文件，保留 3 份归档。该方式保留运行进程的写入描述符；
复制与截断瞬间可能丢失少量并发写入。启动期间暂缓轮转且禁止清空日志。

页面可见时每 5 秒更新状态，启动/部署期间每秒更新，断线后每 10 秒重试；
后台页面暂停状态轮询，切回时立即刷新。展开的日志每 2 秒更新，收起后停止读取。
最近操作与全局快捷命令通过服务统计旁的按钮打开弹窗，快捷命令在打开时读取，支持刷新及点击复制。
离线时保留旧数据及更新时间，禁用服务操作；恢复连接后，已打开的快捷命令弹窗自动重新加载。
最近操作存放于当前浏览会话的 sessionStorage（最多 8 条）。

所有 agent 请求都会验证 Host 和浏览器 Origin，写操作还需携带进程会话令牌。
前端自动调用 `GET /api/session` 建立会话，通过 `X-Dashboard-Token` 发送令牌，
agent 重启后自动更新令牌。未提供正确令牌的写请求和不可信来源均返回 403。
开发模式下，若旧 agent 缺少会话接口，前端会先通过 Vite 升级 agent，再继续原操作；
升级入口检查健康接口的 `protocolVersion`，使用现有令牌重启已支持认证的版本。
升级过程中的连接断开通过只读探测确认恢复，不重复发送重启命令。
Vite 的 agent 启动入口要求同源 Origin 和 `X-Dashboard-Request: 1`。
默认允许 localhost / 127.0.0.1 的 3000、4173 页面以及 `[::1]:3000`；可通过
`AGENT_ALLOWED_ORIGINS` 指定逗号分隔的完整来源列表。Vite 固定使用 3000，
端口冲突直接报错，避免控制页悄悄换端口。

agent 还支持 `AGENT_PORT`、`AGENT_HOST`、`AGENT_START_TIMEOUT`，以及供隔离环境
使用的 `AGENT_CONFIG_FILE`、`AGENT_LOG_DIR`。Vite 代理固定连接 127.0.0.1:8787，
修改 agent 地址时应同时调整 Vite 配置。

agent API：

```
GET  /api/session              获取当前进程的写操作令牌
GET  /api/health               健康检查
GET  /api/services             所有服务状态（运行态 / 编译状态 / 日志尾部）
GET  /api/services/:id/log     日志尾部（?lines=N）
POST /api/services/:id/start   启动服务
POST /api/services/:id/stop    停止服务
POST /api/services/:id/restart 原子化停止并重新启动
POST /api/services/:id/deploy  异步部署
POST /api/services/:id/log/clear 清空日志（?kind=service|deploy）
POST /api/agent/restart       重启 agent
```

## 回归测试

`pnpm test` 仅操作临时目录、动态分配的端口和测试自己创建的进程，不启停清单中的真实服务。
浏览器测试使用模拟 API，覆盖停止失败、会话续期、部署完成、日志更新、离线恢复、
320 / 390 / 768 / 1024 / 1440px 布局以及主题持久化。

首次运行浏览器测试前安装 Chromium：

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

也可使用已安装的 Chrome：

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' pnpm test:e2e
```

页面截图与测试失败时的 trace 存放于已忽略的 `test-results/`。

## 英语页

「英语」页只展示同级目录 `../learn-english` 仓库 `learning-record-notes/` 下的 Markdown
笔记：六列看板（错题 / 短语 / 用法 / 语法 / 词汇 / 混合，一列一类，按文件名第一个 `-` 前缀分类），
整页不滚动、每列各自纵向滚动，列内按文件名排序；列表只露出文件名，点文件名在弹窗里看全文。

数据不经过本机 agent，由 Vite 插件 `scripts/vite/english-notes.ts` 直接读盘：

- 开发：`GET /api/english/notes` 每次请求实时读取该目录下的 `*.md`（排除目录自带的
  `README.md`），写完新笔记刷新页面即可看到，无需重启服务；`GET /api/english/notes?name=…`
  只返回这一篇，弹窗打开时用它取最新正文，避免先显示旧内容再跳变。
- 保存：`PUT /api/english/notes`（body `{ name, content }`）写完再自动提交记录仓库；
  文件名必须匹配 `^[\w.-]+\.md$ 且解析后仍落在笔记目录内，否则 400。
- 构建：同一份内容作为 `english-notes.json` 写进产物，供预览与静态部署使用（只读快照，
  保存能力仅开发模式提供）。
- 列表按文件最后修改时间倒序；页面打开单篇时才去取正文，切换上一篇 / 下一篇只请求那一篇。

记录仓库不在 `../learn-english` 时，用环境变量指定绝对路径：

```bash
ENGLISH_RECORDS_DIR=/path/to/learn-english pnpm dev
```

Markdown 弹窗预览统一使用公共组件 `src/components/MarkdownPreviewModal`
（详见 `CLAUDE.md`）：文档排版、表格与 `<details>` 折叠块、header 标题左侧的上一个 / 下一个、
`←` / `→` 快捷键，以及弹窗左上角框体之外的标题目录都在组件内；页面只决定相邻文档是谁。

弹窗 footer 有「编辑」和「关闭」，编辑能力由页面注入（公共组件只给插槽，未定制时点编辑会提示
用 `.claude/skills/personalize-edit-markdown` 定制）。英语页注入的是块级编辑器（表格可删行 / 加行、格子可改，其余块直接改
源码），保存后写回源文件，并由同一个 Vite 中间件把该文件提交到记录仓库——只 stage 这一个文件，
提交信息半固定为 `docs(notes): 手动编辑 <文件名>`，正文说明来源；内容无变化不产生空提交，
提交失败不阻断保存，原因会显示在 footer 的「已保存」提示后面。保存成功后只重新取这一篇。

编辑中若有未保存改动，点关闭 / Esc / 遮罩会先在 footer 二次确认；编辑态标题目录置灰不可点。
表格能否做成行 / 单元格矩阵由 `isStructuredTableSafe` 判定，含内联标签、`<thead>`、
`<tr>` 属性、嵌套表格、实体的表格整表降级为源码编辑，避免往返丢结构。

解析与回写的往返自检在仓库里（`pnpm check:md`，夹具见 `scripts/fixtures/md/`），
已验证「原文 → parse → serialize」逐字一致、删行 / 加行只动目标行。

## 目录结构

```
.husky/               # git 提交钩子（pre-commit 跑 lint + typecheck）
agent/                # 本机服务 agent（server.mjs、services.json、logs/）
scripts/              # 工程脚本（结构检查、feature/组件脚手架）
src/
  layouts/            # 布局（BasicLayout / Header / Sidebar）
  pages/              # 页面（各信息模块，如 Home / Services / English）
  components/         # 公共组件（如 MarkdownPreviewModal）
  features/services/  # 服务模块（types / api / hooks / 组件）
  features/english-notes/  # 英语笔记模块（笔记读取、文件名索引）
  styles/             # 全局样式与 design tokens
```

## 约定（由工具强制，不只靠自觉）

- 路径别名：`@/*` → `src/*`
- 新增组件时，同级放置 `index.tsx` + `index.scss`（CSS Module 类名自动 camelCase）
- `src/components/**` 的目录与其下文件名必须是 PascalCase（如 `MarkdownPreviewModal/index.tsx`）
- `src/features/**`：目录一律 kebab-case；组件目录必须有 index.scss；不嵌套
  `components/`（子组件直接放父组件目录）；跨模块一律用 `@/features/...` 别名，
  禁止相对导入跨出模块
- 新建 feature 用 `pnpm feature:new <名>`；新建组件用 `pnpm component:new <路径>`，
  脚手架默认产出即合规
- `pnpm check:features` 强制以上结构规则；pre-commit 钩子拦截不合规提交
- 侧边栏导航在 `src/layouts/Sidebar/index.tsx` 的 `navItems` 中登记
