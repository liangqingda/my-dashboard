import DeleteEntryConfirm from '../DeleteEntryConfirm';
import EjectVolumeConfirm from '../EjectVolumeConfirm';
import RenameEntryModal from '../RenameEntryModal';
import UninstallAppConfirm from '../UninstallAppConfirm';

import type { FilesModalsProps } from './types';

/**
 * 文件页的业务弹窗层：删除 / 推出外接盘 / 卸载应用 / 改名。
 * 只负责把页面层 hook 的状态接到对应弹窗上，顺序与互斥由页面（预览层会锁删除）保证。
 */
const FilesModals = ({
  appUninstall,
  deleteState,
  entryActions,
  volumeEject,
}: FilesModalsProps) => (
  <>
    <DeleteEntryConfirm
      entry={deleteState.deletingEntry}
      loading={deleteState.deleteLoading}
      onCancel={deleteState.cancelDelete}
      onConfirm={() => void deleteState.confirmDelete()}
    />

    <EjectVolumeConfirm
      loading={volumeEject.ejecting}
      onCancel={volumeEject.cancel}
      onConfirm={() => void volumeEject.confirm()}
      volume={volumeEject.target}
    />

    <UninstallAppConfirm
      app={appUninstall.app}
      loadingReport={appUninstall.loadingReport}
      onCancel={appUninstall.cancel}
      onConfirm={() => void appUninstall.confirm()}
      report={appUninstall.report}
      reportError={appUninstall.reportError}
      uninstalling={appUninstall.uninstalling}
    />

    <RenameEntryModal
      entry={entryActions.renamingEntry}
      key={entryActions.renamingEntry?.path ?? 'none'}
      loading={entryActions.renameLoading}
      onCancel={entryActions.closeRename}
      onCommit={(name) => {
        if (entryActions.renamingEntry !== null) {
          void entryActions.renameCommit(entryActions.renamingEntry.path, name);
        }
      }}
    />
  </>
);

export default FilesModals;
