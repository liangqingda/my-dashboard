# CLAUDE.md

`my-dashboard` 的协作入口（Claude Code 读这份）。只放**不可绕过的红线**和**细则索引**：
细节一律写在 `docs/` 下，动手前按索引读对应文件，不要凭印象。
运行与脚本见 `README.md`，跨 agent 的硬约束速览与提交约定见根目录 `AGENTS.md`。

## 细则索引

| 场景 | 读 |
| --- | --- |
| 动 Markdown 预览弹窗（排版 / 标题导航 / 全屏 / header 操作 / 换篇） | `docs/markdown-preview-modal.md` |
| 给某类文档做编辑器、改块解析与回写、`pnpm check:md` | `docs/markdown-editing.md` |
| 动 `scripts/vite/*`、`../learn-english` 读盘写盘与提交、笔记数据修源头 | `docs/local-repo-data.md` |
| 新增 / 改菜单页，动 `MenuContentLayout`、页面标题与内边距、页面呈现 | `docs/pages.md` |
| 拆文件、决定函数 / 类型 / 常量放哪、命名与 import 分组 | `docs/code-splitting.md` |
| 想写一段「好像别处也有」的工具函数 | `docs/shared-utils.md` |
| 收尾 / 自检 / 提交 / 交付前 | `docs/self-check.md` |

## 红线

1. **Markdown 预览一律走 `src/components/MarkdownPreviewModal`**：不在页面里另起 Modal + 渲染器，
   不复制它的样式；渲染栈固定 `react-markdown` + `remark-gfm` + `rehype-raw`。
2. **编辑能力只走 `Editor` 插槽**，按文档类别放在对应页面目录里，通用的解析 / 控件才上提；
   新增一类可编辑文档先跑仓库内 skill `personalize-edit-markdown`。
   **禁止 contentEditable + DOM 反向序列化**（丢格式、与 React 抢 DOM、父级刷新时编辑内容消失）。
3. **本机仓库数据（如 `../learn-english`）只走 `scripts/vite/*` 中间件**，不新增后端服务；
   写操作只在开发模式可用，且必须校验文件名（禁路径穿越）。
4. **菜单页必须套 `MenuContentLayout`**，标题走 `title` prop；页面 `index.scss` 不写 `.page`
   或页面级 `padding` / `height`。`src/features` 已废弃，不要重建，页面代码就近放 `src/pages/<Page>/`。
5. **内容出问题先改源头 md**，不在预览层加「兼容畸形数据」的兜底，判据见 `docs/local-repo-data.md`。

## 维护本文件

- 本文件是**入口不是手册**：只留红线（每条 1–3 行）与索引；契约表、行为清单、实现细节、
  示例命令一律写进 `docs/` 对应文件，这里只留链接和一句判据。
- **每次改动本文件都要顺手优化与拆分，不用等用户提**：新内容先判断是不是细则，是就写 `docs/`；
  发现某节变长、一个主题里混了多个主题、与 `docs/` 或 `AGENTS.md` 重复、或索引里没有对应文件，
  当场拆出去 / 合并 / 更新索引，再收尾。
- **硬阈值**：本文件不超过 60 行，`scripts/check-structure.mjs` 在 `pnpm lint` 里校验，超了即失败——
  不是让你放宽阈值，是让你把内容拆到 `docs/`。
- `docs/` 一个文件只讲一个主题；新增文件必须同时加进本文件索引与 `AGENTS.md` 的索引表。
