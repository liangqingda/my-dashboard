/**
 * 程序坞里的视频预览窗：目录、当前段与封面都随快照一起存，恢复后照常播放与翻篇。
 *
 * 页面还挂着时优先用页面登记的回调，保留页面对待拖拽区的真实状态；
 * 页面不在时由窗口自己的后备能力接管截图、选目录、删除与待拖拽。
 * 外部打开始终有接口兜底（应用名随快照存），所以换页后仍能直接交给本地播放器。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import { usePreviewDockActions } from '@/components/modals/PreviewDockActions/hooks/usePreviewDockActions';
import VideoPreviewModal from '@/components/modals/VideoPreviewModal';
import { getErrorMessage } from '@/utils/error';
import { openFileExternally } from '@/utils/open-file';

import DeleteEntryConfirm from '@/pages/Files/DeleteEntryConfirm';

import type { DockEntry, DockWindowProps } from '../types';

import { useDockVideoActions } from './hooks/useDockVideoActions';

/** 收窄到视频条目：kind 判别后快照才是这一份 */
type VideoEntry = Extract<DockEntry, { kind: 'video-preview' }>;

const VideoWindowBody = ({
  entry,
  onRequestClose,
}: {
  entry: VideoEntry;
  onRequestClose: () => void;
}) => {
  const { activeId: initialId, items: initialItems, storageScope } = entry.snapshot;
  const [activeId, setActiveId] = useState(initialId);
  const [switchTick, setSwitchTick] = useState(0);
  const dockActions = usePreviewDockActions();
  const pageActions = dockActions?.video;
  const fallback = useDockVideoActions({
    activeId,
    initialItems,
    onRequestClose,
    setActiveId,
    setSwitchTick,
  });
  const externalApp = pageActions?.externalApp ?? entry.snapshot.externalApp;
  const openExternal =
    pageActions?.onOpenExternal ??
    ((id: string) => {
      void openFileExternally(id, externalApp).catch((error: unknown) => {
        notifications.show({
          color: 'red',
          message: getErrorMessage(error, '外部打开失败'),
        });
      });
    });
  const blocked =
    dockActions?.blocked === true || fallback.deleteConfirmOpen;

  return (
    <>
      <VideoPreviewModal
        activeId={activeId}
        batched={pageActions?.isBatched(activeId) ?? fallback.isBatched(activeId)}
        blocked={blocked}
        dockOrigin="dock"
        externalApp={externalApp}
        items={fallback.items}
        onCapture={pageActions?.onCapture ?? fallback.onCapture}
        onClose={onRequestClose}
        onOpenExternal={openExternal}
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
