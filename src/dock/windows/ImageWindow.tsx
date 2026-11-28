/**
 * 程序坞里的图片预览窗：整个目录随快照一起存，恢复后仍可翻篇、看计数、切全屏。
 *
 * 页面还挂着时优先用页面登记的 `PreviewDockActions`，保留页面对待拖拽区的真实状态；
 * 页面不在时由窗口自己的后备能力接管裁剪、删除、墙纸与待拖拽，header 不会因为换页少按钮。
 * 当前张与切换序号是本窗口自己的状态，切图不会改快照。
 */

import { useState } from 'react';

import ImagePreviewModal from '@/components/modals/ImagePreviewModal';
import { usePreviewDockActions } from '@/components/modals/PreviewDockActions/hooks/usePreviewDockActions';

import DeleteEntryConfirm from '@/pages/Files/DeleteEntryConfirm';
import WallpaperConfirm from '@/pages/Files/WallpaperConfirm';

import type { DockEntry, DockWindowProps } from '../types';

import { useDockImageActions } from './hooks/useDockImageActions';

/** 收窄到图片条目：kind 判别后快照才是这一份 */
type ImageEntry = Extract<DockEntry, { kind: 'image-preview' }>;

const ImageWindowBody = ({
  entry,
  onRequestClose,
}: {
  entry: ImageEntry;
  onRequestClose: () => void;
}) => {
  const { activeId: initialId, items: initialItems, storageScope } = entry.snapshot;
  const [activeId, setActiveId] = useState(initialId);
  const [switchTick, setSwitchTick] = useState(0);
  const dockActions = usePreviewDockActions();
  const pageActions = dockActions?.image;
  const fallback = useDockImageActions({
    activeId,
    initialItems,
    onRequestClose,
    setActiveId,
    setSwitchTick,
  });
  const blocked =
    dockActions?.blocked === true ||
    fallback.deleteConfirmOpen ||
    fallback.wallpaperConfirmOpen;

  return (
    <>
      <ImagePreviewModal
        activeId={activeId}
        batched={pageActions?.isBatched(activeId) ?? fallback.isBatched(activeId)}
        blocked={blocked}
        dockOrigin="dock"
        items={fallback.displayItems}
        onClose={onRequestClose}
        onCrop={pageActions?.onCrop ?? fallback.onCrop}
        onRequestDelete={pageActions?.onRequestDelete ?? fallback.onRequestDelete}
        onRequestWallpaper={
          pageActions?.onRequestWallpaper ?? fallback.onRequestWallpaper
        }
        onSelect={(id) => {
          setActiveId(id);
          setSwitchTick((tick) => tick + 1);
        }}
        onToggleBatch={pageActions?.onToggleBatch ?? fallback.onToggleBatch}
        opened
        storageScope={storageScope}
        switchTick={switchTick}
      />
      <DeleteEntryConfirm
        entry={fallback.deleteEntry}
        loading={fallback.deleteLoading}
        onCancel={fallback.cancelDelete}
        onConfirm={() => void fallback.confirmDelete()}
      />
      <WallpaperConfirm
        loading={fallback.wallpaperLoading}
        onCancel={fallback.cancelWallpaper}
        onConfirm={() => void fallback.confirmWallpaper()}
        request={fallback.wallpaperRequest}
      />
    </>
  );
};

const ImageWindow = ({ entry, onRequestClose }: DockWindowProps) =>
  entry.kind === 'image-preview' ? (
    <ImageWindowBody entry={entry} onRequestClose={onRequestClose} />
  ) : null;

export default ImageWindow;
