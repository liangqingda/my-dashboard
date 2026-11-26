# UninstallAppConfirm

应用卸载确认：先退应用，再删整包与用户数据 / 缓存 / 偏好设置等残留，均不可恢复。

## 职责边界

- 残留清单在打开时现取（`useAppUninstall`）；取到之前确认按钮不可点。清单逐条列出（标签 + 绝对路径），让用户看得到「卸载干净」到底删哪些位置，而不是一句笼统承诺。
- 基于 `ConfirmModal` 壳；`loadingReport` / `report` / `reportError` / `uninstalling` 都来自 hook，本层只拼清单与禁用态。

## 坑

- 取残留失败（`reportError`）时确认按钮禁用并展示原因，别允许在没看清残留时卸载。
- 部分残留删不掉的结果文案由 hook 收口，本层不预判成功 / 失败。
