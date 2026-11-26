# LandedTiles

拖拽移动弹窗里，**本次会话搬进当前这一层**的那些条目：进到那个文件夹就能看见它们。

- 呈现与目录页一致：文件用 `FileTile`（视频帧 / 缩略图、文件名、体积），文件夹用 `FolderTile`；
- 每格盖一块透明按钮接住点击：**点一下把这一条放回手卡**（`onReturn`），调用方据此播回流动画；
- 瓦片自己的 dragstart 被这块按钮盖住，这一条已经搬完了，不再作为拖拽源；
- 顶上一行说明（「本次移入 N 项 · 点一下放回待拖拽区」）把它和下面的文件夹网格分开；
- 只负责摆，取回与动画都在外面：`useDragMove.restoreLanded` + `hooks/useReturnFly.ts`（`ReturnFly`）。
