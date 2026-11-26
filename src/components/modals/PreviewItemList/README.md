# PreviewItemList

媒体预览的**条目列表**：弹层里那一列条目，视频选集弹层与图片列表弹层共用。它不是 `FreeXxx`
（不构成某类对象的唯一形态）：锁的是「弹层里一列可点条目」的排布与交互，弹层外壳与开合归各自的按钮。

## 它锁了什么

- 结构：一列条目，容器到顶自己在弹层内部滚动（`min(320px, 60dvh)`），条目再多也不把弹层顶出弹窗；
  条目之间 2px，条目自带 `7px 10px` 行内留白，所以弹层壳的内边距收到 6px（`IconPopoverButton` 的 `padding`）；
- 条目：整行可点，名字单行、中间省略（`FreeTruncatedText`，太长也不把行撑破）；
  当前一条用 `aria-current` + 选中底色标出，悬停有行底。

## 它不管什么

- 列表从哪来、怎么排序：调用方按当前目录筛好，顺序即翻篇顺序；
- 条目类型与图标：这里只排名字，不判断文件分类，也不放类型图标；
- 点完要不要合上弹层：`onSelect` 只回传 id，开合归弹层壳（选集 / 图片列表各自处理）。

## props

| prop | 说明 |
| --- | --- |
| `items` | `{ id, name }` 列表，顺序即翻篇顺序 |
| `activeId` | 当前预览中的条目 id，用来高亮 |
| `onSelect` | 点选某一条（只回传 id） |
| `tipDark` | 名字省略后的提示固定深底浅字：弹层压在媒体画面上时传 |

## 现有用法

- `VideoPreviewModal/VideoEpisodeMenu`：控制栏「选集」的点击弹层；
- `ImagePreviewModal/ImageListMenu`：header「图片列表」的点击弹层。
