# 改完代码的自检清单

**通用判据不在本文件**：两轮自检、Review 判据、异步收口、删能力删到底这些「需要判断、规则写不出来」
的约定，一律按 `best-react-code` 的《两轮自检》《Review 时的判据顺序》《副作用收口与异步竞态》
执行，这里不再复述——两处都写就是两处漂移。机器能判的规则由 `@liangqingda/eslint-config` 兜住。

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

## 2. 两轮自检

按 skill《两轮自检》执行。本项目第二轮**额外**确认这几项：

- 改到行为 / 契约：对应的 `docs/` 是否同步，入口 `AGENTS.md` 是否仍只有硬约束与索引，没有该拆未拆的段落；
- 动到 `agent/` 或 `scripts/vite/*`：`pnpm test` 是否跟着跑过；
- 旧路径 / 旧符号 / 旧路由 / 旧存储键 / 旧字段别名 / 已下线依赖：全仓 grep 是否还有残留；
- 回复里写清第二轮查到了什么，没有也要写「第二轮无新增问题」。

## 3. 异步回调的卸载 / 取消守卫

通用判据在 skill《副作用收口与异步竞态》，这里只写本项目的落点与现成工具：

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
  通用判据见 skill《UI 分层与唯一入口》，本项目具体入口写在各组件 `README.md`。
- **删掉一个能力＝把它删到底**：通用判据见 skill；本项目额外查旧路由 / 旧存储键 / 旧字段别名 /
  `dependencies`，入口、实现、类型、测试、依赖、`docs/` 契约段落与专属注释必须同一次消失。

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
