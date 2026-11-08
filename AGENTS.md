# AGENTS.md

`my-dashboard` 的跨 agent 协作入口（Claude Code 之外的 agent 读这份）。本文件只放
**必须照做、不许自行发挥**的条目和**细则索引**；细节都写在 `docs/` 下，
碰到相关改动先读对应文件，不要凭印象。

```text
AGENTS.md            本文件：硬约束速览 + 文档索引
docs/    细则：页面布局 / 代码拆分与命名 / 公共能力复用 / 自检清单
CLAUDE.md            组件契约（MarkdownPreviewModal）、编辑能力、本机数据链路
README.md            运行、脚本、目录结构
```

## 改到这些地方，先读对应细则

| 场景 | 读 |
| --- | --- |
| 新增 / 改菜单页，动 `MenuContentLayout`、页面标题与内边距 | `docs/pages.md` |
| 拆分文件、决定某个函数 / 类型 / 常量放哪、目录与文件命名 | `docs/code-splitting.md` |
| 想写一段「好像别处也有」的工具函数（错误文案、时间、class、复制） | `docs/shared-utils.md` |
| 收尾 / 提交 / 交付前 | `docs/self-check.md` |
| 动 Markdown 预览弹窗、笔记编辑器、`learn-english` 读盘 | `CLAUDE.md` |

## 硬约束速览

1. **菜单页必须套 `MenuContentLayout`**，标题走 `title` prop；页面 `index.scss` 不得写 `.page`
   或页面级 `padding` / `height`。新增页 = 先加 `Sidebar` 导航项 + `App.tsx` 路由，页面自动纳入校验。
2. **`src/features` 已废弃，不要重建**；页面代码就近放 `src/pages/<Page>/`，只有真正跨页面复用的
   才上提 `src/components` 或 `src/utils`。
3. **按五维拆分**：类型 `types.ts` / 纯函数 `utils.ts`（多了建 `utils/`）/ 副作用 `hooks/` /
   展示单元 一组件一目录 / 常量 `constants.ts`。一个 `index.tsx` 只放一个组件，不嵌套 `components/`。
4. **公共能力不许重复实现**：错误文案 `getErrorMessage`、时间 `format*`、class `cx`、
   复制 `copyText`。同一逻辑出现第二处就上提。
5. **服务状态不做后台定时轮询**：只在进页面、页面重新可见 / 窗口聚焦、手动刷新时取数；
   仅「有服务在启动 / 部署 / 操作中」时短暂按 1 秒刷新。新页面不要自己加 `setInterval`。
6. **每次改完代码自检自改自优化一遍**（`docs/self-check.md` 六条）：三命令全绿 →
   查重复 → 禁 O(n²) → 注释与实现一致 → 空态 / 错误态 / 越界 → 清旧目录旧引用旧文档。
7. **前端 / 视觉改动默认不做浏览器实测**：不启 dev server、不截图，以 `typecheck` / `lint` 为准，
   除非用户明确要求浏览器验证。
8. **本机仓库数据（如 `../learn-english`）只走 `scripts/vite/*` 中间件读盘**，不新增后端服务；
   写操作只在开发模式可用，且必须校验文件名（禁路径穿越）。

以上由工具兜底的部分：`pnpm lint` 依次跑 `eslint .`（通用规则全部来自
`@liangqingda/eslint-config` 的 `react-typed`：import 分组与空行、`@/pages/**` 排最后、
值导入里的 type 单独成句、命名、单文件 300 行上限等，原 `eslint.config.js` 的项目层
`import/order` 覆写已删除）、`scripts/check-structure.mjs`（features 废弃 / 页面组织 /
菜单页布局，项目事实不上提）、`liangqingda-check-scss src`（共享包零依赖 CLI，样式块间空行 /
选择器列表 / 行尾空格）、`scripts/check-imports.mjs`（只剩页面内部必须相对路径）与
`pnpm check:md`（Markdown 往返），不合规直接失败。

通用规范的落点分工：机器可判的规则在 `@liangqingda/eslint-config` 与 `@liangqingda/tsconfig`
（新项目直接用 `strictest.json`）；需要判断的拆分维度、性能反模式、注释语义写在
`best-react-code` skill；只有布局/弹窗/数据链路这类本项目事实才留在本文件与 `docs/`。

## 提交约定

- 仓库内文件有改动时：完成即提交**一次**，只包含本次改动；提交前跑 `pnpm typecheck` /
  `pnpm lint`（husky 也会跑），有 origin 时随后推送，并在回复里报 commit hash 与推送结果。
- 纯只读任务、或没有仓库文件改动时，不要造空提交。
- 改了约定就要同步：细则写 `docs/`，本文件只留速览与索引，别把细则搬回来。
