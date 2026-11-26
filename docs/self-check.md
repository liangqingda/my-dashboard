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
布局 / 引用 / 命名 / 300 行上限 / import 分组 / 禁裸 `eslint-disable` / 禁 `@ts-ignore`、
**越过 Free 层直连（`Modal` / `Table` / `TextInput` / `ActionIcon`）、公共组件缺 `README.md`、
样式里自己写 `text-overflow: ellipsis`、业务层自己监听 `keydown`** 都由它拦，失败即不合规，别靠人眼看。

## 2. 逐项过一遍（走两轮）

**两轮是两遍不同的检查，不是把同一份清单再念一遍。**

第一轮——按下面表格顺序全量过一遍，发现问题当场改（改完先别提交）。

第二轮——只在第一轮改完之后开始，把最终 diff 当成别人的代码看：

- 重跑一遍第 1 节的三条命令：第一轮的改动很可能让 `lint` / `typecheck` / `build` 从绿变红；
- 只查第一轮改动**新引入**的问题：改出来的位置是否归位、有没有多出一份重复实现、
  注释是否还对得上实现、该同步的 `docs/` 是否漏了、原问题有没有换个形式藏起来；
- 第二轮又动了代码，就再跑一次命令确认；**命令绿 + 第二轮不再发现新问题**才算收尾。
- 回复里写清第二轮查到了什么，没有也要写「第二轮无新增问题」——不写就等于没走这一轮。

判据看 skill，这里只列「查什么」和本项目要额外确认的：

| 顺序 | 查什么 | 判据在哪 |
| --- | --- | --- |
| 1 | 功能与数据流：错误态、空态、越界、并发 | skill《Review 时的判据顺序》第 1 条 |
| 2 | O(n²)、重复计算、无谓重渲染 | skill 第 3 条 + `js-*` 系列规则 |
| 3 | 分层归位（五维）、一文件一组件、组件目录不嵌套 `components/`、**这次的「例外」是否真的不属于这一类** | skill《分层拆分》；命名细则见 `docs/code-splitting.md`；判据见 `docs/ui-components.md` |
| 4 | 副作用收口：监听 / 订阅 / 定时器清理、请求竞态、轮询纪律；异步回调卸载守卫（第 3 节） | skill《副作用收口与异步竞态》 + 本文件第 3 节 |
| 5 | 注释与实现是否一致 | skill《注释 / JSDoc》 |
| 6 | 共用能力有没有重复实现 | `docs/shared-utils.md` 的清单（项目特有） |
| 7 | 残留：旧目录、`features/…`、已删页面、失效文档段落、**已下线能力的符号 / 接口 / 依赖** | skill 判据 + 本项目 grep 旧路径与旧标识符 |
| 8 | 读盘 / 写盘接口：只走 `scripts/vite/*`、写操作仅开发模式、文件名校验禁路径穿越 | `docs/local-repo-data.md` |
| 9 | 文档同步：改到的行为 / 契约写进对应 `docs/`；入口文件仍只有红线与索引，没有该拆未拆的段落 | `AGENTS.md`《维护本文件》 |
| 10 | 架构层面：这次暴露的规则 / 逻辑 / 步骤该不该上提共享（package 或 skill）、该不该自动化、工具落点对不对口 | skill《架构层面：上提共享与自动化》 |

## 3. 异步回调的卸载 / 取消守卫

通用竞态判据在 skill《副作用收口与异步竞态》，这里只写本项目的落点与现成工具：

- **会被新请求顶替的读盘**（切目录、换目标、换层）→ `requestId` 序号或 `AbortController` 让旧请求
  作废，迟到响应按序号 / `signal.aborted` 挡掉；被主动取消的 `AbortError` 不算失败。
- **一次性写操作**（确认删除 / 卸载 / 设墙纸 / 推出盘 / 改名 / 移动）→ 没有下一次请求顶替，用
  `@/hooks/useMounted` 的挂载标记：异步回调落状态、弹通知前先判 `mounted.current`，卸载后的迟到响应
  不再 `setState`；`finally` 里复位 loading 同样先判挂载。
- **effect 里发起的请求** → 清理函数里 `controller.abort()`，并让旧结果按序号 / 信号忽略。
- 判完再写：`await` / `.then` 之后每一处 `setState`、`notifications.show`、回调外传，都要确认要么
  有取消收口、要么有挂载守卫；新增异步 hook 时先查 `useFilesDir` / `useAppUninstall` 的先例，不另造
  一套标记口径。

## 4. 本项目容易返工的几条

- 拆文件时手写样式容易丢声明：拆 `index.scss` 要从原文按块搬，只改选择器名。
- 新加的图标按钮要有 `aria-label`。
- **「塞不进去」不是例外，是 Free 层缺档位**：某个外壳位置只收得下一个节点、某个场景要特定尺寸时，
  正确动作是给 Free 组件加一档能力（插槽 / 尺寸 / `tooltip="none"` 这类开关），不是在外壳里抄一份外观。
  例外只留给「本来就不是这一类」的对象，并且要同时进 `check-structure` 白名单与 `docs/ui-components.md`。
  （示例：`Popover.Target` 要单个元素、某处要 26px 尺寸。）
- **同一操作在多处都要用时，键位与 tooltip 标注必须在同一次改动里一起上提**：只加按钮不挂键，
  `check-structure` 看不出来（示例：复制走 `copy`、删除走 `onRequestDelete`、翻篇走 `nav`）。
  这一条只能靠这里手动对一遍。
- **删掉一个能力＝把它删到底**：入口、实现、类型、测试、依赖、`docs/` 里的契约段落，
  连同它专属的注释（常量都删了只剩一句说明的那种）必须在同一次改动里一起消失。
  判据是「全仓 grep 这个能力的组件名 / 接口路径 / 依赖名 / 中文功能名，除了历史提交记录外 0 命中」；
  只删界面留后端、只删代码留注释都算没删。`check-imports.mjs` 能兜住没人 import 的 `dependencies`，
  其余几类只靠这里对。

## 5. 前端 / 视觉改动

默认不做浏览器实测：不启 dev server、不截图，以 `pnpm typecheck` / `pnpm lint` 为准，
除非用户明确要求浏览器验证。

## 6. 提交前

- `git status` + `git diff --stat`：只含本次改动，不夹带无关文件或整文件格式化。
- 改了约定或行为：同一次提交里同步 `docs/` 与入口 `AGENTS.md`（只加速览 / 索引，细则进
  `docs/`）；`CLAUDE.md` 是软链，不要往里写内容。
- 裸 `eslint-disable`、失效 disable、`@ts-ignore`、`console.log` 从
  `@liangqingda/eslint-config@1.6.0` 起都由 lint 拦下，不用人工再查一遍。

## 7. 改共享包（eslint-config / tsconfig）

本项目依赖的是**发布版本**（`^1.x`，registry 为 `npm.pkg.github.com`），改共享包源码对本地
lint 无效。要让规则真的生效，按顺序做完这一组：

1. 在共享包仓库改源码 + 补测试（`pnpm test`）；
2. 同步该仓库 `docs/`（它自己的 `AGENTS.md` 要求文档随代码走）；
3. `package.json` 升版本 → `npm publish` → 推送源码；
4. 回到本项目升依赖 → `pnpm install` → `pnpm lint`，把新规则报出的存量问题当场改掉；
5. 确认 `node_modules/.bin/liangqingda-*` 跑的是新版本（输出文案 / 版本号变化），再提交。

只改共享包源码不升版本，是最容易「以为生效了其实没有」的静默失败。
