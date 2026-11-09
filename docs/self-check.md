# 改完代码的自检清单

**通用判据不在本文件**：拆分维度、性能反模式、注释语义、错误态 / 空态、数据流与并发这些
「需要判断、规则写不出来」的约定，一律按 `best-react-code` skill 的
《工程约定（跨项目通用）》与《Review 时的判据顺序》执行，这里不再复述——两处都写就是两处漂移。
机器能判的规则由 `@liangqingda/eslint-config` 兜住。

本文件只写 **本项目特有的**：跑哪些命令、改到哪类目录要多跑什么、以及工具兜不住的项目事实。

## 1. 命令（必须全绿）

| 场景 | 命令 |
| --- | --- |
| 任何改动 | `pnpm typecheck` / `pnpm lint` / `pnpm build` |
| 动 `agent/` 或 `scripts/vite/*` | 再加 `pnpm test`（node 原生测试，不碰浏览器） |
| 用户明确要求浏览器验证 | `pnpm test:e2e`；默认不跑（见 `AGENTS.md`「前端 / 视觉改动默认不做浏览器实测」） |

`pnpm lint` = `eslint .` + `check-structure` + `check-scss` + `check-imports` + `check:md`。
布局 / 引用 / 命名 / 300 行上限 / import 分组 / 禁裸 `eslint-disable` / 禁 `@ts-ignore`
都由它拦，失败即不合规，别靠人眼看。

## 2. 逐项过一遍

判据看 skill，这里只列「查什么」和本项目要额外确认的：

| 顺序 | 查什么 | 判据在哪 |
| --- | --- | --- |
| 1 | 功能与数据流：错误态、空态、越界、并发 | skill《Review 时的判据顺序》第 1 条 |
| 2 | O(n²)、重复计算、无谓重渲染 | skill 第 3 条 + `js-*` 系列规则 |
| 3 | 分层归位（五维）、一文件一组件、组件目录不嵌套 `components/` | skill《分层拆分》；命名细则见 `docs/code-splitting.md` |
| 4 | 副作用收口：监听 / 订阅 / 定时器清理、请求竞态、轮询纪律 | skill《副作用收口与异步竞态》 |
| 5 | 注释与实现是否一致 | skill《注释 / JSDoc》 |
| 6 | 共用能力有没有重复实现 | `docs/shared-utils.md` 的清单（项目特有） |
| 7 | 残留：旧目录、`features/…`、已删页面、失效文档段落 | skill 判据 + 本项目 grep 旧路径字符串 |
| 8 | 读盘 / 写盘接口：只走 `scripts/vite/*`、写操作仅开发模式、文件名校验禁路径穿越 | `docs/local-repo-data.md` |
| 9 | 文档同步：改到的行为 / 契约写进对应 `docs/`；入口文件仍只有红线与索引，没有该拆未拆的段落 | `AGENTS.md`《维护本文件》 |
| 10 | 架构层面：这次暴露的规则 / 逻辑 / 步骤该不该上提共享（package 或 skill）、该不该自动化、工具落点对不对口 | skill《架构层面：上提共享与自动化》 |

## 3. 本项目容易返工的两点

- 拆文件时手写样式容易丢声明：拆 `index.scss` 要从原文按块搬，只改选择器名。
- 新加的图标按钮要有 `aria-label`。

## 4. 前端 / 视觉改动

默认不做浏览器实测：不启 dev server、不截图，以 `pnpm typecheck` / `pnpm lint` 为准，
除非用户明确要求浏览器验证。

## 5. 提交前

- `git status` + `git diff --stat`：只含本次改动，不夹带无关文件或整文件格式化。
- 改了约定或行为：同一次提交里同步 `docs/` 与入口 `AGENTS.md`（只加速览 / 索引，细则进
  `docs/`）；`CLAUDE.md` 是软链，不要往里写内容。
- 裸 `eslint-disable`、失效 disable、`@ts-ignore`、`console.log` 从
  `@liangqingda/eslint-config@1.6.0` 起都由 lint 拦下，不用人工再查一遍。

## 6. 改共享包（eslint-config / tsconfig）

本项目依赖的是**发布版本**（`^1.x`，registry 为 `npm.pkg.github.com`），改共享包源码对本地
lint 无效。要让规则真的生效，按顺序做完这一组：

1. 在共享包仓库改源码 + 补测试（`pnpm test`）；
2. 同步该仓库 `docs/`（它自己的 `AGENTS.md` 要求文档随代码走）；
3. `package.json` 升版本 → `npm publish` → 推送源码；
4. 回到本项目升依赖 → `pnpm install` → `pnpm lint`，把新规则报出的存量问题当场改掉；
5. 确认 `node_modules/.bin/liangqingda-*` 跑的是新版本（输出文案 / 版本号变化），再提交。

只改共享包源码不升版本，是最容易「以为生效了其实没有」的静默失败。
