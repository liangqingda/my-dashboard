import FilesModals from '../FilesModals';
import FilesPreviewLayers from '../FilesPreviewLayers';
import { favoriteTargetOf } from '../utils/files';

import type { FilesOverlaysProps } from './types';

import styles from './index.scss';

/**
 * 文件页的两层浮层：业务弹窗与预览层，按层级摆好（弹窗在下、预览在上）。
 *
 * 拖拽层不在这里：它的待拖拽区全屏时就是内容区左侧的一列，得跟列表一起排在内容区那一行里
 * （见 `FilesDragLayers`）；跟随指针的影像与飞行动画是 `fixed`，挂在那儿不影响排布。
 *
 * 只做摆放与拼装：状态与动作仍由页面层的 hook 持有，这里不新增任何状态；
 * 把「扁平 props 一个个传下去」收在这一层，页面正文才只剩列表本身。
 */
const FilesOverlays = ({ modals, preview }: FilesOverlaysProps) => {
  const { deleteEntry, favorites, entryActions, wallpaper, ...modalRest } = modals;
  const { image, video, videoApp, ...previewRest } = preview;

  return (
    <div className={styles.layers}>
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
        externalApp={videoApp}
        imageActiveId={image.activeId}
        imageItems={image.items}
        imageStaged={previewRest.imageStaged}
        imageSwitchTick={image.switchTick}
        onCaptureVideo={video.captureFrame}
        onCloseImage={image.closeImage}
        onCloseVideo={video.closeVideo}
        onCropImage={image.cropImage}
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
        onToggleImage={previewRest.onToggleImage}
        onToggleVideo={previewRest.onToggleVideo}
        videoActiveId={video.activeId}
        videoItems={video.items}
        videoStaged={previewRest.videoStaged}
        videoSwitchTick={video.switchTick}
      />
    </div>
  );
};

export default FilesOverlays;
