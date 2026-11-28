/**
 * 程序坞里的视频预览窗：目录、当前段与封面都随快照一起存，恢复后照常播放与翻篇。
 *
 * 截图落盘、外部打开、删除与待拖拽动作依赖文件页运行期能力，
 * 页面还挂着时经 `PreviewDockActions` 注入；页面不在时对应按钮自然不出现。
 */

import { useState } from 'react';

import { usePreviewDockActions } from '@/components/modals/PreviewDockActions/hooks/usePreviewDockActions';
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
  const dockActions = usePreviewDockActions();
  const actions = dockActions?.video;

  return (
    <VideoPreviewModal
      activeId={activeId}
      batched={actions?.isBatched(activeId) ?? false}
      blocked={dockActions?.blocked ?? false}
      dockOrigin="dock"
      externalApp={actions?.externalApp}
      items={items}
      onCapture={actions?.onCapture}
      onClose={onRequestClose}
      onOpenExternal={actions?.onOpenExternal}
      onPickDir={actions?.onPickDir}
      onRequestDelete={actions?.onRequestDelete}
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

const VideoWindow = ({ entry, onRequestClose }: DockWindowProps) =>
  entry.kind === 'video-preview' ? (
    <VideoWindowBody entry={entry} onRequestClose={onRequestClose} />
  ) : null;

export default VideoWindow;
