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
pnpm start            # 后台起 agent + dev（复用 scripts/auto-start.sh，已在运行的不重复起）
pnpm stop             # 停止 agent 与 dev
pnpm typecheck        # 类型检查
pnpm lint             # ESLint + 目录结构 + 样式排版 + import 分组 + Markdown 往返
pnpm check:structure  # 仅目录结构检查
pnpm check:scss       # 仅样式排版检查（共享包 CLI liangqingda-check-scss）
pnpm check:imports    # 仅检查页面 / 组件 / 布局目录内部是否用了相对路径
pnpm component:new <路径> # 生成合规组件（index.tsx + index.scss）
pnpm test             # 单元测试 + 隔离 agent 的 HTTP/进程集成测试
pnpm test:e2e         # 浏览器交互和响应式布局回归测试
pnpm build            # 类型检查 + 构建
pnpm preview          # 预览构建产物
```

`lint` 依次跑 `eslint .` → `check:structure`（目录结构）→ `check:scss`（样式排版）→
`check:imports`（页面内部引用）→ `check:md`（Markdown 往返）；提交代码前 pre-commit
钩子会自动执行 `pnpm lint && pnpm typecheck`，不合规直接拦截提交。

分工（大部分规则已上提到共享包，本仓库只留项目特有部分）：

- import 的分组、组间空行、`@/pages/**` 排最后、值导入里的 `type` 需单独成句：由
  `@liangqingda/eslint-config` 的 `react-typed` 强制，`eslint.config.js` 不再覆写 `import/order`。
- 样式排版（块间空行 / 选择器列表 / 行尾空格）：由共享包的零依赖 CLI
  `liangqingda-check-scss src` 校验（`pnpm check:scss`）。
- `scripts/check-imports.mjs` 只保留一条 ESLint 表达不了的规则：页面 / 组件 / 布局目录
  内部必须用相对路径。
- `scripts/check-structure.mjs` 是项目事实（`features` 废弃、菜单页布局），不上提。

## 本机服务 agent

「服务」页展示并启停本机各开发服务（如 my-dashboard、study-lab）；根路由 `/` 直接跳到服务页，
不再有概览页。
浏览器无法直接操作本地进程，因此由本地 agent（`agent/server.mjs`，零依赖 Node HTTP
服务，仅监听 `127.0.0.1:8787`）负责探测、启停与编译状态判定；前端通过 Vite 的
`/api` 代理访问它。

使用方式：

```bash
pnpm start      # 后台起 agent + dev，一条命令起全套
pnpm stop       # 停止 agent 与 dev
```

也可以只跑 `pnpm dev` 前台起前端；需要 agent 时补一条 `pnpm start`，已在运行的
进程不会重复起。开发模式下前端需要时还会通过 Vite 的 `/api/agent/start` 中间件
自动拉起 agent，所以只跑 `pnpm dev` 也能用服务页；该中间件与 `/api` 代理都只存在于
dev server，服务页相关能力不适用于 `pnpm preview` 的构建产物。
`pnpm start` / `pnpm stop` 不要写成 `pnpm up`——`up` 是 pnpm 的内置 `update` 别名。

服务清单在 `agent/services.json` 登记（名称、工作目录、端口、启停命令、
编译成功/失败标记）。新增服务：往数组里加一条配置，重启 agent 即可。
可配置 `deployedUrl` 为部署后的网页地址，服务卡片会显示「线上网页」按钮，
在新标签页打开；本地服务停止或 agent 离线时仍可访问。
承载当前页面的服务（工作台自身）在配置里加 `stopDisabled: true`：状态接口把它返回成
`canStop: false`，卡片上的「停止」换成「重启」，agent 也会拒绝单独的停止请求——它一停，
这个页面就打不开了。重启自身时页面到 dev server 的代理会被一起切断，前端按「连接断开」
处理：等 dev server 重新上线后自动刷新状态，而不是报重启失败。

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

服务状态不再后台定时轮询：进入页面、页面重新可见 / 窗口聚焦、以及点页面标题右侧的刷新图标时
各取一次状态；只有「有服务在启动 / 部署 / 操作中」时才短暂按 1 秒刷新，空闲即停。
展开的日志每 2 秒更新，收起后停止读取。
页面标题右侧的刷新图标会通知当前页面重新取数（服务、英语都已订阅）：点下先转圈，
等页面取完数再提示「已刷新」，失败提示「刷新失败」，页面没有订阅刷新时提示「无需刷新」；
服务页在线时即靠它取数，不再单设按钮；只有离线后才显示「重新连接」入口。
同一排图标里的全屏按钮由 `MenuContentLayout` 自己持有：只把页面根元素铺满视口放大展示空间，
内容不变，再点一次或按 Esc 退出；「重启 agent」只在服务页出现。
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
右上角图标可切到表格平铺（按分类 / 更新时间排序），每行末尾的「操作」列有一个复制图标，
点一下复制这一篇的相对路径（`learning-record-notes/<文件名>`，相对记录仓库根目录）。

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
（详见 `docs/markdown-preview-modal.md`）：文档排版、表格与 `<details>` 折叠块、header 标题左侧的上一个 / 下一个、
`←` / `→` 快捷键，弹窗左侧固定的标题目录 sidebar，header 右侧的「复制相对路径」按钮，以及把框体
铺满视口（再点或 Esc 退出）的全屏按钮都在组件内；页面只决定相邻文档是谁、这一篇的相对路径是什么。
全屏是记住的偏好（存 `localStorage`），换篇、关掉重开、刷新页面后再打开都保持上次的样子。

弹窗没有 footer：编辑 / 预览 / 保存与关闭全在 header 右侧的图标按钮里（tooltip 说明含义），
编辑能力由页面注入（公共组件只给插槽，未定制时点编辑会提示
用 `.claude/skills/personalize-edit-markdown` 定制）。英语页注入的是块级编辑器（表格可删行 / 加行、格子可改，其余块直接改
源码），保存后写回源文件，并由同一个 Vite 中间件把该文件提交到记录仓库——只 stage 这一个文件，
提交信息半固定为 `docs(notes): 手动编辑 <文件名>`，正文说明来源；内容无变化不产生空提交，
提交失败不阻断保存，原因会显示在 header 的保存状态提示里。保存成功后只重新取这一篇。
上一篇 / 下一篇是换文档，不重挂弹窗也不退出全屏；换篇的复位（保存提示按标题失效、正文滚回顶部）
由组件自己处理，页面不要用 `key` 重挂弹窗。

编辑中若有未保存改动，点返回箭头（退出编辑）会先在 header 二次确认；编辑态标题目录仍可点，
由编辑器把对应块滚进视野，并高亮最近跳过去的那一节。编辑 / 草稿预览时刷新与全屏按钮不出现，
**弹窗也关不掉**（关闭按钮不渲染，Esc / 点遮罩只会弹一条「先退出编辑」的提示），退出编辑只能走
header 里的返回箭头，退出后关闭才恢复。
表格能否做成行 / 单元格矩阵由 `isStructuredTableSafe` 判定，含内联标签、`<thead>`、
`<tr>` 属性、嵌套表格、实体的表格整表降级为源码编辑，避免往返丢结构。

解析与回写的往返自检在仓库里（`pnpm check:md`，夹具见 `scripts/fixtures/md/`），
已验证「原文 → parse → serialize」逐字一致、删行 / 加行只动目标行。

## 目录结构

```
.husky/               # git 提交钩子（pre-commit 跑 lint + typecheck）
agent/                # 本机服务 agent（server.mjs、services.json、logs/）
scripts/              # 工程脚本（结构检查、组件脚手架）
src/
  layouts/            # 布局（BasicLayout / Header / Sidebar / MenuContentLayout）
  pages/              # 页面，页面代码与它的 components / hooks / utils 就近放在同一目录
    Services/         # 服务页（服务列表、日志、快捷命令）
    English/          # 英语笔记页（看板、预览、块级编辑器）
    Errors/           # 404
  services/           # 服务数据层（api / provider / types / hooks），跨页面共用
  components/         # 公共组件（如 MarkdownPreviewModal）
  utils/              # 公共纯函数（markdown-outline / error / format / cx / clipboard）
  styles/             # 全局样式与 design tokens
```

## 约定（由工具强制，不只靠自觉）

细则见 `docs/`（页面布局 / 代码拆分与命名 / 公共能力复用 / 预览弹窗 / Markdown 编辑 /
本机数据链路 / 自检清单）；两个入口文件都只有红线与索引：`CLAUDE.md`（Claude Code）、
`AGENTS.md`（其他 agent）。下面是其中被工具强制的最短版本：

- 路径别名：`@/*` → `src/*`
- 新增组件时，同级放置 `index.tsx` + `index.scss`（CSS Module 类名自动 camelCase）
- `src/components/**` 的目录与其下文件名必须是 PascalCase（如 `MarkdownPreviewModal/index.tsx`）
- 页面代码就近放 `src/pages/<Page>/`，按 `components` / `hooks` / `utils` / `types` /
  `constants` 五个维度适度拆分，非公共的不上提；页面内相对导入不得跨出该页面目录，
  跨目录一律用 `@/` 别名
- `src/features` 已废弃：目录出现即判定失败，页面代码请直接写进页面目录
- 新建组件用 `pnpm component:new <路径>`，脚手架默认产出即合规
- `pnpm check:structure` 强制以上结构规则；pre-commit 钩子拦截不合规提交
- 侧边栏导航在 `src/layouts/Sidebar/index.tsx` 的 `navItems` 中登记
