# 代码拆分与命名

## 页面代码就近放

**`src/features` 已废弃，不要重建**（出现即被结构检查判定失败）。页面代码写在
`src/pages/<Page>/` 里，页面自己的组件、hook、工具函数都放该页面目录下；只有**真正跨页面复用**的
才上提到 `src/components`（组件）或 `src/utils`（纯函数）。

## 五个维度

属于哪类就落到哪个文件 / 目录，非公共的就近放在用它的目录里：

| 维度 | 放哪 | 判据 |
| --- | --- | --- |
| 类型 | `types.ts` | 跨文件共享的 type / interface，不放组件文件里 |
| 纯函数 | `utils.ts`，多了建 `utils/` 目录按主题拆多个文件 | 无 React 依赖；同一逻辑出现两处即上提 |
| 副作用 / 状态 | `hooks/`，一个 hook 一个文件（要写说明时提升为 `hooks/<hook>/index.ts` + `README.md`） | 需要 useEffect / useState / 订阅 |
| 展示单元 | 一个组件一个目录：`<name>/index.tsx` + `index.scss` | 能在别处复用的 UI 片段 |
| 常量 | `constants.ts` | 魔法数字、文案、插件数组、存储键 |

反例（曾被 review 点名）：组件里内联一堆常量、把三个字段的类型内联在 props 里、
`index.tsx` 里既写组件又写工具函数。

## 说明文档跟着代码走

**只有跨文件的约定与流程才进 `docs/`**；某个组件 / hook / 页面自己的规格与说明写在它自己的目录
里，随代码一起改、一起删。

| 对象 | 放哪 |
| --- | --- |
| 组件规格（契约、行为细节、样式约定） | `src/components/<Name>/README.md`；页面自己的业务组件同理放页面目录 |
| hook 说明（触发条件、竞态处理、为什么这么写） | 该 hook 的目录：`hooks/use-notes/index.ts` + `README.md` |
| 跨组件 / 跨页面的约定与流程（本文件、布局、复用、自检…） | `docs/` 对应文件 |

hook 默认一个文件（`hooks/useXxx.ts`）；**一旦要为它写说明，就把它提升成同名目录**
（`use-notes/index.ts` + `README.md`），不要再造「`useXxx.ts` + 同目录 `useXxx.md`」这种两份并列。

判据：**这份文档只有改这个东西的人才需要读** → 跟代码走；改别处也会被牵连、要当时就知道 →
进 `docs/`。拿不准时按「改动半径」判：半径为 1 个目录的，别占全局。

## 组件的硬要求

- 单个 `index.tsx` 只放一个组件，**不得**堆多个组件；超长文件按五维拆开，
  公共组件同样适用（`MarkdownPreviewModal` 现拆成 `types.ts` / `constants.ts` / `hooks/` /
  `TitleBar/` / `OutlineNav/` / `HeaderActions/`，样式也随组件各自走）。
- 组件目录内**不嵌套** `components/` 层，子组件目录直接放父组件目录下。
- 每个组件目录 `index.tsx` + `index.scss` 成对存在（CSS Module 类名自动 camelCase）；
  需要写规格时同目录放 `README.md`。
- 在组件里定义的局部变量不要与 import 进来的组件 / 函数同名。例如两个图标别名不要叫
  `ActionIcon`——会和 Mantine 的 `ActionIcon` 撞名，读代码时极难分辨。

## 命名（ESLint 强制，来自 `@liangqingda/eslint-config`）

- PascalCase 目录模式根：`pages`、`components`、`layouts`、`views`，其下**所有后代目录**一律 PascalCase；
- kebab-case 模式根：`utils`、`types`、`hooks`、`store`、`constants`、`consts`；
- 直接位于 `hooks/` 下的文件必须 `useXxx`（camelCase）；
- 主文件名只允许 PascalCase 于 `.jsx` / `.tsx` / `.vue`；PascalCase 树内的文件级例外仅
  `utils`、`index`、`types`、`hooks`、`consts`、`constants`、`store`（所以 `api.ts` 这类要改名）。

其它已生效规则：禁数组变异（`no-restricted-syntax`）、禁嵌套三元、JSX props 字母序、
`padding-line-between-statements`、`@typescript-eslint/no-unnecessary-condition`。

## 引用规则

- 页面 / 组件目录内部用相对路径；
- 跨出所属目录一律用 `@/` 别名（`@` → `src`），结构检查会拦穿过页面目录的相对导入；
- 不造 barrel 文件，直接从具体文件导入。

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

只会留在本仓库 `scripts/check-imports.mjs` 的是 ESLint 表达不了的一条：页面 / 组件 / 布局
目录内部引用自己的文件必须用相对路径（`no-restricted-imports` 只能禁 pattern，表达不了
「只禁本目录的别名写法」）。
