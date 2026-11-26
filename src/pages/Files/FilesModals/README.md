# FilesModals

文件页业务弹窗层：删除 / 推出外接盘（含被占用时的第二次确认）/ 卸载应用 / 改名 / 设为桌面墙纸，外加拖拽移动弹窗。

## 职责边界

- 只把页面层 hook 的状态接到对应弹窗上；弹窗顺序与互斥由页面保证（预览层会锁删除与墙纸确认）。
- 拖拽移动弹窗跟着拖拽开合，不是用户点出来的；其余确认弹窗由各自 hook 的请求态驱动。

## 弹窗清单

| 弹窗 | 状态来源 |
| --- | --- |
| `DeleteEntryConfirm` | `useEntryDelete` |
| `UninstallAppConfirm` | `useAppUninstall` |
| `EjectVolumeConfirm` / `VolumeBusyConfirm` | `useVolumeEject` |
| `RenameEntryModal` | `useEntryActions` 的 `renamingEntry` |
| `WallpaperConfirm` | `useWallpaper` |
| `DragMoveModal` | `useDragMove` 会话 |

## 坑

- 新增确认弹窗先在对应 hook 里收口请求态与文案，本层只接线；别把业务判定写进弹窗拼装处。
- 弹窗互斥 / 锁态口径在页面与预览层，本层不自己判断能不能开。
