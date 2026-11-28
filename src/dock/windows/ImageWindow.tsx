/**
 * 程序坞里的图片预览窗：整个目录随快照一起存，恢复后仍可翻篇、看计数、切全屏。
 *
 * 裁剪与删除依赖页面落盘能力，恢复窗口里不提供（header 那颗按钮自然不出现）；
 * 当前张与切换序号是本窗口自己的状态，切图不会改快照。
 */

import { useState } from 'react';

import ImagePreviewModal from '@/components/modals/ImagePreviewModal';

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

  return (
    <ImagePreviewModal
      activeId={activeId}
      dockId={entry.id}
      dockOrigin="dock"
      items={items}
      onClose={onRequestClose}
      onSelect={(id) => {
        setActiveId(id);
        setSwitchTick((tick) => tick + 1);
      }}
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
