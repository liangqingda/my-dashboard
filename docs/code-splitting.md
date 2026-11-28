# 代码拆分、命名与引用：本项目落点

通用判据（五维归位、公共化边界、别名与跨模块引用）见 `best-react-code` 的《分层拆分》
《公共化边界：UI 与逻辑分开判》《别名与跨模块引用》。本文件只回答「在这个项目里放哪个文件、
文件叫什么、由哪条机器检查拦」，不重复判据。

## 页面代码就近放

页面代码写在 `src/pages/<Page>/` 里，页面自己的组件、hook、工具函数都放该页面目录下；只有
**真正跨页面复用**的才上提到 `src/components`（组件）或 `src/utils`（纯函数）。

## 本项目五维落点

先按 skill 的五维与公共化边界判断归属，再按本表落到本项目的具体路径：

| 维度 | 本项目落点 | 本项目附加要求 |
| --- | --- | --- |
| 类型 | `types.ts` | 跨文件共享的 type / interface 不放组件文件里 |
| 纯函数 | `utils.ts`，多了建 `utils/` 目录按主题拆多个文件 | 无 React 依赖；跨页复用先按 skill 判 |
| 副作用 / 状态 | `hooks/`，一个 hook 一个文件（要写说明时提升为 `hooks/<hook>/index.ts` + `README.md`） | 需要 useEffect / useState / 订阅 |
| 展示单元 | 一个组件一个目录：`<name>/index.tsx`（有自己样式规则时再加 `index.scss`） | 页面目录的 `index.scss` 由 `check-structure` 强制 |
| 常量 | `constants.ts` | 魔法数字、文案、插件数组、存储键 |

本表只回答「放这个项目的哪」，不重新定义五维判据；现有文件怎么摆不参与判断。

## 本项目目录与文件形态

- 公共组件先按类型进分类目录：`src/components/<分类>/<组件>/`（分类名单与判据见
  `docs/ui-components.md` 的「公共组件按类型分目录」），分类目录小写、组件目录 `PascalCase`。
- 每个组件目录有 `index.tsx`；样式只在这个组件**要写自己的规则**时才建 `index.scss`
  （外观全交给组件库 props 的不建空文件），CSS Module 类名自动 camelCase；规格写同目录 `README.md`。
- 页面目录另有一条硬要求：含 `index.tsx` 的目录必须有 `index.scss`（`check-structure` 校验，
  没样式就留一个说明性注释占位）。
- 单个 `index.tsx` 只放一个组件、子组件不嵌套 `components/`、局部变量不与 import 同名，按 skill
  的分层拆分与项目入口硬约束执行，本文件不复述。

## 命名（ESLint 强制，来自 `@liangqingda/eslint-config`）

这一节只判**大小写与文件形态**（机器可判）；页面目录该叫什么、路由怎么定、菜单标题怎么对齐，
见 `docs/pages.md` 的「页面目录、路由与菜单标题」。

- PascalCase 目录模式根：`pages`、`components`、`layouts`、`views`，其下**所有后代目录**一律 PascalCase；
  唯一例外是 `components` 的**直接下级分类目录**（`modals`、`buttons`、`tables`…，名单在共享包
  `config/web-naming-rules.js`），它们用小写，进入之后组件目录仍是 PascalCase（清单见
  `docs/ui-components.md`）；
- kebab-case 模式根：`utils`、`types`、`hooks`、`store`、`constants`、`consts`；
- 直接位于 `hooks/` 下的文件必须 `useXxx`（camelCase）；
- 主文件名只允许 PascalCase 于 `.jsx` / `.tsx` / `.vue`；PascalCase 树内的文件级例外仅
  `utils`、`index`、`types`、`hooks`、`consts`、`constants`、`store`（所以 `api.ts` 这类要改名）。

其它已生效规则：禁数组变异（`no-restricted-syntax`）、禁嵌套三元、JSX props 字母序、
`padding-line-between-statements`、`@typescript-eslint/no-unnecessary-condition`。

## 本项目引用检查

- 页面 / 组件目录内部引用自己的文件用相对路径；跨出所属目录用 `@/`（`@` → `src`）。
  公共组件的「自己这一层」指 `src/components/<分类>/<组件>/`。
- `scripts/check-imports.mjs` 拦两件事：页面 / 组件 / 布局目录内部引用自己的文件必须用相对路径；
  `dependencies` 里的包必须真有源码 import。跨模块别名与不造 barrel 的通用判据见 skill。

### import 分组（`eslint .` 强制，规则来自共享包）

组间必须空一行，组内不空行，顺序固定：

1. `builtin` / `external`：Node 内置、第三方包（`react`、`@mantine/*`…）；
2. `internal`：`@/` 公共能力（`@/components`、`@/utils`、`@/services`…），
   其中 `@/pages/**` 在本块内排在最后（与公共 `@/` 之间空行）；
3. `parent`：`../` 就近引用（父目录，含 `import type { X } from '../types'`）；
4. `sibling`：`./` 就近引用（同目录），样式导入（`*.scss`）排在本块最后；
5. `index`：同目录 index 文件。

类型 import 不单独成组：跟着来源路径走（外部的归 external、`@/` 的归 internal、
就近的归 parent/sibling），所以 `import type { X } from './types'` 和同目录的值 import
在一起，不会被提到文件顶部。

上面这套顺序由 `@liangqingda/eslint-config` 的 `react-typed` 统一强制（1.5.0 起 type 跟随路径、
就近按 `../` / `./` 拆块），本仓库不再在 `eslint.config.js` 里覆写 `import/order`；
值导入里内联 `type` 也由同一套配置的 `consistent-type-imports` 拦下。
