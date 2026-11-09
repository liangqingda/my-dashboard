# AGENTS.md

`my-dashboard` 的**唯一**协作入口：所有 agent 都读这份（Claude Code 通过根目录的 `CLAUDE.md`
软链读同一份内容）。本文件只放**必须照做、不许自行发挥**的条目和**细则索引**；
细节一律写在 `docs/` 下，碰到相关改动先读对应文件，不要凭印象。运行与脚本见 `README.md`。

## 改到这些地方，先读对应细则

| 场景 | 读 |
| --- | --- |
| 新增 / 改菜单页，动 `MenuContentLayout`、页面标题与内边距、页面呈现 | `docs/pages.md` |
| 拆分文件、决定某个函数 / 类型 / 常量放哪、目录与文件命名 | `docs/code-splitting.md` |
| 想写一段「好像别处也有」的工具函数（错误文案、时间、class、复制） | `docs/shared-utils.md` |
| 写 UI：直接用组件库还是封 `FreeXxx`、业务表格 / 弹窗怎么落 | `docs/ui-components.md` |
| 动 Markdown 预览弹窗（排版 / 标题导航 / 全屏 / header 操作 / 换篇） | `docs/markdown-preview-modal.md` |
| 做某类文档的编辑器、改块解析与回写、跑 `pnpm check:md` | `docs/markdown-editing.md` |
| 动 `scripts/vite/*` 中间件、`../learn-english` 读盘写盘与提交、笔记数据修源头 | `docs/local-repo-data.md` |
| 收尾 / 提交 / 交付前 | `docs/self-check.md` |

## 硬约束速览

1. **菜单页必须套 `MenuContentLayout`**，标题走 `title` prop；页面 `index.scss` 不得写 `.page`
   或页面级 `padding` / `height`。新增页 = 先加 `Sidebar` 导航项 + `App.tsx` 路由，页面自动纳入校验。
2. **页面代码就近放 `src/pages/<Page>/`**，只有真正跨页面复用的才上提 `src/components`
   或 `src/utils`；页面只做数据拼装与状态编排。
3. **按五维拆分**：类型 `types.ts` / 纯函数 `utils.ts`（多了建 `utils/`）/ 副作用 `hooks/` /
   展示单元 一组件一目录 / 常量 `constants.ts`。一个 `index.tsx` 只放一个组件，不嵌套 `components/`。
4. **公共能力不许重复实现**：错误文案 `getErrorMessage`、时间 `format*`、class `cx`、
   复制 `copyText`。同一逻辑出现第二处就上提。
5. **服务状态不做后台定时轮询**：只在进页面、页面重新可见 / 窗口聚焦、手动刷新时取数；
   仅「有服务在启动 / 部署 / 操作中」时短暂按 1 秒刷新。新页面不要自己加 `setInterval`。
6. **每次改完代码自检自改自优化一遍**（`docs/self-check.md`，发现问题直接改，不只在回复里列）：
   命令全绿（动 `agent/`、`scripts/vite/*` 还要 `pnpm test`）→ 按 `best-react-code` 的
   《Review 时的判据顺序》逐项过（数据流 / 性能 / 分层 / 副作用与竞态 / 注释）→
   本项目特有的事实（分层命名细则、读盘接口、残留清理）。通用判据只写在那份 skill 里，
   本项目 `docs/` 不复述。
7. **前端 / 视觉改动默认不做浏览器实测**：不启 dev server、不截图，以 `typecheck` / `lint` 为准，
   除非用户明确要求浏览器验证。
8. **本机仓库数据（如 `../learn-english`）只走 `scripts/vite/*` 中间件读盘**，不新增后端服务；
   写操作只在开发模式可用，且必须校验文件名（禁路径穿越）。
9. **UI 一律先用组件库**（Mantine）：按钮、图标按钮、表格、弹窗、输入框、tooltip、加载、
   提示、折叠、布局都不手写原生标签，先查 `docs/ui-components.md` 的「场景 → 用哪个」；
   第二处要同一套外观就封 `FreeXxx` 基础 UI 组件（现有 `FreeTable`），业务表格 / 弹窗基于它
   再封一层，不复制它的样式。
10. **Markdown 预览一律走 `src/components/MarkdownPreviewModal`**：不在页面里另起 Modal + 渲染器，
    不复制它的样式；渲染栈固定 `react-markdown` + `remark-gfm` + `rehype-raw`。
11. **编辑能力只走 `Editor` 插槽**，按文档类别放在对应页面目录里，通用的解析 / 控件才上提；
    新增一类可编辑文档先跑仓库内 skill `personalize-edit-markdown`。
    **禁止 contentEditable + DOM 反向序列化**（丢格式、与 React 抢 DOM、父级刷新时编辑内容消失）。
12. **内容出问题先改源头 md**，不在预览层加「兼容畸形数据」的兜底，判据见 `docs/local-repo-data.md`。

以上由工具兜底的部分：`pnpm lint` 依次跑 `eslint .`（通用规则全部来自
`@liangqingda/eslint-config` 的 `react-typed`：import 分组与空行、`@/pages/**` 排最后、
值导入里的 type 单独成句、命名、单文件 300 行上限等，原 `eslint.config.js` 的项目层
`import/order` 覆写已删除）、`scripts/check-structure.mjs`（features 废弃 / 页面组织 /
菜单页布局 / 入口文档行数与索引对应，项目事实不上提）、`liangqingda-check-scss src`（共享包零依赖 CLI，样式块间空行 /
选择器列表 / 行尾空格）、`scripts/check-imports.mjs`（只剩页面内部必须相对路径）与
`pnpm check:md`（Markdown 往返），不合规直接失败。禁裸 `eslint-disable` / 失效 disable /
`@ts-ignore` 由 `@liangqingda/eslint-config@1.6.0` 起的规则兜住（`eslint-comments` 与
`ban-ts-comment`），同样属于机器判的部分。

通用规范的落点分工：机器可判的规则在 `@liangqingda/eslint-config` 与 `@liangqingda/tsconfig`
（新项目直接用 `strictest.json`）；需要判断的拆分维度、性能反模式、注释语义写在
`best-react-code` skill；只有布局/弹窗/数据链路这类本项目事实才留在本文件与 `docs/`。

## 维护本文件

- 本文件是**入口不是手册**：只留硬约束（每条 1–3 行）与索引；契约表、行为清单、实现细节、
  示例命令一律写进 `docs/` 对应文件，这里只留链接和一句判据。
- **每次改动本文件都要顺手优化与拆分，不用等用户提**：新内容先判断是不是细则，是就写 `docs/`；
  发现某节变长、一个主题里混了多个主题、与 `docs/` 重复、或索引里没有对应文件，
  当场拆出去 / 合并 / 更新索引，再收尾。
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
