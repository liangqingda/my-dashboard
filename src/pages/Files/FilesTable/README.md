# FilesTable

目录**表格视图**：一行一个条目，三列「名称 / 类别 / 操作」，文件夹在前、应用其次、文件在后。

## 职责边界

- 表格外观（边框、表头吸顶、行 hover）由 `FreeTable` 统一给，这里只管列宽与单元格内容。
- 行可拖拽（应用除外，移动 `.app` 会破坏系统登记）；文件夹行是放置目标。重命名 / 删除走与瓦片同一组按钮，应用只有卸载一项。
- 分组模式按「文件夹 → 应用 → 文件分类」切段，段标题整行可点折叠；行内垂直居中、水平靠左。

## 数据与事件口径

- `rows` 是筛好的合并行（`toFilesRows` 产出），顺序文件夹 → 应用 → 文件；网格视图吃的是三类数组，这里不收。
- 类别列：文件夹 / 应用沿用类型名，文件落到细分分类（`categoryLabel`）。
- 落点与多选口径与网格一致：`onDropFolder` / `onDropBlank`、`onTogglePending` / `onSelectRange`；两套视图共用同一份 `selectOrder`。

## 坑

- 表格行不照抄整行做拖拽影像（`position: absolute` 对 `<tr>` 不生效），行对象走 `cloneFlightBody` 造块壳；细节见 `PendingFly`。
- 传给行 / 单元格的回调若每次新建，memo 会被击穿；hook 层返回值用 `useCallback`，派生数组用 `useMemo`。
