# DeleteEntryConfirm

删除条目二次确认：文件夹连同内部全部内容一起递归删除，文件直接删除，均不可恢复，先问一句再动手。

## 职责边界

- 基于 `ConfirmModal` 壳；条目名 / 直属条目数由 `useEntryDelete` 的 `deletingEntry` 给，本层只拼确认文案。
- 确认动作交回 `confirmDelete`，取消走 `cancelDelete`；删除请求态 `deleteLoading` 控制按钮转圈禁用。

## 坑

- 递归删除不可恢复，文案必须写清「文件夹连同内部全部内容」，别简化成「删除文件夹」。
- 失败提示由 hook 弹全局通知，本层不重复报错。
