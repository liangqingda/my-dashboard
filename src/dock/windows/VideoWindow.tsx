/**
 * 程序坞里的视频预览窗：目录、当前段与封面都随快照一起存，恢复后照常播放与翻篇。
 *
 * 截图要把帧交给页面落盘、外部打开要知道文件在哪，这两样都不在快照里，
 * 所以恢复窗口不传 `onCapture` / `onOpenExternal`，对应的按钮也不出现。
 */

import { useState } from 'react';

import VideoPreviewModal from '@/components/modals/VideoPreviewModal';

import type { DockEntry, DockWindowProps } from '../types';

/** 收窄到视频条目：kind 判别后快照才是这一份 */
type VideoEntry = Extract<DockEntry, { kind: 'video-preview' }>;

const VideoWindowBody = ({
  entry,
  onRequestClose,
}: {
  entry: VideoEntry;
  onRequestClose: () => void;
}) => {
  const { activeId: initialId, items, storageScope } = entry.snapshot;
  const [activeId, setActiveId] = useState(initialId);
  const [switchTick, setSwitchTick] = useState(0);

  return (
    <VideoPreviewModal
      activeId={activeId}
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

const VideoWindow = ({ entry, onRequestClose }: DockWindowProps) =>
  entry.kind === 'video-preview' ? (
    <VideoWindowBody entry={entry} onRequestClose={onRequestClose} />
  ) : null;

export default VideoWindow;
