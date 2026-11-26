# ImagePreviewModal

文件页的**图片预览弹窗**：整图展示 + header 上的图片列表 / 裁剪 / 保存口径设置。与 `VideoPreviewModal` 同形
（同一个 `FreeModal` 外壳、同一个 `PreviewItemList`、同一个 `useBrowserFullscreen`、同一套浮层
header），但去掉播放器那一套：没有播放 / 快进 / 静音 / 截图；header 的显隐也不跟指针走，只由点击开合。

## 它锁了什么

- 结构：header（标题 + 张数 / 翻篇 + 图片列表 + 设为桌面墙纸 + 裁剪 + 设置 + 全屏 + 删除）浮在整图之上，
  正文只有一张黑底舞台；点遮罩关窗（窗口刚拿回焦点的 400ms 内除外），关闭按钮与 `Esc` 同样有效；
- `defaultFullscreen` 为真时打开就尝试进整屏（文件页设置里的「图片预览打开即全屏」），
  浏览器不给手势就静默停在这个尺寸；
- **header 是毛玻璃浮层**（`FreeModal` 的 `headerOverlay`，`trigger: 'click'`）：打开即是收起态，
  先把整幅图看全；隐藏时淡出上移且不挡点击；
- **只由点击开合，hover 不参与**：点一下图片浮出 header，再点一下收起——指针在画面上怎么移动
  都不会让 header 自己浮出或自己藏起来（不自动出现、也不自动收起）。header 收起时按钮不可点
  （`pointer-events: none`），所以这两下的落点一直在大按钮上；
- **双击切全屏**：双击画面进出整屏全屏（与 `F` 同一档，走同一个 `useBrowserFullscreen`），
  **不切 header 显隐**——单点那一下会先等一个双击窗口（`@/hooks/useSingleOrDoubleClick`，
  `DOUBLE_CLICK_WINDOW` = 300ms）再开合 header，第二下到来就把这次开合作废；所以双击只换尺寸、
  header 一动不动，单点则是「晚 300ms 生效」的开关；视频预览的双击全屏共用这一份。
- **关窗顺手复位**：`Esc` / 关闭按钮 / 点遮罩走同一个关窗入口，退出整屏全屏的同时把 header 的
  显示态与列表弹层清掉，下次打开仍是「先看整幅图、点一下才浮出 header」；
- **图片列表收进 header**：不常驻侧栏，header 里一颗「图片列表」图标按钮点开一层（按钮正下方），
  列当前目录的全部图片（顺序 = 翻篇顺序），高亮正在看的一张，整行可点切换并合上弹层；
  弹层开着时按钮保持主色、header 恒可见；此时点图片**只收弹层、不切 header 的显隐**（按下那一刻的
  开合状态记在 ref 里，等点在外部收起后再由 `click` 判断，避免同一下点击做两件事）；
- **裁剪是一档模态**：header 的裁剪图标把画面换成裁剪层，不进裁剪就仍是原来的整图翻篇。
  裁剪态里翻篇 / 全屏 / 删除 / 空格 / 点遮罩 / 关闭按钮全部让位，`Esc` 先退裁剪（由外壳的
  `onRequestEscape` 接管），`Enter` 保存；保存与取消都只经 header 里那一组按钮，失败给提示、状态不丢；
- **保存口径收在 header 的设置弹层**：替换源文件（默认）或另存到同级的「`<文件名> - 裁剪`」目录
  （文件名为 `<文件名> - N.<扩展名>`，N 递增）；偏好按 `storageScope` 记在 `<scope>:image-preview`
  的 `cropSaveMode`，下次打开沿用。设置弹层与图片列表弹层互斥，任一层开着 header 都恒可见；
- **只裁 PNG / JPEG / WebP**：编码保持源扩展名（选框按图片显示区域的比例记录，保存时按
  `naturalWidth / naturalHeight` 换算像素）；其它格式的图，裁剪按钮直接置灰，指针停上去的 tip
  说明「只支持 PNG / JPEG / WebP」——换格式会让扩展名与内容对不上，GIF 还会丢动画；
- 翻篇（按钮 / 列表 / 键盘都算）后左上角浮出一下「3 / 12」，1 秒后自己收掉（`PreviewCounter`）：
  header 默认藏着，用户只需要知道「现在第几个」，不必把整条 header 带出来；刚打开时（还没翻过）不出现；
- 删除只开二次确认层（`onRequestDelete` → 页面的 `DeleteEntryConfirm`），不在弹窗里直接删；
  设为桌面墙纸同理（`onRequestWallpaper` → 页面的 `WallpaperConfirm`），弹窗不碰系统设置；
  删除确认开着时 header 也恒可见（与列表弹层同一档：`suspended` 强制显示）；
- 舞台：整图 `object-fit: contain` 居中装下，加载时压暗并转一个 loader；
  读不出来给「这张图片无法显示」，不留空白也不弹通知；
- **普通窗按图片比例收框**：图片 `load` 报 `naturalWidth / naturalHeight` 后，框体宽高都按这个比例
  从同一组上限算（宽度 ≤ 外壳宽度档与内边距后的 90vw、高度 ≤ 88dvh，竖图按高度反算宽度），
  舞台正好等于图片，`contain` 不再留黑边；框体用 `content-box`，1px 描边不占画面尺寸。
  换图先回默认框、等新图报比例；整屏全屏不参与收框；
- 放大 / 拖拽：捏合缩放（1–5 倍）、放大后按住拖动（见下面「放大与拖拽」一节，实现与通道在
  `ImageStage/hooks/use-image-zoom-pan/README.md`）；
- 提示配色：header 里的 tooltip 与图片列表的省略提示固定深底浅字（`tipDark`），
  压在画面上不随主题反转。

## 放大与拖拽

| 手势 | 效果 |
| --- | --- |
| 触控板两指外扩 / 内收（Safari 走 `gesture*`，其余浏览器走带 `ctrlKey` 的 `wheel`） | 放大 / 缩小，以指针位置为锚点 |
| `Ctrl` + 滚轮 | 与捏合同一条路径（桌面鼠标的替代入口） |
| 放大后按住拖（含系统「三指拖拽」打开后的三指手势、触屏单指） | 移动画面，光标 `grab` / `grabbing` |

- **倍率 1–5**：1 是「整图装下」，不再往下缩；位移怎么夹、锚点怎么算在
  `ImageStage/hooks/use-image-zoom-pan/README.md`；
- **单击 / 双击口径不变**：拖拽超阈值后的那一次 `click` 由舞台在捕获阶段吞掉（不会顺手开合 header），
  双击仍然只切整屏、不兼作缩放开关——同一个手势挂两个动作会互相打架；
- **换图即复位**：`ImageStage` 按 `activeId` 换实例，翻篇 / 选中别的图 / 重开弹窗都回到 1 倍；
- 图片还在加载或读不出来时不改倍率（捏合仍会拦掉浏览器的整页缩放）、也不接拖。

## 裁剪

| 操作 | 效果 |
| --- | --- |
| header 裁剪图标 | 进裁剪态：先缩放回 1 倍、放大 / 平移关掉；选框默认居中 80%，8 个手柄改尺寸（最小 32px），框内拖动平移 |
| `Enter` / header「保存」 | 按选框重编码并写盘；保存中按钮转 loader，成功后退出裁剪并刷新画面 |
| `Esc` / header「取消」 | 退出裁剪，原图不动（裁剪态的 `Esc` 只退这一层，不关弹窗） |
| header 设置图标 | 弹层里选「替换源文件 / 另存新目录」，改完即写进偏好，下次沿用 |

- 选框存的是**相对图片显示区域的比例（0–1）**，窗口缩放 / 窗口改尺寸都不改变已选的范围；
- 保存成功后按收口模式刷新：`replace` 给 `<img>` 的地址加版本参数重取（地址不变时浏览器可能复用旧帧），
  `copy` 重读当前目录，把新建的「`- 裁剪`」文件夹露出来；
- 落盘细节（原子覆盖、目录与编号、80MB 上限）见 `docs/local-repo-data.md` 的「图片裁剪」。

## 键盘

| 键 | 动作 |
| --- | --- |
| `[` / `]`、`←` / `→` | 上一张 / 下一张（方向键不开快进，图片没有时间轴）；首尾相接循环，只有一张时两端都置灰 |
| `F` | 全屏 / 退出全屏 |
| `Esc` | 裁剪态先退出裁剪；全屏里交给浏览器退出；非全屏关闭弹窗 |
| `Enter` | 裁剪态保存（由 `extraKeys` 挂进外壳的键位表；非裁剪不动作） |
| `Delete` / `Backspace` | 触发删除确认 |
| `空格` | 关闭弹窗（与其它弹窗一致；只有视频预览把空格让给了播放 / 暂停） |

删除确认开着时整组快捷键与焦点陷阱都交给那一层（`blocked`），与视频预览同一口径。

## props

见 `types.ts`：`opened` / `items` / `activeId` / `blocked` / `storageScope` / `onClose` / `onSelect` /
`onRequestDelete`（不传则没有删除按钮与删除键）/ `onRequestWallpaper`（不传则 header 没有那颗按钮）/
`onCrop`（不传则没有裁剪与设置按钮）。

- `storageScope` 必填：保存口径偏好记在 `<scope>:image-preview` 的 `cropSaveMode`，同一份弹窗挂到
  第二页时由那一页传自己的标识；
- `onCrop` 收 `(request: ImageCropRequest) => Promise<ImageCropResult>`：弹窗只产 data URL 与
  `mode`，写盘、刷新目录、决定怎么重取画面都归调用方（`useImagePreview` → `cropImage`）；
- `items` 的 `id` 用文件路径，与页面的删除、选中状态同一套标识；
- `src` 由页面用 `imageContentUrl` 拼（`/api/files/image?path=`），弹窗只负责显示；
- `activeId` 不在 `items` 里时组件整块不渲染（条目被删或换了目录）。

## 内部件

- `ImageStage/`：单图舞台（加载 / 失败态 + 放大 / 拖拽）。单独成组件是为了换图时用 `key` 一次
  重置加载态与倍率，不在弹窗里为这两件事各写一个 effect；手势收在同目录
  `hooks/use-image-zoom-pan/`，私有件，规格就写在它那份 README 里。
- `ImageListMenu/`：header 的「图片列表」按钮 + 点击弹层，开合状态由弹窗持有（弹层开着时
  header 要恒可见），条目排布走公共的 [`PreviewItemList`](../PreviewItemList/README.md)。
- `ImageHeaderActions/`：header 右侧那组图标（列表 / 墙纸 / 裁剪 / 设置），同时持有两层弹层的开合
  与互斥、裁剪入口、裁剪态的「取消 / 保存」。抽出来是为了让弹窗本体只编排舞台与键位，不因按钮与
  弹层开关撑破行数上限。墙纸排在裁剪左边；格式不支持的图，裁剪按钮禁用、tip 说明原因。
- `ImageCropOverlay/`：裁剪层（遮罩 + 选框 + 8 个手柄），Pointer Events + 指针捕获；
  几何纯函数（移动 / 改尺寸 / 最小尺寸）在同目录 `utils.ts`，按 `offsetLeft / offsetTop /
  offsetWidth / offsetHeight` 量图，避免 `transform` 把 `getBoundingClientRect` 算歪。
- `ImageCropSettings/`：保存口径弹层（`IconPopoverButton` + `FreePanelGroup` + 分段选择：
  替换源文件 / 另存新目录），只出 `mode`；两种落点的规则写在本 README 与
  `docs/local-repo-data.md`，面板里不再铺说明文字。
- `hooks/use-image-crop/`：裁剪会话状态（`active` / `rect` / `saving` / `supported` 与
  `start` / `cancel` / `setRect` / `save`），失败提示与「保存后通知页面」也在这里，规格见目录内 README。
- `utils.ts` / `constants.ts`：裁剪纯函数（比例 → 像素、canvas 重编码、扩展名 → MIME）与偏好键
  （`IMAGE_PREVIEW_CAPABILITY` / `CROP_MODE_FIELD` / 默认 `replace`）。
