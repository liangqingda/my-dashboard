# 本机仓库数据链路（`../learn-english` 等）

## 只走 Vite 中间件，不新增后端服务

本机仓库数据（如 `../learn-english`）一律通过 `scripts/vite/*` 的 Vite 开发中间件读盘，
**不新增独立后端服务**，也不让前端直接假设某个 HTTP 服务在跑。

英语笔记插件按职责拆成三层，改动时按层归位：

| 文件 | 职责 |
| --- | --- |
| `scripts/vite/english-notes.ts` | 路由壳：只做请求解析与响应 |
| `scripts/vite/english-notes-store.ts` | 只读侧：读盘、解析摘要、文件名合法性、读分类清单 |
| `scripts/vite/english-notes-write.ts` | 保存一篇笔记：跑记录仓库的 `note.py write`，把「写没写进去 / 校验问题」收敛成页面要的形状 |
| `scripts/vite/english-notes-delete.ts` | 删除一篇笔记：跑记录仓库的 `learning_records.py delete-note`，把它的结果收敛成页面要的形状 |
| `scripts/vite/english-records.ts` | 知识库路由壳：`GET /api/english/records`（列表 / 按 ID 详情）、`DELETE`（删除记录），构建期产出记录快照 |
| `scripts/vite/english-records-store.ts` | 记录库只读侧：合并学习 / 已掌握两个目录、按更新时间倒序、ID 与详情路径校验 |
| `scripts/vite/english-records-delete.ts` | 删除一条记录：跑 `learning_records.py delete-record`，只删记录、笔记不动 |
| `scripts/vite/english-contract.ts` | 契约期望值的唯一来源：`repoDirOf`、`REPO_EXPECTATION`、`contractIssue`（笔记与记录共用） |
| `scripts/vite/english-notes-commit.ts` | 自动提交：把这一次改动提交到 `../learn-english`（删除流程提交后还会推送） |

## 要动别的仓库：能力放目标仓库，本项目只调用

凡是读写 `../learn-english` 这类**目标仓库自己的数据或格式**，能力一律先在目标仓库里实现
（一条脚本子命令 / 一个 CLI 动词），本项目只负责拼命令、收结果、翻译成页面要的话。
**不要在本项目复刻一份规则**：格式规则、锁、索引块、`revision` 这些住在目标仓库，抄过来的副本
迟早和源头漂移，还会让本项目的写入比源头更宽容（等于替源头藏缺陷）。

判据（满足任一条就下沉）：

| 情况 | 结论 |
| --- | --- |
| 操作会改目标仓库的数据或其不变量（md 结构、记录 JSON、习题 / 复习索引块、追踪字段、时间戳） | 必须下沉，本项目不碰文件 |
| 目标仓库已有同类命令 / 校验器 / 单测，扩展一条子命令比在这边重建便宜 | 下沉 |
| 只涉及本项目自己的呈现口径（分类中文名、看板列顺序、卡片分组、页面文案）或纯只读聚合 | 留在本项目 |

反过来也有信号：如果为了下沉，得把「预览弹窗」「页面路由」这类本项目专有概念塞进目标仓库，
说明方向错了，那条能力本来就不该是目标仓库的。

落地顺序（这四步别跳）：

1. 在目标仓库加能力（新增 / 扩展现有脚本），**按其 `AGENTS.md` 与既有测试习惯自检自改两轮**
   （改到某个 skill 的 scripts/tests 就跑那个 skill 的 `tests`，有体检命令就跑体检）；
2. 目标仓库提交，按该仓约定推送；
3. 本项目再改成调用它：中间件只做「拼命令 → 超时 / 失败 → 收敛结果」，并在本文件写清契约
   （命令、输入输出字段、退出码、错误文案口径）；
4. 本项目自己的收尾照常：`pnpm typecheck` / `pnpm lint` / 改 `scripts/vite/*` 时 `pnpm test`，两轮自检。

**不做兜底**：目标仓库脚本拒绝（校验不过、路径不合法）时，本项目的正确反应是把原因带回去，
不是在这边补一段「先自己写进去再想办法」。

## 契约文件：记录仓库声明，本项目核对

本机仓库的数据不能照着印象读：`../learn-english/contract.json` 由记录仓库自己声明本工作台依赖的
那几件事，`scripts/vite/english-notes-contract.ts` 逐项核对，对不上就把差异说出来，而不是让页面
「正常但为空」。

| 字段 | 本项目对应的来源 |
| --- | --- |
| `contractVersion` | `english-notes-contract.ts` 的 `CONTRACT_VERSION`（本项目支持的版本） |
| `python` | 写 / 删脚本跑 `python3` |
| `notesDir` | `english-notes-store.ts` 的 `NOTES_DIR` |
| `recordsDir` | `english-records-store.ts` 的 `RECORDS_DIR` |
| `masteredRecordsDir` | `english-records-store.ts` 的 `MASTERED_RECORDS_DIR` |
| `categoriesFile` | `NOTES_DIR` + `CATEGORY_CONFIG_FILE` |
| `commands.writeNote` | `english-notes-write.ts` 的 `NOTE_SCRIPT` + `write` |
| `commands.deleteNote` | `english-notes-delete.ts` 的 `DELETE_SCRIPT` + `delete-note` |
| `commands.deleteRecord` | `english-records-delete.ts` 的 `RECORD_SCRIPT` + `delete-record` |

- 脚本路径、笔记目录、分类清单文件只在各自的模块里写一份，契约与它们比，本项目内部不再抄第二份；
- 时机：`pnpm dev` 启动时对不上只在日志里 warn，英语接口每次请求都重新核对并回 500 + 原因，
  其它页面不受影响；`pnpm build` 直接失败（构建产物整份来自记录仓库，契约不对就不发快照）；
- 每次请求都读一遍契约（几行 JSON，成本远低于一次笔记读盘）：记录仓库改了契约，页面立刻报差异，
  不必等重启；
- 记录仓库改了上面任一字段都要把 `contractVersion` +1，本项目先改 `CONTRACT_VERSION` 再改对应常量；
- 记录仓库侧由 `RepoContractTest`（`learn-from-english/tests/test_rule_invariants.py`）保证声明与
  实际目录 / 子命令一致，契约写歪了它先失败。

## 分类清单不在本项目

笔记的分类键、中文标题、看板列顺序与「是否展示」只有一份来源：记录仓库的
`learning-record-notes/categories.json`。`english-notes-store.ts` 把它和笔记一起读出来，
随 `{ categories, notes }` 一起返回（开发接口与构建索引都带），前端只消费、不维护分类表。

- **不要在 `src/pages/EnglishNotes/constants.ts` 里再写一份分类数组**：那样记录仓库加分类，
  页面会把新前缀的笔记静默隐藏。
- 清单缺失或格式不对时按空数组处理，前端回落为「按笔记里出现的分类键成列、标题用键名」；
  笔记里出现、清单没声明的键同样成列，按键名追加在末尾。
- 清单里标 `hidden` 的分类（如套题 `paper`）不进看板与表格，也不占翻页计数。

## 笔记按分类分目录

记录仓库的笔记放在 `learning-record-notes/<category>/<category>-<slug>.md`，目录名与文件名前缀
必须一致（`errors/errors-back-west-spacing.md`），目录根只放 `categories.json` 与 `README.md`。
读盘侧据此做三件事：

- `isNoteName` 校验的是**相对笔记目录的路径**：`<category>/<category>-<slug>.md`，目录与前缀不一致、
  旧版平铺名（`errors-foo.md`）、路径穿越写法一律拒绝；
- 列表摘要的 `name` 就是这条相对路径（`errors/errors-a.md`），前端不要自己拼目录；
- 构建产物按同一路径落文件（`english-notes/<category>/<file>.md`），前端取正文时逐段编码，
  整串 `encodeURIComponent` 会把 `/` 编成 `%2F`，静态文件与中间件都取不到。

## 列表只发摘要，正文按名取

列表要展示的只有「文件名 / 分类 / 目标知识点 / 笔记更新时间」，正文只在打开某一篇时才有用。
所以读盘侧把这两件事拆开：

| 取数入口 | 内容 | 用途 |
| --- | --- | --- |
| `GET /api/english/notes`（构建期 `english-notes.index.json`） | 分类清单 + 每篇**摘要** | 首屏列表 |
| `GET /api/english/notes?name=…`（构建期 `english-notes/<category>/<文件名>`） | 这一篇的摘要 + 正文 | 打开预览、保存后重取 |

- 摘要里的 `categoryKey` / `topic` / `updatedAt` 由 `english-notes-store.ts` 读盘时解析好
  （正文基础信息表优先，分类缺失回落文件名、时间缺失回落文件 mtime）。**前端不要再扫正文**：
  那等于列表必须带着全部正文下发，每进一次页面多付几百 KB。
- 正文按名取是唯一路径，**别在列表里再塞一份 `content` 当兜底**：旧副本会让页面显示与源文件
  不一致的内容，比读失败更糟。
- 静态构建下每篇正文是独立静态文件；取不到时页面明确报错并关弹窗，不用空正文冒充一篇。
- 列表页的正文位有 loading 态（`MarkdownPreviewModal` 的 `loading`），取正文期间不给编辑 / 刷新入口。

## 记录库（知识库页面）：合并两个目录，删除也交给记录仓库

「知识库」页面（`src/pages/EnglishKnowledgeBase`）展示记录仓库的两份记录：

| 目录 | 文件形态 | 状态 |
| --- | --- | --- |
| `learning-records/<category>.json` | 对象，记录在 `records` 映射下（键是记录 ID） | `learning` / `familiar` |
| `mastered-learning-records/<category>.json` | 根节点就是记录数组 | 一律按 `mastered` |

`english-records-store.ts` 把两边摊平成同一种 `RecordDetail`：已掌握记录字段更精简，缺失的
复习次数 / 历史 / 下次复习时间在这里补成 0 / 空数组 / null，掌握分记 10。**页面不要自己判目录**。

- **排序**：`updatedAt` 取 `last_reviewed_at / last_learned_at / mastered_at / first_learned_at`
  里最新的一个，全库按它倒序（新的在前）；没有时间的记录排最后，同一时间按 ID 排，保证顺序稳定；
- **容错**：ID 分类与文件名不一致、状态认不出的记录直接丢弃；单个分类文件坏掉只丢那一类，
  不影响整页（与笔记读盘同一口径）；
- **列表只发摘要**：`GET /api/english/records` 返回 `RecordSummary[]`（不带讲解 / 例句 / 复习历史），
  打开某条时 `GET /api/english/records?id=<category>:<key>` 只读那一个分类文件取详情；
- **连续满分计数**：已掌握记录的 `mastered_ten_streak`（连续 10 分抽查次数）随摘要一起下发，
  列表的「连续满分」列与详情统计行都直接展示这个数；学习中的记录没有这个计数，前端显示占位而非 0。
  清零与满额自动归档的规则住在记录仓库（见其 README），本项目**只读这个数**，不在本地再判一次阈值；
- **构建产物**：`english-records.index.json`（摘要）与 `english-records/<category>/<key>.json`（详情），
  前端 `records-api.ts` 的 `DETAIL_DIR` 必须与插件常量 `RECORDS_DETAIL_DIR` 一致；
- **ID 口径**：`<category>:<key>`，分类小写字母、key 小写字母 / 数字 / 连字符，`isRecordId` 是唯一校验，
  删除请求在拼命令前必须先过它（脚本自己也会再校验一次）。

删除走 `DELETE /api/english/records?id=…`（仅开发模式）：`english-records-delete.ts` 跑
`python3 skills/learn-from-english/scripts/learning_records.py delete-record --id <id>`（cwd 是记录仓库根，
上限 30s），收敛成 `{ id, category, status, title, file, noteFile }` 并核对脚本回显的 ID；
随后 `english-notes-commit.ts` 的 `commitRecordDeletion` 只 stage 脚本报出来的那份记录文件，
提交标题 `[records]: 删除 <key>`，提交后推送（推送失败不阻断删除，原因回传页面）。

- **只删记录、不删笔记**：记录删掉后笔记仍在，属于记录仓库自己的语义，本项目不额外动 md；
- **脚本报「记录已不存在」时按成功口径提示**：翻译成「这条记录已经不在了」，不是错误；
- **不在本项目改记录 JSON**：锁、`revision`、未掌握 / 已掌握拆分、原子替换都在源头脚本里，
  与「删除一篇笔记」同一套理由。

## 前端取数

前端按 `import.meta.env.DEV` 切换：开发态走中间件接口，构建态读构建期快照，
这样生产构建不依赖本机仓库存在。

## 本机任意目录浏览：文件浏览页

文件浏览页展示本机指定目录下的子文件夹与常规文件（不限扩展名），不绑定固定仓库，读盘与写操作都走 Vite 中间件。

| 文件 | 职责 |
| --- | --- |
| `scripts/vite/files.ts` | 路由壳：`GET /api/files`（未带 `dir` 回落主目录）、`GET /api/files?dir=…`、`POST /api/files/pick-dir`（系统目录选择框）、`POST /api/files/new-folder`、`POST /api/files/rename`、`POST /api/files/move`、`POST /api/files/delete`，错误归类成 HTTP 状态码 |
| `scripts/vite/files-store.ts` | 路径校验、条目归类、文件夹直属条目计数、文件归类（视频 / PDF / Markdown / 其它）标记、选择器脚本拼装，以及新建 / 重命名 / 移动 / 删除的写盘与冲突拒绝、错误文案与错误码收口 |

- **不读文件内容**：接口只下发名称 / 路径 / 大小 / 修改时间等摘要；文件预览是单独任务；
- **仅开发模式**：中间件挂在 `configureServer`，静态构建不带这些接口，页面回落「静态构建不支持读取本地目录」提示态，不产出目录快照；
- **路径校验**：`~` 展开为用户主目录，其余必须是绝对路径；相对路径拒收，避免拼到进程 cwd 上读到意料之外的位置；隐藏条目（点开头）与符号链接跳过；
- **目录选择**：`pick-dir` 走 `osascript` 调起 macOS 系统选择框，body 里的当前目录作为 `default location` 让选择框默认停在当前路径；返回 POSIX 路径；用户取消按 `cancelled` 收口，不报错；
- **新建文件夹**：`new-folder` 在当前目录落一个默认名「未命名文件夹」的空目录，重名依次追加 `2、3…`，不覆盖已有文件夹；前端拿到后打开改名弹窗（取消保留条目，不删除）；
- **重命名 / 移动**：`rename` 改一条条目名字，`move` 把文件或文件夹移入目标文件夹；目标已有同名条目按 409 冲突拒绝、不覆盖；文件夹不能移动到它自身或其子文件夹内；条目名拒收空名、路径分隔符、`.` `..` 与点开头的隐藏名；前端文件夹与文件统一在弹窗多行文本域改名，打开即聚焦并全选原名，回车保存、Shift+回车换行，空名或未改动时保存按钮禁用；
- **删除**：`delete` 删除一条条目，文件夹连同内部全部内容递归删除、文件直接删除，均不可恢复；前端 hover 文件夹 / 文件瓦片浮出重命名 / 删除按钮，删除先走 `ConfirmModal` 二次确认，弹窗与成功通知按文件夹 / 文件分别出文案；
- **收藏目录**：收藏列表是页面偏好，存 localStorage（不经中间件、不写盘），条目为 `{ path, name }`，整行点击直达；条目两行展示目录名与完整路径，路径过长省略、hover 显示全文，尾部移除按钮自己吞冒泡；「收藏 / 取消当前目录」整宽按钮排在列表下方；
- **计数口径**：文件夹副文案只数直属条目（文件夹 + 文件），不递归子目录；单条条目读不到就跳过，不影响同级其它条目；
- **筛选**：前端在已取到本页的文件摘要上做两档过滤——文件名关键词（大小写不敏感子串匹配）与分类多选，都只过滤文件、不影响文件夹；已选分类持久化，空分类选择表示不过滤；关键词为会话内状态不持久化；
- **类型图标**：后端按扩展名归类，前端按分类换图标（视频上蓝色，其余弱色）；视频帧封面抽取是单独任务。

## 写操作的底线

1. **只在开发模式可用**（生产构建不暴露写接口）；
2. **必须校验路径**：禁路径穿越（`..`、绝对路径、多余层级），禁写 `categories.json` 与目录说明文件；
   路径口径与记录仓库的 `check_note.py` 一致——只认 `<category>/<category>-<slug>.md`，目录名必须等于
   文件名前缀，分类键小写字母、slug 只用小写 ASCII 字母 / 数字 / 连字符。中文 slug 在源仓库写入时
   就被拒收，这里不再放行，否则预览层会比数据源头更宽容，等于替源仓库藏缺陷；
3. **正文交给记录仓库的笔记脚本落盘与校验**（`python3 skills/take-english-study-notes/scripts/note.py write
   --file learning-record-notes/<name> --content-file <临时草稿>`，cwd 是记录仓库根目录）：
   脚本在 `learning-record-notes/.notes.lock` 排他锁内先原子写入候选正文、再跑 `check_note.py`，
   **校验不过立刻回滚成保存前的正文**并把 `check.issues` 返回（退出码 1）——本项目只把问题行拼成一句
   `笔记校验未通过，已撤销保存。第 N 行：…` 回给页面，**不自己写 md、也不自己判断格式**。
   校验器不可用时脚本照写并回 `note_status: unverified`；
4. 写入成功后由同一个中间件把该文件提交到 `learn-english`：只 stage 这一个文件，提交信息半固定为
   `docs(notes): 手动编辑 <文件名去扩展名>` + 固定正文「通过 my-dashboard 的 Markdown 预览弹窗保存」；
5. 内容无变化时不产生空提交；提交失败不阻断保存，原因回传到 header 的保存状态提示（红色文案）。

## 删除一篇笔记：调记录仓库的脚本，再提交并推送

`DELETE /api/english/notes?name=…`（仅开发模式，前端只在 `import.meta.env.DEV` 里给入口）。
`mode` 决定这次删哪一边：没带 / 带别的值 = 两边都删，`markdown` = 只删 md、记录留在库里，
`record` = 只删记录、md 留作练习材料。页面删除确认层的两个 checkbox（Markdown / Record，默认只勾
Markdown）就是这三条路的入口，一项都没勾时删除按钮不可点。

md 与它的学习记录两半都在记录仓库里，所以**删除动作交给记录仓库自己的脚本**
（`python3 skills/learn-from-english/scripts/learning_records.py delete-note --note learning-record-notes/<name>`，
cwd 是记录仓库根目录；`mode=markdown` 加 `--keep-record`、`mode=record` 加 `--keep-note`，两个开关
一起写等于什么都不删、脚本直接报错）。本项目不实现删除，只做三件事：

| 步骤 | 谁做 | 失败时 |
| --- | --- | --- |
| 1 | 先按笔记路径规则校验 `name`（`isNoteName`），再由 `english-notes-delete.ts` 拼命令、跑脚本（上限 30s）、把 stdout 的 JSON 收敛成 `{ noteDeleted, record, recordError, recordKept }` 并核对脚本回显的路径 | 抛错给前端，后面不执行；路由把原因翻成中文（脚本原文是英文）；脚本卡在 `.records.lock` 上超时会被掐断并提示稍后重试 |
| 2 | 脚本自己：校验路径 → 按开关删 md / 删那条记录 / 两边都删 | 两边都删时 md 已删、记录没删成，脚本回 `record_error` 而不是退出，本项目原样带给页面（`recordError`）；只删记录时找不到记录（或记录 ID 不属于这篇笔记）直接失败，不让一次「只删记录」白按 |
| 3 | `english-notes-commit.ts`：`git add` 这次真正改了的文件 → `git commit`（删了 md 时 `docs(notes): 删除 <文件名去扩展名>`，只删记录时 `docs(records): 删除 <文件名去扩展名> 的学习记录`）→ `git push` | 提交 / 推送失败不阻断删除，原因回传前端 |

- **为什么不在本项目改记录 JSON**：记录写入有它自己的规矩（文件锁、`revision` 加一、未掌握 / 已掌握
  拆分、原子替换），复制一份写回逻辑必然和源仓库漂移；脚本是源仓库唯一允许改 `learning-records/*.json`
  的口子。契约（输出字段、路径校验、错 ID 不误删别人知识点）写在源仓库 `README.md` 的
  「删除记录与笔记」；
- **只提交脚本报出来的那份记录文件**：`record.file` 由脚本给（`learning-records/<category>.json` 或
  `mastered-learning-records/<category>.json`），本项目不再自己判断记录落在哪一侧；
- **推送只在删除流程里做**：手动保存仍旧只提交、不替用户推；删除一次改动 md 与记录两处，删完推上去远端
  才不会留着一篇已经不存在的笔记。没配上游分支时跳过推送并说明原因，不算失败；
- **前端只拿到「这边删没删 / 那边留没留 / 提交 hash / 推送失败原因」**，据此给一条提示（已删除 + 已提交 + 是否推送成功），
  不把中间状态改成一句「已删除」；
- **`record_kept` 与 `record_error` 不是一回事**：`mode=markdown` 时脚本回 `record_kept: true`
  （确实有一条本来会被删掉的记录被留下；没有记录 ID 的笔记回 `false`），这时不校验 ID、也不给
  `record_error`；`record_error` 只表示「本想删但没删成」。页面按这两个字段分别说「记录已保留」与「记录删除失败」；
- 提交带 pathspec，只提交这次真正改了的文件（只删记录时 md 不进 pathspec），不捎上仓库里其它预暂存改动；
- **失败原因要说中文**：脚本用 argparse 报错（`note does not exist: …` / `cannot read note categories …`），
  `deleteFailureMessage` 按原因归类成「这篇笔记已经不在了」「读不到笔记分类清单，已拒绝删除」等，
  认不出的保留原文并加「删除失败：」前缀，不把英文句子直接丢给页面。

## 笔记内容出问题：改源头 md，不在预览层打补丁

标题被未闭合的折叠块吞掉、字段缺失、模板写歪这类现象，**根因在 md 正文**：

1. 先定位到 `../learn-english` 的具体文件与行号，说清怎么改；
2. 由 md（或 `check_note.py` 这类校验）修掉；
3. **不要**顺手在 `MarkdownPreviewModal` / `OutlineNav` 里加「兼容畸形数据」的兜底——兜底会把数据缺陷
   藏起来，还会被后来者当成正常契约。

判据：把那段 md 改成正确形态后现象是否消失，消失即修数据。通用原则见 `best-react-code` 的
《先判根因归属》。
