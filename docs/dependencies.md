# 第三方库：本项目基线

通用判据（已在用依赖优先、第二套范式冲突、`sideEffects` 与按需引入、宽接口包窄类型、下线删依赖）
见 `best-react-code` 的《依赖决策》。本文件只记本项目的已有基线、硬约束与已定案个例。

## 已有基线

优先查这些，不要为同一能力再装第二个包：

- UI / 交互：`@mantine/core`、`@mantine/dates`、`@mantine/notifications`、`@mantine/hooks`、
  `@tabler/icons-react`；
- 日期：`dayjs`；
- Markdown 渲染：`react-markdown` + `remark-gfm` + `rehype-raw`，只在 `MarkdownPreviewModal` 里接，
  页面不自己另起渲染器；
- 通用能力：先查 `docs/shared-utils.md` 的入口表，再决定要不要引库或自己写。

## 本项目硬约束

- **组件库优先**：能用 Mantine 就不手写；`FreeXxx` 是唯一入口的地方，业务不越过它直连底层。
- **不引入带第二套请求范式的包**：带缓存 / 轮询 / 重试的请求 hook（如 `useRequest` 类）与
  `AGENTS.md`「服务状态不做后台定时轮询」冲突；只要其中某个通用小件时，回已有依赖那一问。
- **装进来就要能删掉**：包只服务某个能力时，能力下线同一次改动里 `pnpm remove <包>`；
  `scripts/check-imports.mjs` 已按 `dependencies` 逐条校验，全仓没人 import 的包直接判失败。

## 已定案个例

具体到某个文件为什么没换社区版 / Mantine 版，理由写在**它自己的 JSDoc 头部**
（`@/utils/cx`、`@/utils/clipboard`、`@/hooks/useHoverIntent`、`@/hooks/useStoredState`）。
改这些实现前先读那段，不要凭印象判它「该用轮子」。

## 新增依赖时

1. 先按 skill 的三问与实际 `package.json` 已有基线判；
2. 决定装之后，同一次改动补 import、JSDoc 与必要的使用说明；
3. 需要升级 / 移除时确认 lockfile 与 `pnpm lint` 的 `check-imports` 都过。
