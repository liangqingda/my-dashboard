# AGENTS.md

`my-dashboard` 的**唯一**协作入口：所有 agent 都读这份（Claude Code 通过根目录的 `CLAUDE.md`
软链读同一份内容）。本文件只放**必须照做、不许自行发挥**的条目和**细则索引**；
细节一律写在 `docs/` 下，碰到相关改动先读对应文件，不要凭印象。运行与脚本见 `README.md`。

## 改到这些地方，先读对应细则

| 场景 | 读 |
| --- | --- |
| 新增 / 改名或改路由 / 改菜单页，动 `MenuContentLayout`、页面标题与内边距、页面呈现 | `docs/pages.md` |
| 新增 / 拆分文件、决定函数 / 类型 / 常量 / 说明文档放哪，目录与文件命名、import 分组 | `docs/code-splitting.md` |
| 想写一段「好像别处也有」的工具函数（错误文案、时间、class、复制） | `docs/shared-utils.md` |
| 想新装一个依赖，或想自己写一段「社区 / `@mantine/hooks` 好像也有」的函数、hook | `docs/dependencies.md` |
| 新写任何 UI：直接用组件库还是封 `FreeXxx`、公共组件放哪个分类目录、业务表格 / 弹窗怎么落 | `docs/ui-components.md` |
| 给弹窗接「收起到程序坞」、改程序坞停靠 / 动画 / 层级 / 全局设置面板、新增可收起窗口类别 | `docs/dock.md` |
| 想抽公共 / 判一段 UI 与逻辑各自该不该提、提到哪一层（整块、只提 UI 壳、只提逻辑） | `docs/reuse-boundaries.md` |
| 新建或改造任何 Markdown / 文档预览，动弹窗排版 / 标题导航 / 全屏 / header 操作 | `src/components/modals/MarkdownPreviewModal/README.md` |
| 新建或改造某类文档的编辑器、改块解析与回写、跑 `pnpm check:md` | `docs/markdown-editing.md` |
| 新建 / 修改任何规范文档：`docs/`、入口 `AGENTS.md`、组件或 hook 的 `README.md` | `docs/doc-writing.md` |
| 要在 `../learn-english` 这类目标仓库里加能力 / 改它的代码或数据、新增或修改本机仓库读写、动 `scripts/vite/*` 与自动提交、笔记数据修源头 | `docs/local-repo-data.md` |
| 收尾 / 提交 / 交付前 | `docs/self-check.md` |
| 自审 / 开发中遇到工具兜不住、容易返工的常见小坑，对照已积累条目修复并补记 | `docs/lessons.md` |

## 硬约束速览

本节的收留标准：**跨主题生效、索引表管不到**的规则才写在这里；只在某个主题内生效的
（菜单布局、数据链路、预览弹窗、编辑器插槽、内容改源头）细则都在上表对应文件里。

1. **页面代码就近放 `src/pages/<Page>/`**，只有真正跨页面复用的才上提 `src/components`
   或 `src/utils`；页面只做数据拼装与状态编排。
2. **按五维拆分**：类型 `types.ts` / 纯函数 `utils.ts`（多了建 `utils/`）/ 副作用 `hooks/` /
   展示单元 一组件一目录 / 常量 `constants.ts`。一个 `index.tsx` 只放一个组件，不嵌套 `components/`。
3. **公共能力先查清单**：新增同类能力先看 `docs/shared-utils.md` 的现有入口，不在页面里另写一份；
   通用判据见 `best-react-code`，本项目只维护清单与落点。
4. **服务状态不做后台定时轮询**：只在进页面、页面重新可见 / 窗口聚焦、手动刷新时取数；
   仅「有服务在启动 / 部署 / 操作中」时短暂按 1 秒刷新。新页面不要自己加 `setInterval`。
5. **每次改完代码自检两轮**：按 `best-react-code`《两轮自检》执行，本项目第二轮额外检查见
   `docs/self-check.md`；发现问题直接改，回复里写明第二轮结果。
6. **前端 / 视觉改动默认不做浏览器实测**：不启 dev server、不截图，以 `typecheck` / `lint` 为准，
   除非用户明确要求浏览器验证。
7. **UI 一律先用组件库**（Mantine）：按钮、图标按钮、表格、弹窗、输入框、tooltip、加载、
   提示、折叠、布局都不手写原生标签，先查 `docs/ui-components.md` 的「场景 → 用哪个」；
   某类对象全站只允许一种形态就封 `FreeXxx`（`Free` = 全站唯一入口，不是「包了组件库」；
   只提供某个动作、不构成唯一入口的件不挂 `Free`），业务表格 / 弹窗基于它再封一层，不复制它的
   样式；封壳时连**默认交互与键位**一起收进来（关窗、翻篇、全屏这类「同一时刻只能有一套」的
   行为），业务层不再各自监听。
8. **说明文档跟着代码走**：组件 / hook / 页面自己的规格写在其目录的 `README.md`（hook 要写说明
   时提升为 `hooks/<hook>/index.ts` + `README.md`），不进 `docs/`——`docs/` 只放跨文件的约定与
   流程，判据见 `docs/code-splitting.md`。
9. **不做历史兼容**（单人本地自用）：改名 / 改格式 / 改字段一律硬切——旧路由不加重定向、
   旧存储键与旧字段不写迁移，旧链接直接 404、旧数据直接丢弃；本机 agent 旧进程的在线热升级保留（运行时自愈）。

以上由工具兜底的部分：`pnpm lint` 依次跑 `eslint .`（通用规则全部来自
`@liangqingda/eslint-config` 的 `react-typed`：import 分组与空行、`@/pages/**` 排最后、
值导入里的 type 单独成句、命名、单文件 300 行上限等，原 `eslint.config.js` 的项目层
`import/order` 覆写已删除）、`scripts/check-structure.mjs`（features 废弃 / 页面组织 /
菜单页布局 / 键位归属（业务层不得监听 `keydown`）/ **越过 Free 层直连（`Modal` / `Table` /
`TextInput` / `ActionIcon`）/ 公共组件缺 `README.md` / 样式里自己写 `text-overflow: ellipsis`** /
入口文档行数与索引对应 / `CLAUDE.md` 软链形态，项目事实不上提；例外要在脚本白名单里登记）、
`liangqingda-check-scss src`（共享包零依赖 CLI，样式块间空行 / 选择器列表 / 行尾空格 /
类名：非 ASCII、数字或连字符开头、下划线、同文件混用 camelCase 与 kebab-case）、
`scripts/check-imports.mjs`（页面内部必须相对路径 / `dependencies` 都有源码 import）与 `pnpm check:md`（Markdown 往返），
不合规直接失败。禁裸 `eslint-disable` / 失效 disable / `@ts-ignore`
由 `@liangqingda/eslint-config@1.6.0` 起的规则兜住（`eslint-comments` 与 `ban-ts-comment`）。

通用规范的落点分工：机器可判的规则在 `@liangqingda/eslint-config` 与 `@liangqingda/tsconfig`
（新项目直接用 `strictest.json`）；需要判断的拆分维度、公共化边界、性能反模式、注释语义写在
`best-react-code` skill，文档写法与 Markdown 编辑器安全分别见 `best-docs` / `best-markdown-editing`；
只有布局/弹窗/数据链路这类本项目事实才留在本文件与 `docs/`。

## 维护本文件（每次改动都要自优化，不用等用户提）

1. **先分类再落位**：新内容属于 ①跨文件的细则（实现细节、契约表、行为清单、示例命令）→
   写进 `docs/`；只属于某个组件 / hook / 页面的规格 → 写它自己目录的 `README.md`；
   ②跨主题约束 → 写进「硬约束速览」，每条 1–3 行；③场景路由 → 写进索引表。
2. **按触发点判断去留**：某条规则只在某个主题内生效、而索引已经能路由过去 → 它属于那份
   `docs/`，入口里就是重复，删掉；只在「还不知道该读哪份文档」时也必须生效的，才留在入口。
3. **机器可判的不写进来**：`eslint` / `check-structure` 已会拦的（命名、行数上限、`features`
   废弃、菜单布局、软链形态），靠 lint 失败反馈，不在入口复述。
4. **索引行的触发条件要覆盖「新建」**：别只写「动 X」——新建一个预览、新写一段读盘同样要能
   命中那一行，否则规则藏在 `docs/` 里等于没人读。
5. **顺手清重复**：通读相邻条目，同一件事写两遍的合一，详情已搬走的删掉，不留「对照版」。
   本节增删条目后会重新编号，所以**别处引用一律用条目标题或 `docs/` 文件名，不要用「硬约束 N」**。
6. **规则句要能删掉例子独立成立**：例子只作注脚，不许用组件清单 / 目录快照 / 事故复盘来定义
   边界（判据见 `docs/doc-writing.md`）。
7. **收尾必跑 `pnpm lint`**：行数上限与索引双向校验都在里面，绿了再提交。

- **硬阈值**：本文件不超过 100 行，`scripts/check-structure.mjs` 在 `pnpm lint` 里校验，超了即失败——
  不是让你放宽阈值，是让你把内容拆到 `docs/`。
- `docs/` 一个文件只讲一个主题；新增 `docs/` 文件必须同时加进上面的索引表（只有这一张表）。
- **`CLAUDE.md` 只能是指向本文件的软链**：不要再写第二份内容，结构检查会比对，漂移即失败。

## 提交约定

- 仓库内文件有改动时：完成即提交**一次**，只包含本次改动；提交前跑 `pnpm typecheck` /
  `pnpm lint`（husky 也会跑；改到 `agent/` 或 `scripts/vite/*` 再加 `pnpm test`），有 origin 时
  随后推送，并在回复里报 commit hash 与推送结果。
- 纯只读任务、或没有仓库文件改动时，不要造空提交。
- 改了约定就要同步：细则写 `docs/`，本文件只留速览与索引，别把细则搬回入口文件。
