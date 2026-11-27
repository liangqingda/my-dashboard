# AppearanceGroup

设置面板「外观」组：视图形态、分组展示、瓦片最小宽度（仅网格形态）、悬浮玻璃透明度。

## 职责边界

- 只读设置值、只回调，持久化在 `useFilesSettings`；字段外壳走 `FreePanelGroup` / `FreePanelField`。
- 「瓦片最小宽度」的可调区间与步长取 `constants.ts` 的 `TILE_MIN_WIDTH_*`，默认值与持久化编解码也以那里为准；组件不另存一份范围。
- 表格视图不渲染「瓦片最小宽度」：那里没有瓦片，改了看不到效果。

## 坑

- 滑块不挂气泡（`label={null}`），当前值只放在字段标题行，拖动时不挡手。
