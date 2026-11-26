# VolumeBusyConfirm

推出外接盘的第二次确认：盘还被进程占着，列出占用清单，用户同意后结束清单里能结束的进程再重试。

## 职责边界

- 基于 `ConfirmModal` 壳；`holders` / `holdersKnown` / `message` 来自 `useVolumeEject` 的 `busy` 态。
- 系统进程与别的用户起的进程只列出来、不做动作；可结束的进程带 `canKill` 标记，由 hook 过滤出 pid 清单重试。

## 坑

- 占用清单枚举失败（`holdersKnown === false`）时如实展示「没能列出具体是谁」，别编进程名。
- 第二次确认仍可能再被占用；重试失败的原因由 hook 收口，本层不循环重试。
