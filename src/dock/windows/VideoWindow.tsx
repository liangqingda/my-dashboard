/**
 * 程序坞里的视频预览窗：快照只带这一组视频的路径，名称、播放地址与封面在窗口里按路径补，
 * 恢复后照常播放与翻篇。
 *
 * 页面还挂着时优先用页面登记的回调，保留页面对待拖拽区的真实状态；
 * 页面不在时由窗口自己的后备能力接管截图、选目录、删除与待拖拽。
 * 外部打开始终有接口兜底（应用名随快照存），所以换页后仍能直接交给本地播放器。
 */

import { useMemo, useState } from 'react';

import { usePreviewDockActions } from '@/components/modals/PreviewDockActions/hooks/usePreviewDockActions';
import VideoPreviewModal from '@/components/modals/VideoPreviewModal';

import DeleteEntryConfirm from '@/pages/Files/DeleteEntryConfirm';

import type { DockEntry, DockWindowProps } from '../types';
import { toDockVideoItems } from '../utils/dock-media';

import { useDockVideoActions } from './hooks/useDockVideoActions';
import { useReportWindowReady } from './hooks/useReportWindowReady';

/** 收窄到视频条目：kind 判别后快照才是这一份 */
type VideoEntry = Extract<DockEntry, { kind: 'video-preview' }>;

const VideoWindowBody = ({
  entry,
  onRequestClose,
}: {
  entry: VideoEntry;
  onRequestClose: () => void;
}) => {
  const {
    activeId: initialId,
    items: snapshotItems,
    storageScope,
  } = entry.snapshot;

  /* 快照自带媒体项，首帧即就位：开窗动画不等取数 */
  useReportWindowReady({});

  const initialItems = useMemo(
    () => toDockVideoItems(snapshotItems),
    [snapshotItems],
  );
  const [activeId, setActiveId] = useState(initialId);
  const [switchTick, setSwitchTick] = useState(0);
  const dockActions = usePreviewDockActions();
  const pageActions = dockActions?.video;
  const externalApp = pageActions?.externalApp ?? entry.snapshot.externalApp;
  const fallback = useDockVideoActions({
    activeId,
    externalApp,
    initialItems,
    onRequestClose,
    setActiveId,
    setSwitchTick,
  });
  const blocked =
    dockActions?.blocked === true || fallback.deleteConfirmOpen;

  return (
    <>
      <VideoPreviewModal
        activeId={activeId}
        batched={pageActions?.isBatched(activeId) ?? fallback.isBatched(activeId)}
        blocked={blocked}
        dockId={entry.id}
        dockOrigin="dock"
        externalApp={externalApp}
        items={fallback.items}
        onCapture={pageActions?.onCapture ?? fallback.onCapture}
        onClose={onRequestClose}
        onOpenExternal={pageActions?.onOpenExternal ?? fallback.onOpenExternal}
        onPickDir={pageActions?.onPickDir ?? fallback.onPickDir}
        onRequestDelete={pageActions?.onRequestDelete ?? fallback.onRequestDelete}
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
    </>
  );
};

const VideoWindow = ({ entry, onRequestClose }: DockWindowProps) =>
  entry.kind === 'video-preview' ? (
    <VideoWindowBody entry={entry} onRequestClose={onRequestClose} />
  ) : null;

export default VideoWindow;
