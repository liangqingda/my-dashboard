/**
 * 文件页四扇业务弹窗的入参：删除条目、推出外接盘、卸载应用、改名。
 * 状态与动作都由页面层的 hook 持有，这里只把弹窗按顺序摆好。
 */

import type { useAppUninstall } from '../hooks/useAppUninstall';
import type { useEntryActions } from '../hooks/useEntryActions';
import type { useEntryDelete } from '../hooks/useEntryDelete';
import type { useVolumeEject } from '../hooks/useVolumeEject';

/** 四扇弹窗的入参 */
export type FilesModalsProps = {
  /** 应用卸载：待卸载应用与残留报告 */
  appUninstall: ReturnType<typeof useAppUninstall>;
  /** 删除条目：待删除项与请求状态（页面只传弹窗要用的四个字段） */
  deleteState: Pick<
    ReturnType<typeof useEntryDelete>,
    'cancelDelete' | 'confirmDelete' | 'deleteLoading' | 'deletingEntry'
  >;
  /** 改名 / 新建文件夹：待改名条目与提交动作 */
  entryActions: ReturnType<typeof useEntryActions>;
  /** 推出外接盘：待确认卷与请求状态 */
  volumeEject: ReturnType<typeof useVolumeEject>;
};
