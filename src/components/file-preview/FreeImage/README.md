# FreeImage

全站唯一的**图片舞台**：把一张图按 `object-fit: contain` 居中装进容器，带加载 / 失败态，
并锁住捏合缩放（1–5 倍）与放大后的平移。它只管「显示」，不认识裁剪、列表、删除这些业务语义。

## 它锁了什么

- **舞台与画面**：根节点填满父容器（父级是 flex 分配或给显式高度），底色走
  `--free-image-backdrop`（默认 `#000`），放大后超出的部分裁在舞台里；
  图片 `max-width / max-height: 100%` + `contain`，`draggable={false}`、`user-select: none`。
- **加载与失败态**：图没读完前压暗（`opacity: 0`）避免半张图闪一下再撑开；读不出来给
  「这张图片无法显示」+ 图标，不留空白、不弹通知。`cloudPlaceholder` 为真时加载提示换成
  「正在从 iCloud 下载…」。
- **换图即复位**：调用方用 `key` 换实例，加载态与倍率一起归零；组件不为「换图要重置」写 effect。
- **缩放 / 平移**（`interactive`，默认可用）：捏合与 `Ctrl` + 滚轮改倍率、放大后两指滑动
  （滚轮同一条路径）平移；只认 `wheel` 一族事件，不做指针拖拽。通道、锚点与位移夹取的规则见
  `hooks/use-image-zoom-pan/README.md`。
- **叠加层只在就绪后挂**：`overlay` 在画面 `ready` 后调用，渲染在舞台内部、图片之后；
  回调里给图片的布局矩形（`box`），叠层按同一坐标系摆位，不必自己再判加载态、也不用量 DOM。
- **关掉缩放先复位**：`interactive={false}` 时先把倍率回 1、位移清零（layout 阶段完成），
  再调用 `overlay`——叠层拿到的盒子始终是未缩放的布局尺寸。裁剪就是靠这一档。

## props

见 `index.tsx` 的 `FreeImageProps`：

- `src` / `name`（alt 与失败提示都用它）/ `cloudPlaceholder`；
- `fill`：整屏用——图片盒子撑到舞台大小再 `contain`，像素比舞台小的图也放大贴住长边；
- `interactive`：缩放 / 平移开关；裁剪这类状态传 `false`；
- `overlay`：`(box) => ReactNode`，画面就绪后调用，`box` 是图片在舞台里的布局矩形（px）；
  不需要盒子就忽略参数。裁剪框、标记这类叠在画面上的层都从这里进来；
- `imageRef`：外部要拿同一张 `<img>` 做编码（裁剪保存）时传；不传组件自己持有；
- `onIntrinsicSize`：图片 `load` 报固有宽高，调用方按它收框。

## 不该放进来

- 裁剪选框、标记、对比条这类**编辑 / 业务叠加**：走 `overlay`，组件不 import 它们；
- 弹窗外壳、图片列表、删除 / 墙纸：属于 `ImagePreviewModal`；
- 瓦片缩略图（`FileTile`）与图标（`AppIcon`）：各自的 `cover` / 失败回落语义不同，不共用这一层。
