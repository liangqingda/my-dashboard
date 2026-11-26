# FilesActions

文件页标题栏操作按钮组：「新建文件夹」「打开本地目录」图标按钮，收藏 / 筛选 / 设置弹层按钮，外加推出外接盘入口。

## 职责边界

- 三块弹层（收藏 `FavoritesPanel` / 筛选 `TypeFilterPanel` / 设置 `SettingsPanel`）互斥，同时只开一块；开合状态由页面层持有，这里只排按钮与弹层内容。
- 视图形态（网格 / 表格）切换入口收在设置面板外观组里，不在标题栏放按钮。
- 本层只读值、只回调；持久化在页面设置 hook 里，不在组件内读写 `localStorage`。

## Props 分层

- 取数 / 禁用态：`loading`、`createDisabled`、`favoriteDisabled`、`picking`、`ejecting`。
- 收藏：`favorites`、`isFavorite`、`onOpenFavorite`、`onToggleFavorite`、`onMoveFavorite`、`onRemoveFavorite`、`onTogglePinnedFavorite`。
- 筛选：`keyword`、`onKeywordChange`、`selectedCategories`、`onSelectedCategoriesChange`、`typeFilterMode`、`onTypeFilterModeChange`。
- 动作：`onCreateFolder`、`onPickDir`、`onEject`、`onViewModeChange`、`onPanelChange`。
- 设置整组：`settings`（透传给 `SettingsPanel`）。

## 坑

- 新增弹层按钮先确认是不是属于标题栏这一排；纯展示字段别再往这一层堆 props，能在子面板内部收口的不下钻。
- 弹层互斥状态在页面层：这里不自己记开关，避免开合口径与页面其它入口（快捷键、右键）漂移。
