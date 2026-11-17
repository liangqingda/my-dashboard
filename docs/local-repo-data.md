# 本机仓库数据链路（`../learn-english` 等）

## 只走 Vite 中间件，不新增后端服务

本机仓库数据（如 `../learn-english`）一律通过 `scripts/vite/*` 的 Vite 开发中间件读盘，
**不新增独立后端服务**，也不让前端直接假设某个 HTTP 服务在跑。

英语笔记插件按职责拆成三层，改动时按层归位：

| 文件 | 职责 |
| --- | --- |
| `scripts/vite/english-notes.ts` | 路由壳：只做请求解析与响应 |
| `scripts/vite/english-notes-store.ts` | 读写与校验：落盘、结构校验、文件名合法性、读分类清单 |
| `scripts/vite/english-notes-delete.ts` | 删除一篇笔记：跑记录仓库的 `learning_records.py delete-note`，把它的结果收敛成页面要的形状 |
| `scripts/vite/english-notes-commit.ts` | 自动提交：把这一次改动提交到 `../learn-english`（删除流程提交后还会推送） |

## 分类清单不在本项目

笔记的分类键、中文标题、看板列顺序与「是否展示」只有一份来源：记录仓库的
`learning-record-notes/categories.json`。`english-notes-store.ts` 把它和笔记一起读出来，
随 `{ categories, notes }` 一起返回（开发接口与构建索引都带），前端只消费、不维护分类表。

- **不要在 `src/pages/English/constants.ts` 里再写一份分类数组**：那样记录仓库加分类，
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

## 前端取数

前端按 `import.meta.env.DEV` 切换：开发态走中间件接口，构建态读构建期快照，
这样生产构建不依赖本机仓库存在。

## 写操作的底线

1. **只在开发模式可用**（生产构建不暴露写接口）；
2. **必须校验路径**：禁路径穿越（`..`、绝对路径、多余层级），禁写 `categories.json` 与目录说明文件；
   路径口径与记录仓库的 `check_note.py` 一致——只认 `<category>/<category>-<slug>.md`，目录名必须等于
   文件名前缀，分类键小写字母、slug 只用小写 ASCII 字母 / 数字 / 连字符。中文 slug 在源仓库写入时
   就被拒收，这里不再放行，否则预览层会比数据源头更宽容，等于替源仓库藏缺陷；
3. 保存落盘后由同一个中间件把该文件提交到 `learn-english`：只 stage 这一个文件，提交信息半固定为
   `docs(notes): 手动编辑 <文件名去扩展名>` + 固定正文「通过 my-dashboard 的 Markdown 预览弹窗保存」；
4. 内容无变化时不产生空提交；提交失败不阻断保存，原因回传到 header 的保存状态提示（红色文案）。

## 删除一篇笔记：调记录仓库的脚本，再提交并推送

`DELETE /api/english/notes?name=…`（仅开发模式，前端只在 `import.meta.env.DEV` 里给入口）。

md 与它的学习记录两半都在记录仓库里，所以**删除动作交给记录仓库自己的脚本**
（`python3 learn-from-english/scripts/learning_records.py delete-note --note learning-record-notes/<name>`，
cwd 是记录仓库根目录）。本项目不实现删除，只做三件事：

| 步骤 | 谁做 | 失败时 |
| --- | --- | --- |
| 1 | 先按笔记路径规则校验 `name`（`isNoteName`），再由 `english-notes-delete.ts` 拼命令、跑脚本（上限 30s）、把 stdout 的 JSON 收敛成 `{ record, recordError }` 并核对脚本回显的路径 | 抛错给前端，后面不执行；路由把原因翻成中文（脚本原文是英文）；脚本卡在 `.records.lock` 上超时会被掐断并提示稍后重试 |
| 2 | 脚本自己：校验路径 → 删 md → 按正文「记录 ID」删那条记录 | md 已删、记录没删成时脚本回 `record_error` 而不是退出，本项目原样带给页面（`recordError`） |
| 3 | `english-notes-commit.ts`：`git add` 这次改的两个文件 → `git commit`（`docs(notes): 删除 <文件名去扩展名>`）→ `git push` | 提交 / 推送失败不阻断删除，原因回传前端 |

- **为什么不在本项目改记录 JSON**：记录写入有它自己的规矩（文件锁、`revision` 加一、未掌握 / 已掌握
  拆分、原子替换），复制一份写回逻辑必然和源仓库漂移；脚本是源仓库唯一允许改 `learning-records/*.json`
  的口子。契约（输出字段、路径校验、错 ID 不误删别人知识点）写在源仓库 `README.md` 的
  「删除记录与笔记」；
- **只提交脚本报出来的那份记录文件**：`record.file` 由脚本给（`learning-records/<category>.json` 或
  `mastered-learning-records/<category>.json`），本项目不再自己判断记录落在哪一侧；
- **推送只在删除流程里做**：手动保存仍旧只提交、不替用户推；删除一次改动 md 与记录两处，删完推上去远端
  才不会留着一篇已经不存在的笔记。没配上游分支时跳过推送并说明原因，不算失败；
- **前端只拿到「记录删没删 / 提交 hash / 推送失败原因」**，据此给一条提示（已删除 + 已提交 + 是否推送成功），
  不把中间状态改成一句「已删除」；
- 提交带 pathspec，只提交这次删掉的两个文件，不捎上仓库里其它预暂存改动；
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
