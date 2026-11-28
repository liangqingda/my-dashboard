/**
 * 程序坞里的图片预览窗：整个目录随快照一起存，恢复后仍可翻篇、看计数、切全屏。
 *
 * 裁剪、删除、墙纸与待拖拽依赖文件页运行期能力，页面还挂着时经
 * `PreviewDockActions` 注入；页面不在时对应按钮自然不出现。
 * 当前张与切换序号是本窗口自己的状态，切图不会改快照。
 */

import { useState } from 'react';

import ImagePreviewModal from '@/components/modals/ImagePreviewModal';
import { usePreviewDockActions } from '@/components/modals/PreviewDockActions/hooks/usePreviewDockActions';

import type { DockEntry, DockWindowProps } from '../types';

/** 收窄到图片条目：kind 判别后快照才是这一份 */
type ImageEntry = Extract<DockEntry, { kind: 'image-preview' }>;

const ImageWindowBody = ({
  entry,
  onRequestClose,
}: {
  entry: ImageEntry;
  onRequestClose: () => void;
}) => {
  const { activeId: initialId, items, storageScope } = entry.snapshot;
  const [activeId, setActiveId] = useState(initialId);
  const [switchTick, setSwitchTick] = useState(0);
  const dockActions = usePreviewDockActions();
  const actions = dockActions?.image;

  return (
    <ImagePreviewModal
      activeId={activeId}
      batched={actions?.isBatched(activeId) ?? false}
      blocked={dockActions?.blocked ?? false}
      dockOrigin="dock"
      items={items}
      onClose={onRequestClose}
      onCrop={actions?.onCrop}
      onRequestDelete={actions?.onRequestDelete}
      onRequestWallpaper={actions?.onRequestWallpaper}
      onSelect={(id) => {
        setActiveId(id);
        setSwitchTick((tick) => tick + 1);
      }}
      onToggleBatch={actions?.onToggleBatch}
      opened
      storageScope={storageScope}
      switchTick={switchTick}
    />
  );
};

const ImageWindow = ({ entry, onRequestClose }: DockWindowProps) =>
  entry.kind === 'image-preview' ? (
    <ImageWindowBody entry={entry} onRequestClose={onRequestClose} />
  ) : null;

export default ImageWindow;
