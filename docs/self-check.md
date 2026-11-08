# 改完代码的自检清单

**每次改完代码，提交或交付前必须再走一遍**，不能只保证「能跑」。九条按顺序过，
每条都要能说出结论（「查过了，没问题」），不许凭感觉跳过。

1. **命令全绿**
2. **拆分是否合理**
3. **查重复**
4. **查复杂度**
5. **查副作用与竞态**
6. **查读盘 / 写盘接口**
7. **查注释与实现是否一致**
8. **查边界与错误态**
9. **查残留**

## 1. 命令全绿

- `pnpm typecheck` / `pnpm lint` / `pnpm build` 三命令全绿，缺一不可。
- `pnpm lint` = `eslint .` + `check-structure` + `liangqingda-check-scss` + `check-imports` + `check:md`。
- **改到 `agent/` 或 `scripts/vite/*` 时额外跑 `pnpm test`**：它只跑 `agent/*.test.mjs`（node 原生
  测试，不碰浏览器），覆盖脚本与读盘契约，不能因为「不算前端」就跳过。
- `pnpm test:e2e`（playwright）默认**不跑**——它要开浏览器，与硬约束 7 冲突，只在用户明确要求
  浏览器验证时执行。

## 2. 拆分是否合理

判据见 `docs/code-splitting.md`（五维拆分与命名），对照检查：

| 检查点 | 判据 |
| --- | --- |
| 就近归属 | 页面代码在 `src/pages/<Page>/`；只有**真正跨页面复用**才上提 `components` / `utils` |
| 五维落点 | 类型→`types.ts`；纯函数→`utils.ts`（多了建 `utils/` 按主题拆）；副作用/状态→`hooks/`（一个 hook 一文件）；展示单元→一组件一目录；常量→`constants.ts` |
| 一文件一组件 | 单个 `index.tsx` 只放一个组件（≤300 行），不许既写组件又写工具函数 |
| 目录形态 | 组件目录内不嵌套 `components/`；每个组件目录 `index.tsx` + `index.scss` 成对 |
| 命名撞车 | 局部变量不与 import 进来的组件 / 函数同名（别把图标别名成 `ActionIcon`） |

分工要分清：

- **工具兜住**：`check-structure`（features 废弃、页面组织、菜单页布局）、`check-imports`
  （页面内部必须相对路径）、`eslint`（命名、300 行上限、import 分组）——跑第 1 条就知道。
- **只能靠人判断**：是不是「真该拆」——为拆而拆的碎文件、组件里残留数据请求或业务逻辑、
  本该合并却拆成三份。这类必须逐文件看一眼，工具不会报。

## 3. 查重复

同样的文案、格式化、class 拼接、剪贴板逻辑散在多处 → 按 `shared-utils.md` 上提。
判据是「同一逻辑出现第二处就上提」，不是「看起来像」。

```bash
grep -rn "instanceof Error\|Intl\.DateTimeFormat\|execCommand\|navigator\.clipboard" src
grep -rn '`${styles' src   # 手写 class 模板串
```

## 4. 查复杂度

**禁止 O(n²)**：循环里 `filter` / `find` 已收集的结果、循环里反复展开数组都算。
改成单次遍历 + `Map` / `Set` 建索引；昂贵派生值用 `useMemo`，别每次渲染重算。

## 5. 查副作用与竞态

三类问题都藏在 `useEffect` 里，lint 一条都不管：

| 问题 | 要求 |
| --- | --- |
| 订阅 / 监听 / 定时器泄漏 | `onPageRefresh`、`addEventListener`、`ResizeObserver`、`setInterval` 必须有对应清理函数返回 |
| 轮询纪律（硬约束 5） | 只在进页面、页面重新可见 / 窗口聚焦、手动刷新时取数；仅「有服务在启动 / 部署 / 操作中」才短暂按 1 秒刷新 |
| 异步竞态 | 请求要用 `AbortController` 或 `cancelled` 标记收口，避免旧响应回来覆盖新状态（表现为数据闪回上一页） |

```bash
grep -rn "onPageRefresh\|addEventListener\|ResizeObserver\|setInterval" src   # 逐个确认有清理
```

## 6. 查读盘 / 写盘接口

动 `scripts/vite/*` 中间件或新增接口时（硬约束 8）：

- 本机仓库数据只走 `scripts/vite/*`，**不新增后端服务**；
- 写操作只在开发模式可用，构建产物里不能暴露；
- 文件名必须校验：拒绝路径穿越（`../`、绝对路径、分隔符），并按白名单确认目标路径。

```bash
grep -n "fs\.\|path\.join\|readFile\|writeFile" scripts/vite/*
```

## 7. 查注释与实现是否一致

层级、常量、边界都说对了？过时注释直接改掉，不要留着骗人。

## 8. 查边界与错误态

空数组、加载失败、空态、越界索引（如 `activeIndex === -1`）是否都有明确处理；
**错误态不要谎报成空态**（读失败时不能说「还没有数据」）。

## 9. 查残留

旧目录、旧引用（`features/…`、已删页面）、失效文档段落、没人用的导出与死代码，全部清掉。
大改动收尾前 `grep` 一遍旧路径字符串。

## 提交前最后一眼

- `git status` + `git diff --stat`：只含本次改动，没夹带无关文件或整文件格式化。
- `git diff` 里新增的 `eslint-disable` / `any` / `@ts-ignore`：每一处都得有理由注释，
  否则就是把检查绕过去了，此时 lint 全绿是假的。
- 调试残留：`grep -rn "console\.(log|debug)\|TODO\|FIXME" src`。
- 改了约定就同步 `docs/`（细则写 docs，`AGENTS.md` 只留速览与索引）。

## 几条最容易返工的地方

- 前后端字段漂移：改接口就把前端类型、fixture、e2e mock、文档一起改，别只改一边。
- 拆文件时手写样式容易丢声明：拆 `index.scss` 要从原文按块搬，只改选择器名。
- 加 `error` 入参就顺手检查「空态文案是否会与错误态打架」。
- 新加图标按钮要有 `aria-label`，这是唯一值得顺手查的无障碍项。

## 前端 / 视觉改动

默认**不做浏览器实测**：不启 dev server、不截图验证，以 `pnpm typecheck` 与 `pnpm lint` 为准；
除非用户明确要求浏览器验证。
</content>
