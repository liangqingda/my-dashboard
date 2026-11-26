# TableNameCell

表格名称单元格：类型图标 + 名称；文件夹整块可点进入下一层，应用名称可点交给系统打开，视频 / 图片名称可点打开对应预览弹窗，其余文件只展示文字。

## 职责边界

- 图标回落口径与网格瓦片一致：应用走真实图标，取不到时回落通用图标。
- 名称省略走 `FreeTruncatedText`，不自己写 `text-overflow: ellipsis`。

## 坑

- 行内打开分流口径与 `DirectoryGrid` 的 `previewHandler` 对齐；新增可预览类型两边一起加。
- 加载中的文件夹名称后挂进度（`loading`），整行暂不可点。
