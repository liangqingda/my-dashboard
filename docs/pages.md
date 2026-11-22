# 菜单页与布局

侧边栏菜单项对应的页面必须套 `src/layouts/MenuContentLayout`，**新增菜单页同样适用**。
哪些页面算菜单页由 `Sidebar` 的 `navItems` 决定（见下文「校验机制」），不在文档里维护名单。
非菜单页（如 404）不受此约束。

## 侧栏分组

同一类页面收在可展开分组下（示例：「英语」下有「笔记」`/english/notes` 与「知识库」`/english/knowledge-base`）：

- 分组项（`NavGroupItem`）**不写 `to`**：它只负责展开 / 收起子项，不是页面；写了 `to` 会被菜单页校验
  当成一条解析不到的路径直接报错。
- 只有子项（`NavLinkItem`）写 `to: '…'` 字面量并落到 `<Route>`，校验据此推断页面目录。
- 分组默认展开，子项直接可见；点父项可以收起 / 再展开（展开状态不持久化）。
- 旧的顶层路径（如 `/english`）保留一条 `Navigate` 重定向到分组里的默认子项，避免历史链接 404。

## 页面目录、路由与菜单标题

三样东西指向同一个页面：`src/pages/<Page>/` 的目录名、`<Route path>` 的路由、`Sidebar` 的菜单
标题。**动其中之一，就把三处一次改齐**——校验脚本从导航项 `to` 反推页面目录（见下文「校验机制」），
路由改了目录没改会直接失败；标题改了而目录、路由还停在旧语义，则是校验看不见的半截改名。
非菜单页（404 这类）不参与分组段规则，目录自己说得清即可。

**`src/pages` 下平铺，一个页面一个目录**：`src/pages/<Page>/index.tsx` + `index.scss`。
分组不做成父目录（不建 `pages/English/Notes`），而是写进目录名前缀——分组关系只体现在侧栏与路由上。
页面目录里的子组件 / `hooks/` / `utils/` 是这一页的内部结构，不算另一个页面，也不各自成为菜单项。

**目录名 = `<分组><角色>` 两段 PascalCase。**

| 规则 | 说明 |
| --- | --- |
| 分组段与侧栏分组同名 | `English` ↔「英语」，脱离侧栏看目录也知道归哪一组 |
| 角色段是页面职责的名词 | `EnglishNotes`（笔记）、`EnglishKnowledgeBase`（知识库）；不用动词、不写缩写 |
| 分组只有一页时省掉分组段 | `Services` 这类单页分组不硬加前缀 |
| 泛名不许单独用 | `Notes`、`Review`、`Detail` 在 `pages/` 平铺里看不出归属和职责；一个分组从第二页起必须带分组段 |
| 一个目录只服务一个菜单页 | 不拿分组名占坑（`English` 不是「英语笔记」的合法目录名），第二个页面另开目录 |

**路由 = `/<分组 kebab-case>/<角色 kebab-case>`，角色段与目录的角色段同词根。**
`EnglishNotes` ↔ `/english/notes`，`EnglishKnowledgeBase` ↔ `/english/knowledge-base`。
不按菜单标题直译：中文名换一个英文说法就有好几种拼法（「知识库」可写 knowledge-base / review /
library），定一个就一直用它，别两套并存。

**菜单标题 = 用户视角的中文短名**（「笔记」「知识库」），不受目录名约束：目录名求「开发时能定位」，
标题求「用户能看懂」，但两者语义必须指向同一件事（目录写 `KnowledgeBase`、路由写 `/review`
就是拆成两个东西了）。

改名按这个顺序走完，缺一步就是半截改名：`git mv` 目录 → `App.tsx` 的 lazy import 与 `<Route>`
→ `Sidebar` 的 `key` / `to` → 全仓 grep 旧路径（`docs/`、页面 README、脚本注释）→ 给旧路由留一条
`Navigate` 重定向，不让历史链接 404。

## MenuContentLayout 负责什么

1. 标题通过 `title` prop 传入（`ReactNode`）。标题样式固定在组件内（Mantine `Title order={2}`
   加统一字距），页面**不得**再自己写 `<Title>`、字号、字重。
2. 内容区内边距固定 `14px 12px`，标题与内容的间距、纵向排列由组件负责。页面 `index.scss`
   **不得**定义 `.page` 选择器，也不得设置页面级 `padding` / `height`。
3. **整页高度固定占满视口、只有内部子区域滚动**的页面传 `fill`，高度由组件按
   `calc(100dvh - var(--app-header-height))` 计算，页面不要自己写高度或 `100dvh`。
   判断只看这一条；只是内容偏多、页面本身要随内容滚动的，不传 `fill`（示例：英语看板）。
4. 标题右侧固定内置两个图标按钮：「刷新当前页面」（点下图标原地旋转并置 `aria-busy`，等页面通过
   `onPageRefresh` 订阅的取数结束再提示：成功「已刷新」、失败「刷新失败」、页面没有订阅刷新则「无需刷新」；
   **不要给这个按钮加 `loading`**——Mantine 会把图标换成小 Loader 并把按钮按 disabled 压暗，看起来像按钮没了）与「全屏 / 退出全屏」。
   两个按钮各挂一条快捷键：`R` 刷新、`F` 切换全屏（大小写都认，tooltip 末尾标注键位）；
   按键落点不在本页容器内（预览弹窗等浮层接管焦点）时放行，避免与浮层快捷键双触发。
   全屏状态按当前路由记在 localStorage
   （键为 `<页面标识>:fullscreen`，如 `english-notes:fullscreen`，拼法见 `docs/shared-utils.md` 的
   「存储键的命名」；各菜单页各自记住自己上次是否全屏），刷新页面重新
   进入后保持；只把页面根元素 `position: fixed` 铺满视口（覆盖顶栏与侧栏）来放大展示空间，
   页面内部结构与内容不变；再点一次、按 `F` 或全屏时按 Esc 退出（Esc 退出同时写回存储）。
   **页面不要再自己造这两个按钮，也不要在页面里写全屏逻辑**。刷新时的加载占位
   `src/components/feedback/PageLoading` 按同一份存储（`@/utils/page-fullscreen`）提前判断：目标页是全屏
   就先铺满视口盖住外壳，避免页面 chunk 尚未挂载时先闪一下非全屏界面。
5. 页面自己的操作按钮通过 `actions` prop 传入，排在上述两个内置按钮之前；按钮组件就近放在
   该页面目录下（`src/pages/<Page>/<Button>/`）。（示例：服务页的「重启 agent」。）

## 页面呈现

页面默认只展示文件名、标题这类索引信息；正文细节交给预览层（`MarkdownPreviewModal`，见
`src/components/modals/MarkdownPreviewModal/README.md`），不要把全文平铺在页面上。页面本身只做数据拼装与状态编排。

**列表数据已经整份在客户端时，就整份渲染**：不再做「首屏 N 行 + 滚动追加」，那只是把已经到手的
数据藏起来，还要多养一套量视口高度、追加行数、详情补渲染的逻辑。只有渲染量真成了瓶颈（上千行）
才考虑虚拟滚动，而不是用假分页掩盖。换筛选条件时把滚动位置拉回顶部、关掉详情，从新结果的第一条看起。
（示例：知识库摘要首屏一次取到，几百条、gzip 几十 KB。）

列表的关键词搜索只过滤**已经取到本页的摘要字段**，敲字即时生效；不要为此回服务端重查，也别为了
能搜正文把每条的正文一起拉下来——搜索是导航，不是全文检索。哪些字段算「摘要字段」由该页的
摘要结构决定（示例：标题 / 分类标题 / 记录 ID）。

## 新增一个菜单页

1. 在 `src/layouts/Sidebar/index.tsx` 的 `navItems` 里加导航项；
2. 在 `src/App.tsx` 加 `<Route>`，指向 `src/pages/<Page>/index.tsx`；
3. 页面用 `MenuContentLayout` 包住内容，只做数据拼装与状态编排；
4. 页面目录需要 `index.scss`（哪怕只是注释——结构检查要求两者成对）。

顺序不能反：先有导航项与路由，页面才自动纳入校验。

## 校验机制（`scripts/check-structure.mjs` 的 `checkMenuPages`）

「哪些页面算菜单页」不靠手工白名单：脚本从 `Sidebar` 的 `navItems` 取路径，经 `App.tsx` 的
`<Route>` 解析到 `src/pages/<Dir>`，解析不到的页面自动跳过；某条侧边栏路径解析不到目录时
检查直接报错。因此新增页只要「加导航项 + 加路由」就会自动纳入，漏登记不会静默放过。

检查内容：页面是否用了 `<MenuContentLayout>`、`index.scss` 是否残留 `.page` 选择器。
由 `pnpm lint` 执行，不合规直接失败。
