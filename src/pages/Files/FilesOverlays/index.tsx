import FilesDragLayers from '../FilesDragLayers';
import FilesModals from '../FilesModals';
import FilesPreviewLayers from '../FilesPreviewLayers';
import { favoriteTargetOf } from '../utils/files';

import type { FilesOverlaysProps } from './types';

import styles from './index.scss';

/**
 * 文件页的三层浮层：拖拽层（待拖拽区 / 拖拽影像 / 飞入动画）、业务弹窗、预览层，按层级摆好。
 *
 * 只做摆放与拼装：状态与动作仍由页面层的 hook 持有，这里不新增任何状态；
 * 把「扁平 props 一个个传下去」收在这一层，页面正文才只剩列表本身。
 */
const FilesOverlays = ({ drag, modals, preview }: FilesOverlaysProps) => {
  const { deleteEntry, favorites, entryActions, wallpaper, ...modalRest } = modals;
  const { image, video, ...previewRest } = preview;

  return (
    <div className={styles.layers}>
      <FilesDragLayers
        dragAllDisabled={drag.dragAllDisabled}
        dragEntries={drag.dragEntries}
        dragImage={drag.dragImage}
        entryActions={drag.entryActions}
        onDragAll={drag.onDragAll}
        onDropPaths={drag.onDropPaths}
        onSelectAll={drag.onSelectAll}
        onTrayDragEnd={drag.onTrayDragEnd}
        pending={drag.pending}
      />

      <FilesModals
        appUninstall={modalRest.appUninstall}
        deleteState={{
          cancelDelete: deleteEntry.cancelDelete,
          confirmDelete: deleteEntry.confirmDelete,
          deleteLoading: deleteEntry.deleteLoading,
          deletingEntry: deleteEntry.deletingEntry,
        }}
        entryActions={entryActions}
        favorites={{
          entries: favorites.favorites,
          isFavorite: favorites.isFavorite,
          onMove: favorites.moveFavorite,
          onRemove: favorites.removeFavorite,
          onToggleFavorite: (path) => favorites.toggleFavorite(favoriteTargetOf(path)),
          onTogglePinned: favorites.togglePinnedFavorite,
        }}
        onCreateFolder={modalRest.onCreateFolder}
        onPickDir={modalRest.onPickDir}
        onPreviewImage={modalRest.onPreviewImage}
        onPreviewVideo={modalRest.onPreviewVideo}
        volumeEject={modalRest.volumeEject}
        wallpaper={wallpaper}
      />

      <FilesPreviewLayers
        blocked={previewRest.blocked || wallpaper.request !== null}
        defaultFullscreen={previewRest.defaultFullscreen}
        imageActiveId={image.activeId}
        imageItems={image.items}
        onCaptureVideo={video.captureFrame}
        onCloseImage={image.closeImage}
        onCloseVideo={video.closeVideo}
        onOpenExternal={video.openExternal}
        onPickDir={video.pickMediaDir}
        onRequestDelete={previewRest.onRequestDelete}
        onRequestWallpaper={() => {
          const active = image.activeItem;

          if (active !== null) {
            wallpaper.requestWallpaper({ name: active.name, path: active.id });
          }
        }}
        onSelectImage={image.selectImage}
        onSelectVideo={video.selectVideo}
        videoActiveId={video.activeId}
        videoItems={video.items}
      />
    </div>
  );
};

export default FilesOverlays;
