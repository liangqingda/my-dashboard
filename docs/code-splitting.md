# 代码拆分与命名

通用判据（五维归位、公共化边界、别名与跨模块引用）见 `best-react-code` 的《分层拆分》
《公共化边界：UI 与逻辑分开判》《别名与跨模块引用》。本文件只写本项目落点与命名，不重复判据。

## 页面代码就近放

页面代码写在 `src/pages/<Page>/` 里，页面自己的组件、hook、工具函数都放该页面目录下；只有
**真正跨页面复用**的才上提到 `src/components`（组件）或 `src/utils`（纯函数）。

## 五个维度

属于哪类就落到哪个文件 / 目录，非公共的就近放在用它的目录里：

| 维度 | 放哪 | 判据 |
| --- | --- | --- |
| 类型 | `types.ts` | 跨文件共享的 type / interface，不放组件文件里 |
| 纯函数 | `utils.ts`，多了建 `utils/` 目录按主题拆多个文件 | 无 React 依赖；同一逻辑出现两处即上提 |
| 副作用 / 状态 | `hooks/`，一个 hook 一个文件（要写说明时提升为 `hooks/<hook>/index.ts` + `README.md`） | 需要 useEffect / useState / 订阅 |
| 展示单元 | 一个组件一个目录：`<name>/index.tsx` + `index.scss` | 能在别处复用的 UI 片段 |
| 常量 | `constants.ts` | 魔法数字、文案、插件数组、存储键 |

判据只看「这段东西属哪个维度、是否跨文件共享」，与现有文件怎么摆无关。

## 说明文档跟着代码走

**只有跨文件的约定与流程才进 `docs/`**；某个组件 / hook / 页面自己的规格与说明写在它自己的目录
里，随代码一起改、一起删。

| 对象 | 放哪 |
| --- | --- |
| 组件规格（契约、行为细节、样式约定） | `src/components/<分类>/<Name>/README.md`；页面自己的业务组件同理放页面目录 |
| hook 说明（触发条件、竞态处理、为什么这么写） | 该 hook 的目录：`hooks/use-notes/index.ts` + `README.md` |
| 跨组件 / 跨页面的约定与流程（本文件、布局、复用、自检…） | `docs/` 对应文件 |

hook 默认一个文件（`hooks/useXxx.ts`）；**一旦要为它写说明，就把它提升成同名目录**
（`use-notes/index.ts` + `README.md`），不要再造「`useXxx.ts` + 同目录 `useXxx.md`」这种两份并列。

判据：**这份文档只有改这个东西的人才需要读** → 跟代码走；改别处也会被牵连、要当时就知道 →
进 `docs/`。拿不准时按「改动半径」判：半径为 1 个目录的，别占全局。

### 哪些目录必须有 README.md

- **公共组件**（`src/components/<分类>/<Name>/`）结构检查强制，缺了 lint 失败；
- **页面自己的业务组件目录**同样要写：瓦片 / 行 / 弹窗 / 面板 / 排布壳，凡是别的人要改它就得先看懂
  「锁了什么、props 边界、交互口径、坑」的，目录里放 `README.md`；纯展示、口径全在 props 类型里的
  小件可以不写，但判断拿不准就写；
- **页面根目录**写一份编排说明：各 hook / 子组件怎么分工、主要交互口径与边界（不复制组件内 README）；
- **带说明的 hook** 提升为 `hooks/<hook>/index.ts` + `README.md`（见上一节），写触发条件、竞态处理、
  为什么这么实现；
- README 内容写**契约**：职责边界、props 分组口径、与相邻组件的分工、容易踩的坑；不复制组件库规则，
  不复述 `docs/` 里已有的跨文件约定。

## 组件的硬要求

- 单个 `index.tsx` 只放一个组件，**不得**堆多个组件；超长文件按五维拆开，公共组件同样适用
  （示例：`MarkdownPreviewModal` 目录下的 `types.ts` / `constants.ts` / `hooks/` / 子组件目录）。
- 组件目录内**不嵌套** `components/` 层，子组件目录直接放父组件目录下。
- 公共组件先按类型进分类目录：`src/components/<分类>/<组件>/`（分类名单与判据见
  `docs/ui-components.md` 的「公共组件按类型分目录」），分类目录小写、组件目录 `PascalCase`。
- 每个组件目录有 `index.tsx`；样式只在这个组件**要写自己的规则**时才需要 `index.scss`
  （外观全交给组件库 props 的不建空文件），CSS Module 类名自动 camelCase；规格写同目录 `README.md`。
  页面目录另有一条硬要求：含 `index.tsx` 的目录必须有 `index.scss`（`check-structure` 校验，
  没样式就留一个说明性注释占位）。
- 在组件里定义的局部变量不要与 import 进来的组件 / 函数同名（读代码时无法分辨，重命名其中一个）。
  示例：两个图标别名不要都叫 `ActionIcon`——会和 Mantine 的 `ActionIcon` 撞名。

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

## 引用规则

- 页面 / 组件目录内部用相对路径（公共组件的「自己这一层」指 `src/components/<分类>/<组件>/`）；
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
