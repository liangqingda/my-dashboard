# 程序坞：应用级窗口层

把「收起的弹窗」变成一个跨页面、跨刷新都还在的程序坞条目，点条目按快照重建窗口。
它是应用级能力（`DockProvider` 挂在 `App` 的 Router 内、布局外），页面组件不参与恢复。

## 谁能收起

只有**阅读类窗口**接程序坞：`MarkdownPreviewModal`、`RecordDetailModal`、
`ImagePreviewModal`、`VideoPreviewModal`。它们都是「看内容」的窗，收起再打开仍是同一份内容。

确认 / 短表单类弹窗（`ConfirmModal`、删除确认等）**不接**：它们属于 macOS 里 sheet 的语义，
关掉即完成决定，没有「先收起来待会儿再点开」的状态。要接入就必须同时提供可序列化快照与恢复渲染器，
不能只加一颗按钮。

## 描述符与快照

业务弹窗通过 `FreeModal` 的 `dock` 传一份 `DockDescriptor`：

| 字段 | 契约 |
| --- | --- |
| `id` | 稳定且跨页唯一；同一扇窗重复收起只替换这一条。由「窗口种类 + 页面标识 + 内容标识」拼成 |
| `kind` | 四种阅读窗口之一，决定恢复时用哪个渲染器 |
| `title` | 程序坞 tip 与恢复窗口的标题 |
| `snapshot` | 只放可进 localStorage 的字段；恢复时不依赖任一页面状态 |
| `origin` | `page`（默认）收起后要执行 `onClose` 清页面状态；`dock` 再收起只回坞、不删条目 |
| `disabled` | 当前不可收起（编辑中 / 全屏 / 上层确认开着）：按钮保留但置灰 |

快照里能放什么由窗口类别决定：Markdown 存整篇原文；记录详情只存 `recordId` 与标题、正文按 ID 自取；
图片 / 视频存整个目录的最小字段与当前条目（视频多一张封面）。条目最多 8 条，超出按 `createdAt`
淘汰最旧的，避免 localStorage 被快照撑爆。

## 恢复与状态

- 条目里只有 `kind + snapshot`，恢复时按 `kind` 动态 import `src/dock/windows/` 下的渲染器；
  所以切到别的页面、刷新之后都能点开，页面路由不参与恢复。
- 恢复出来的窗口**只保留阅读能力**：编辑、筛选、删除、裁剪、截图、外部打开这些动作依赖原页面的
  回调与文件位置，不在快照里，对应的入口在恢复窗口里不出现。记录详情与图片 / 视频的翻篇由窗口自己的
  状态负责，翻到哪一条会在再次收起时写回快照。
- 页面里的弹窗收起后立即 `onClose`：宿主页面的状态不能留着一半，否则下次从页面打开会撞上旧状态。

## 层级

层级只在 `src/dock/constants.ts` 定义，业务侧不各自写 `z-index`：

| 层 | z-index |
| --- | --- |
| 普通弹窗 | 200 |
| 二次确认 | 320 |
| 服务页全屏拖拽 | 700 |
| 通知 | 800 |
| 恢复出来的程序坞窗口 | 1000 |
| 程序坞条 | 1010 |
| 收放动画的克隆层 | 1150 |
| Tooltip | 1200 |

由此得到两条硬约束：程序坞条必须压过所有弹窗遮罩，遮罩盖不住它；恢复窗口要压过页面里已经开着的
弹窗（含 700 那档全屏拖拽）。Tooltip 在 `MantineProvider` 里统一抬到 1200，否则窗口 header 上的图标 tip
会被 1000 的窗口盖住。

## 布局让位

程序坞停在哪条边，页面就从哪条边让出一条厚度：顶栏、侧栏与正文一起让，侧栏仍贴在顶栏下面。
`dockLayoutVars(placement, reservedThickness)` 输出四个 CSS 变量写到 `AppShell` 根节点，
`layouts/BasicLayout/index.scss` 用双类名覆盖 Mantine 的 Header / Navbar / Main。

- 让位厚度 = 程序坞盒子厚度 + 两侧呼吸位（`dockReservedThickness`）。
- **没有条目、或自动隐藏且当前未唤出时厚度为 0**：空程序坞不该在页面边上留一条空白。
- 停左 / 右时程序坞竖向垂直居中，顶栏与侧栏缩到它外侧；停上 / 下时顶栏与正文整块让开。

## 一次只开一扇

Provider 同时只维持一个 `windowSlot`。打开第二扇时，当前窗口先移到 `closingSlot`（`removeOnExit: false`），
等回坞动画走到 `DOCK_SWITCH_LEAD_RATIO`（约三分之一）再挂新窗口；已有窗口在收尾期间，程序坞点击被忽略。
关闭（X）时 `removeOnExit: true`，动画结束才删条目。

## 动画

`src/dock/utils/dock-motion.ts` 是唯一实现处，业务层不写收放动画：

- 页面弹窗收起：量源框体 → 等程序坞项目出现 → **克隆**框体 fixed 定位，边位移边非等比缩放，
  同时用 `clip-path` 把远端收成漏斗；原窗口可以立即卸载。落点图标打 `data-receiving` 触发回弹。
- 程序坞窗口收起 / 打开：作用在**真实框体**上（收起用 `shrinkWindowToDock`，打开用 `growWindowFromDock`）。
  打开前先把框体 `opacity: 0`，等动画第一帧接管，避免闪一帧终态。
- `prefers-reduced-motion: reduce` 时全部跳过，只做即时挂载 / 卸载。

## 设置与存储

全局设置面板在系统顶栏（`settings-panel`），读写 `app:dock-settings`；收起条目存在 `app:dock`。

- 位置：上 / 右 / 下 / 左，默认右；图标大小、hover 放大倍数、自动隐藏都可调。
- 自动隐藏：隐藏后由顶栏的图标按钮唤出 / 收起；`revealed` 只影响可见性与让位厚度，不删条目。
- 全局毛玻璃浓度：Provider 把 `40%–100%` 写到 `<html>` 的 `--app-glass-strength`，`global.scss` 里
  `--app-glass-*` 用 `color-mix` 乘上它；`100%` 等于原配方。媒体深色遮罩不参与。

## 快捷键归属

`⌘M` 收起当前最上层、可收起的弹窗。键位监听放在 `layouts/BasicLayout`（结构检查只允许
`FreeModal` 与 `layouts/` 监听 keydown）；`FreeModal` 通过 `useDockMinimize` 在打开时把自己登记进
`modalStack`，Provider 的 `minimizeTop()` 返回是否真的收到一扇，没收到就把键让给浏览器。

## 新增一类可收起窗口要动的地方

1. `dock/types.ts` 的 `DockWindowPayload` 加 `kind` 与快照类型（判别联合）；
2. `dock/utils/dock-entries.ts` 的编解码补这一支，坏项一律返回 `null`；
3. `dock/windows/registry.ts` 加动态 import；
4. 新增恢复渲染器：只传快照与 `onRequestClose`，`dockOrigin="dock"`；
5. 业务弹窗接 `dock` 描述符：`id` 稳定、`snapshot` 可序列化、`disabled` 覆盖「不能收」的状态；
6. 本文件补契约与已知限制。
