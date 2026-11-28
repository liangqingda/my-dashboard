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
- 摘要**只读文件头**（`readNoteHead`，上限 16KB、截到整行）：基础信息表在正文最前面，正常笔记
  不必把整篇正文读进内存；文件头被截断且信息表没完整落在里面时才回落整读。读盘并发也封顶，
  摘要的内存峰值不随笔记总数线性上涨。
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
  摘要走独立的推导（`collectRecordSummaries` 不构造 `RecordDetail`，分类文件逐个读），
  不为列表把全库详情摊进内存；
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

文件浏览页展示本机指定目录下的子文件夹、应用包（`.app`）与常规文件（不限扩展名），不绑定固定仓库，读盘与写操作都走 Vite 中间件。

| 文件 | 职责 |
| --- | --- |
| `scripts/vite/files.ts` | 路由壳：`GET /api/files`（未带 `dir` 回落主目录）、`GET /api/files?dir=…`、`GET /api/files/content?path=…`（视频按 Range 流式读）、`GET /api/files/image?path=…`（图片字节）、`GET /api/files/thumb?path=…`（图片 / 视频缩略图，网格用）、`GET /api/files/video-apps`（能播视频的本机应用）、`GET /api/files/app-icon?path=…`（应用图标 PNG）、`GET /api/files/app-residue?path=…`（卸载残留清单）、`POST /api/files/open-app`（打开应用包）、`POST /api/files/pick-dir`（系统目录选择框）、`POST /api/files/new-folder`、`POST /api/files/rename`、`POST /api/files/move`、`POST /api/files/delete`、`POST /api/files/open`（交给外部播放器）、`POST /api/files/uninstall-app`、`POST /api/files/eject`（body `{ dir, killPids? }`：推出当前目录所在的外接盘，返回 `{ result }`）、`POST /api/files/capture`（视频帧截图写目录，缺省桌面）、`POST /api/files/crop`（body `{ path, dataUrl, mode }`：保存图片裁剪结果）、`POST /api/files/wallpaper`（body `{ path }`：把一张本机图片设为桌面墙纸），错误归类成 HTTP 状态码 |
| `scripts/vite/files-store.ts` | 路径校验、条目归类、应用包从文件夹里分出来单独成列、文件夹直属条目计数、内含分类摘要与「直属是否含应用包」，供类型筛选过滤文件夹、文件归类（视频 / PDF / Markdown / App / 其它）标记、选择器脚本拼装，以及新建 / 重命名 / 移动 / 删除的写盘与冲突拒绝、错误文案与错误码收口；文件摘要带 `cloudPlaceholder`（iCloud 云端占位） |
| `scripts/vite/files-cloud.ts` | iCloud 云端占位识别（按 `stat.blocks === 0` 判定）与按需下载：`brctl download` 触发 CloudDocs 拉取后轮询块占用直到落地，超时抛错；图片预览与缩略图取数前先确保本地已落地 |
| `scripts/vite/files-handles.ts` | 本进程的读流登记表：`openTrackedStream` 打开即登记、`close` 自动销号，`releaseStreamsUnder` 在推出外接盘前把这一卷下的读流全部销毁并等它们真的关掉。读流生命周期只跟一次响应走，**不在模块里缓存句柄**——缓存一条流等于把整块盘的寿命绑在页面停留时长上 |
| `scripts/vite/files-picker.ts` | 原生目录选择框：首次把一段 Swift `NSOpenPanel` 源码编进 `node_modules/.cache`，服务启动时后台预热，之后每次选择只起小二进制；编译 / 运行不可用时回落 `osascript` |
| `scripts/vite/files-apps.ts` | 应用包识别（`.app` 目录与指向它的符号链接）、Info.plist 解析（`plutil`）、残留推导（用户级与系统级）、打开（校验 `.app` 后交给系统 `open`）、卸载（先退应用再删整包与残留，权限不足时弹一次授权窗补删） |
| `scripts/vite/files-app-icons.ts` | 应用图标按需抽取：从包内 `Contents/Resources` 找 `.icns`，`sips` 转成 PNG，按「包路径 + 修改时间」缓存在临时目录 |
| `scripts/vite/files-video-apps.ts` | 能播视频的应用清单：扫 `/Applications`、`/System/Applications` 与 `~/Applications` 顶层的 `.app`，读 `Info.plist` 的 `CFBundleDocumentTypes`，声明了视频统一类型标识（或视频扩展名）的才算，按应用名去重；再剔掉 `EXCLUDED_VIDEO_APPS` 里那批「顺带能放视频、但不是播放器」的应用（网盘 / 阅读 / 聊天 / 音乐 / 系统 QuickTime） |
| `scripts/vite/files-thumbs.ts` | 列表缩略图：图片用 `sips` 缩成长边 512 的 JPEG、视频用 `qlmanage` 抽 QuickLook 一帧再转 JPEG，按「路径 + 体积 + 修改时间 + 尺寸」缓存在临时目录，转码并发上限 2；转不出来的返回 null，前端回落分类图标 |
| `scripts/vite/files-wallpaper.ts` | 桌面墙纸：编译一次原生 Swift 助手（缓存在 `node_modules/.cache`），把 `Index.plist` 里所有桌面空间 / 屏幕的 `Desktop` 选项换成这张图（`Idle` 不动，写前备份成 `Index.plist.dashboard.bak`），再重启 `WallpaperAgent` 让桌面刷新（它只在启动时读配置）；编译器缺失时提示装 Xcode 命令行工具 |
| `scripts/vite/files-open.ts` | 外部打开：按「指定应用 → IINA → 系统默认」逐级回落，`open -a <app>` 成功即返回实际用上的应用名 |
| `scripts/vite/files-media.ts` | 媒体侧只读 / 写盘：视频路径校验与 MIME、`Range` 解析、读流，以及把 PNG 截图写进指定目录（缺省桌面；文件名取本地时间，重名追加序号） |
| `scripts/vite/files-space.ts` | 卷空间只读侧：解析 `df -kP` 的挂载点与可用块数、按 `/Volumes/` 前缀判定外接卷、拼出 `DirSpace` |
| `scripts/vite/files-volume.ts` | 推出外接盘：释放本进程读流 + `sync` → `diskutil eject`（**从不带 `force`**）；失败时用 `lsof +D` 列占用者，按请求里的 `killPids` 结束同用户、非系统关键进程后重试，系统进程与别的用户进程只列不杀 |

- **列表不读文件内容**：列表接口只下发名称 / 路径 / 大小 / 修改时间等摘要；视频内容在点开预览时按需通过 `content` 接口流式读取（不再整份塞进 JSON），其它文件类型不提供内容接口；
- **仅开发模式**：中间件挂在 `configureServer`，静态构建不带这些接口，页面回落「静态构建不支持读取本地目录」提示态，不产出目录快照；
- **路径校验**：`~` 展开为用户主目录，其余必须是绝对路径；相对路径拒收，避免拼到进程 cwd 上读到意料之外的位置；隐藏条目（点开头）跳过；
- **打开应用**：点网格里的应用瓦片把路径交给 `POST /api/files/open-app`，中间件校验是 `.app` 目录后调系统 `open`（等同 Finder 里双击）；启动请求在跑时不重复拉起，失败弹通知。
- **应用包**：名字以 `.app` 结尾、且实际是目录（含符号链接）的条目单独进 `listing.apps`，不再当文件夹：列表中显示为一条应用（真实图标 + 「应用 / 系统应用」），也不参与文件夹条目计数与分类扫描——包里动辄几千个文件，既拖慢列表、分类也没有意义。普通符号链接仍跳过；符号链接到 `/System`、`/usr` 等只读路径的应用标记 `system: true`，只展示、不给卸载入口；打开 `/Applications` 时额外并入 `/System/Applications` 的应用并按名字去重——Finder 的「应用程序」本来就同时显示这两处，页面只读单个目录会漏掉系统自带应用（图书、备忘录等）；
- **应用图标**：`app-icon` 只接受 `.app` 路径，图标文件必须落在该包自己的 `Contents/Resources` 内；转码失败或只有 `Assets.car` 时回 404，前端回落通用应用图标，不影响条目；
- **卸载**：`app-residue` 先按 bundle id 与显示名精确推导残留（Application Support / Caches / Preferences / Saved Application State / Logs / Cookies / HTTPStorages / WebKit / Containers / Application Scripts / Group Containers / LaunchAgents 与对应的 `/Library` 系统级路径），只返回真实存在的条目；确认弹窗逐条列出后才允许 `uninstall-app`。卸载时先尽力退出应用，再删整包与全部残留；普通删除遇到 `EACCES` / `EPERM` 时用一次 `osascript` 管理员授权补删（会弹 macOS 密码窗），用户取消就按「未删除」如实返回，不假装删干净；
- **目录选择**：`pick-dir` 优先走原生 `NSOpenPanel` 小工具——首次把一段 Swift 源码编进 `node_modules/.cache`，服务启动时后台预热，之后点按钮几乎即时弹出；编译 / 运行不可用时回落到原来的 `osascript` `choose folder`。body 里的当前目录作为默认位置，返回 POSIX 路径；用户取消按 `cancelled` 收口，不报错；前端在选择框等待期间把按钮置为 loading（「正在打开目录选择框」）；
- **新建文件夹**：`new-folder` 在当前目录落一个默认名「未命名文件夹」的空目录，重名依次追加 `2、3…`，不覆盖已有文件夹；前端拿到后打开改名弹窗（取消保留条目，不删除）；
- **重命名 / 移动**：`rename` 改一条条目名字，`move` 把文件或文件夹移入目标文件夹；目标已有同名条目按 409 冲突拒绝、不覆盖；文件夹不能移动到它自身或其子文件夹内；条目名拒收空名、路径分隔符、`.` `..` 与点开头的隐藏名；前端文件夹与文件统一在弹窗多行文本域改名，打开即聚焦并全选原名，回车保存、Shift+回车换行，空名或未改动时保存按钮禁用；应用不给改名 / 拖拽入口（移动或改名 `.app` 会让 Launchpad 与系统登记失效）；
- **删除**：`delete` 删除一条条目，文件夹连同内部全部内容递归删除、文件直接删除，均不可恢复；前端 hover 文件夹 / 文件瓦片浮出重命名 / 删除按钮，删除先走 `ConfirmModal` 二次确认，弹窗与成功通知按文件夹 / 文件分别出文案；
- **收藏目录**：收藏列表是页面偏好，存 localStorage（不经中间件、不写盘），条目为 `{ path, name, pinned }`，整行点击直达；从没打开过目录时默认打开收藏里的第一条（固定项在前），推出外接盘后也回到这条；首次进入时预置一条已固定的「系统应用程序」（`/Applications`）——macOS 主目录里也可能有同名 `Applications`（Chrome 应用快捷方式之类），打开后者看不到应用包，预置这条避免走错；之后它和其余条目一样可取消固定、拖动排序或移除。固定项恒排在最前、不显示移除按钮，未固定项尾部一颗固定图标（固定实心 / 未固定描边，不上强调色）与移除按钮，图标自己吞冒泡；固定组与未固定组之间用一条分割线隔开；所有条目可拖拽排序，拖动只改非固定组内的先后；条目两行展示目录名与完整路径，路径过长省略、hover 显示全文；「收藏 / 取消当前目录」整宽按钮排在列表下方；
- **路径根**：面包屑第一段按当前目录自动选根——`/Users/<用户>` 起为「主目录」（主目录图标、显示用户名）、`/Volumes/<卷>` 起为该卷（移动盘图标）、其余为「本机」（桌面图标、回 `/`）；根可点击直回根路径，根之后的分段按当前路径逐段呈现；
- **加载态**：硬刷新进页时 `loading` 从 `true` 起步，首帧就是骨架 / 遮罩而不是空列表或引导文案；首次进页 / 切目录取数期间列表整块盖一层 `LoadingOverlay`（原有内容留在下面、滚动暂不可用），首次取到结果前仍是骨架；点文件夹时先在目标瓦片 / 表格行上出「正在打开…」与 mini loader，该条目暂不可点，这次取数结束即恢复，不常驻；
- **排序**：文件夹与应用包各按**最后修改时间**倒序（新的在前），同一时刻按名称升序；
  文件**先按类别再按修改时间**——类别次序沿用筛选面板那排（视频 → 图片 → PDF → Markdown → 其它），
  同类别里新的在前。渲染顺序仍是「文件夹 → 应用 → 文件」，于是同类条目在网格 / 表格里连成一段；
  中间件的 `updatedMs` 是排序用的毫秒值，`updatedAt` 是同一份时间的 ISO 文本，读不到时记 0 排在最后；
- **分组展示**：设置面板里可开「按类型分组排列」（默认平铺，偏好存 localStorage，键 `grouped-display`）；开启后网格与表格都按「文件夹 → 应用 → 视频 → 图片 → PDF → Markdown → 其它」切成纵向分段，每段一条分组标题，空组不出现，段内顺序与平铺一致；标题整行可点折叠收起（网格带高度过渡，表格收起即隐藏该段），折叠状态只留会话内；分组只是呈现层排布，不改筛选与排序口径；
- **计数口径**：文件夹副文案只数直属条目（文件夹 + 文件 + 应用包），不递归子目录；单条条目读不到就跳过，不影响同级其它条目；
- **筛选**：前端在已取到本页的摘要上做两档过滤——名称关键词（大小写不敏感子串匹配，过滤文件与应用）与分类勾选（视频 / 图片 / PDF / Markdown / App / 其它，默认全选）：勾了哪类就显示哪类，文件按自身分类、应用按「App」这一档、文件夹按内含分类，空文件夹（直属条目数为 0）不含分类、不参与分类筛选，始终展示；勾了 App 时另列**直属含应用包**的文件夹（`hasApps`，如 `/` 下的 `Applications`、`System` 能点进去），`/Applications` 与 `/System/Applications` 即使扫描没标出 `hasApps` 也按应用目录露出（兜住权限 / 缓存异常）；只有包里深层才有的 app 不算；「全部」与分类列表用一条分割线隔开：多选模式下它是复选框（全勾选中、部分勾选半选、一个没勾未选，点它全选 / 全清），单选模式下是单选框。只勾「App」时会自动切到收藏里的「系统应用程序」目录（已在 `/Applications` 不重复打开）。操作方式可在设置面板切「多选 / 单选」：多选可同时勾几类，单选一次只能留一类（「全部」表示不筛选），从多选切到单选时选择不是「恰好一类」就收敛成全部。勾选与操作方式都持久化（键 `type-filter-selected` / `type-filter-mode`）；关键词为会话内状态不持久化；
- **文件夹分类摘要**：`listing.folders[].categories` 给出文件夹内出现过的分类（含深层），中间件按「先浅后深、找齐各档即停」扫描，累计 2000 个条目或 6 层为止，超出预算的深层内容不保证计入；应用包按一条 `app` 分类计入、不再往包里扫；另有 `hasApps` 只表示**直属子项**里有应用包。两者只服务于筛选时决定文件夹露不露出，不是精确的全树统计；
- **类型图标**：后端按扩展名归类，前端按分类换图标（视频与图片上蓝色，其余弱色）；视频帧封面抽取是单独任务。
- **视频预览与截图**：`content` 接口只认视频扩展名（分类表与列表共用同一份），占位视频同样先触发下载到本机再开流，并按 `Range` 回 206
  （浏览器靠它跳转与续播），没有 `Range` 时整份返回；响应带 `Cache-Control: private, max-age=600`
  与 `ETag` / `Last-Modified`（由体积与修改时间算出，文件一变即失效），同一片子重复打开、
  来回 seek 与翻篇回看都能命中浏览器缓存；不带 `Range` 的请求命中 `If-None-Match` 时回 304；`capture` 只接受 PNG data URL，写到 body 里的
  `dir`（缺省 `~/Desktop`），文件名为 `YYYY-MM-DD HH:mm:ss.png`，同一秒重名依次追加 ` (2)`、` (3)`，
  不覆盖已有截图。
- **预览默认全屏**：文件页设置里的两项开关（图片 / 视频）决定两扇弹窗打开时是否直接进整屏
  （`defaultFullscreen` → `useBrowserFullscreen` 的 `autoEnter`）；浏览器拿不到用户手势时静默停在这个尺寸，`F` 仍可手动切换。
- **图片预览**：`GET /api/files/image?path=` 整份返回图片字节（不做 Range），只认图片扩展名
  （分类表里 `image` 那一档，不收 `.svg`），`Cache-Control: no-store`、支持 `HEAD`；
  浏览器直接把它塞进 `<img src>`，前端通过 `ImagePreviewModal` 消费。
  iCloud 云端占位文件先由后端触发下载到本机再读字节；预览期间舞台显示「正在从 iCloud 下载…」，
  真正解码失败才回落「这张图片无法显示」。
  `content` / `image` / `capture` / `audio` / `crop` 五个接口都只在开发模式存在。
- **图片裁剪**：图片预览 header 的裁剪图标进入裁剪态，前端按选框从已加载的 `<img>` 重新编码成
  PNG / JPEG / WebP（与源扩展名一致），再调 `POST /api/files/crop`（body `{ path, dataUrl, mode }`，
  上限 80MB）。`mode: 'replace'` 先写同目录临时文件再 `rename` 原子覆盖源文件（不是先删再写，
  失败时源文件仍是原样）；`mode: 'copy'` 写到同级的 `<文件名> - 裁剪/` 目录，文件名
  `<文件名> - N.<扩展名>`，N 取该目录已有编号的 max + 1（删过旧文件也不复用编号），写入带 `wx`
  不覆盖。只收 PNG / JPEG / WebP——换成别的格式会让扩展名与内容对不上（GIF 还会丢动画）；
  接口返回 `{ crop: { mode, path, name, dir } }`，前端按 `mode` 决定「换地址版本重取图」还是
  「重读目录露出新文件夹」。
- **设为桌面墙纸**：列表里的图片条目（网格 hover 浮出 / 表格行常态）与图片预览 header 各有一颗按钮，
  都只打开二次确认层（`WallpaperConfirm`），确认后调 `POST /api/files/wallpaper`；中间件先按图片接口的规则校验路径，
  再用原生助手把 `Index.plist` 里所有桌面空间 / 屏幕的 `Desktop` 选项换成这张图，最后重启 `WallpaperAgent`——
  macOS 26 起它只在启动时读一次配置，不重启就只写文件、桌面不动（旧实现漏了这一步，表现为「提示成功但没变」）。
  写入前自动备份为 `Index.plist.dashboard.bak`；助手需要 Xcode 命令行工具，缺失时提示安装。
- **外部打开**：`POST /api/files/open`（body `{ path, app? }`）用系统 `open` 调起播放器：
  给了 `app` 先试它，其次 `open -a IINA`，再回落 `open <path>`（系统默认播放器），
  返回 `{ app }` 为实际用上的应用名（`default` 表示系统默认播放器）；
  只收存在的绝对路径，非 macOS 直接回不支持。给的是「绕开浏览器」的那条路——
  浏览器解不动的编码（HEVC / mkv 等）或想更快起播时，本地播放器硬解 + 直接读盘快得多。
  `app` 由文件页设置里的「外部应用」提供（候选来自 `video-apps`）。这份候选要读十几个
  `Info.plist`，所以前端带页面级缓存：`fetchVideoApps` 把结果/在途请求记在模块里（失败不缓存），
  `FilesActions` 挂载时用 `resetVideoAppsCache` 清掉——同一次页面停留内反复开关设置面板不再重扫，
  装完新播放器刷新页面即可看到。
  两处入口都用它：视频预览 header 那颗按钮（`VideoPreviewModal` 的 `onOpenExternal`），
  以及把设置改成「外部应用」后点视频直接交给播放器（`useVideoPreview` 的分流，不开弹窗）；
  由页面的 `useVideoPreview` 接成提示；列表里指针停在视频条目上时还会用 `Range` 预取前 512KB 文件头
  （`src/pages/Files/utils/video-prefetch.ts`，同路径一分钟内只拉一次），点开时首帧不必再等一次往返。
- **列表缩略图**：`GET /api/files/thumb?path=` 给网格瓦片出图——图片走 `sips` 缩到长边 512 的 JPEG，
  视频走 `qlmanage -t` 让 QuickLook 抽一帧、再用 `sips` 转成同尺寸 JPEG（用系统解码，前端的 `video + canvas` 拿不下的编码它也出得来；
  QuickLook 只出 PNG，不转一道缓存盘会被帧图堆起来）。
  512 是按「瓦片最宽 248px × 2 倍图」定的：缩略图比这再小，瓦片放大后就会糊。
  按「路径 + 体积 + 修改时间 + 尺寸」缓存在临时目录，`Cache-Control: private, max-age=600`；转不出来返回 404，
  前端（`utils/media-thumbs.ts` 拼 URL、`FileTile` 的 `onError`）回落分类图标。
  占位文件先落地再转码；列表摘要里 `cloudPlaceholder` 为真时瓦片 / 表格不挂缩略图，
  改摆分类图标 + 下载徽标（Tooltip 提示点开时下载）。
  网格里视频在「外部应用」模式下由设置 `video-thumb-style` 决定大图：默认摆所选播放器的图标
  （`GET /api/files/app-icon?app=<应用名>`，应用名由 `files-video-apps.ts` 的
  `videoAppBundlePath` 映射成包路径，名字为空回落 IINA）；选「视频帧」时大图仍走缩略图，
  播放器图标缩成 22px 小徽标排在体积右侧、与文字垂直居中，不画分割线；取不到图标就只留体积。
  表格视图（`FilesTable`）仍是小号分类图标，不参与缩略图。
- **可用空间**：`GET /api/files` 的 `listing.space` 同时下发启动卷 `/` 的剩余空间，以及当前目录
  所在的那一卷（只在它被判定为外接卷时给，`external` 为 `null` 表示目录就在启动卷上）。
  判定口径是「挂载点在 `/Volumes/` 下、且不等于启动卷的挂载点」，启动卷的 APFS 数据卷
  `/System/Volumes/Data` 不会被当成外接盘；后端用 `df -kP` 一次取挂载点与可用块数。
  读不到（`df` 不可用、路径读不出）`space` 就是 `null`，页面只是不显示那句描述，目录列表照常出；
  页面只把两个数字拼成文案（`src/pages/Files/utils/files.ts` 的 `describeDirSpace`）传给
  `MenuContentLayout` 的 `description`，不自己调 `df`，也不做后台定时刷新。
- **预览读流不牵挂外接盘**：视频 / 图片的字节都经 `openTrackedStream` 打开并登记，
  响应一结束（正常读完、读盘出错、浏览器换页或拖进度条中途断开）由 `pipeline` 销毁读流；
  不在模块里缓存句柄，句柄只跟这一次响应走，页面停多久都不会把盘钉住。
- **推出外接盘**：只有当前目录落在 `external` 上时，标题栏才多一颗推出按钮（常态走强调色，
  与收藏按钮同档）。点击先弹 `ConfirmModal` 二次确认（显示卷名与挂载点）；确认后页面先关掉
  视频 / 图片预览（还开着的预览会继续从盘上取字节，刚放掉的句柄立刻又被拿回去），再调
  `POST /api/files/eject`（body `{ dir }`）。中间件依次做：用 `df` 反查真实挂载点、核对
  `/Volumes/` 与非启动卷 → 销毁本进程这一卷下的读流 → `sync` 落盘 → `diskutil eject`
  （**从不带 `force`**）。成功返回 `status: 'ejected'`（带释放条数）；被别的程序占着时返回
  `status: 'busy'` 与 `lsof +D` 列出的占用进程，页面据此弹第二次确认：用户点「结束 N 个进程并推出」
  后带 `{ dir, killPids }` 再调一次，中间件只结束清单里**同用户、非系统关键**的进程
  （先 `TERM`、等不到再 `KILL`），再 `sync` + 重试；系统进程（Spotlight / Finder 这类）与
  别的用户起的进程只列出来、不做动作。任一步卸载失败都如实报原因，不强制推出、也不假装成功。
  成功后切回默认目录（收藏第一条），若那条也在要退的盘上就回落主目录。

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
