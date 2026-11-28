/**
 * 视频坞窗的后备能力：页面卸载后仍能截图、选目录、删除与待拖拽。
 *
 * 页面还在时窗口优先用页面登记的回调；这份 hook 只在页面不在时接管。
 * 截图与目录选择直接走文件 API，删除确认层由窗口渲染。
 */

import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';

import type {
  VideoPreviewCaptureReceipt,
  VideoPreviewItem,
} from '@/components/modals/VideoPreviewModal/types';
import { useMounted } from '@/hooks/useMounted';
import { getErrorMessage } from '@/utils/error';

import type { DeletingEntry } from '@/pages/Files/hooks/useEntryDelete';
import {
  captureVideoFrame,
  deleteEntry,
  pickPickedDir,
} from '@/pages/Files/utils/files-api';

/** 待确认删除的视频 */
type PendingVideoDelete = {
  /** 确认层要用的人话条目 */
  entry: DeletingEntry;
  /** 视频绝对路径 */
  path: string;
};

/** 后备能力入参 */
type Params = {
  /** 快照里的整组视频 */
  initialItems: readonly VideoPreviewItem[];
  /** 删除最后一条后要关掉窗口 */
  onRequestClose: () => void;
  /** 当前条目，删除后要顺位切到下一段 */
  activeId: string;
  /** 切到另一段 */
  setActiveId: (id: string) => void;
  /** 切换序号：删除后顺位切换也要让计数浮标重新出现 */
  setSwitchTick: (updater: (tick: number) => number) => void;
};

/**
 * 视频坞窗自己完成的一套操作；页面不在时由窗口使用。
 *
 * @returns 删除后的视频列表、四类动作与删除确认弹窗状态
 */
export const useDockVideoActions = ({
  activeId,
  initialItems,
  onRequestClose,
  setActiveId,
  setSwitchTick,
}: Params) => {
  const mounted = useMounted();
  const [items, setItems] = useState(() => initialItems.map((item) => ({ ...item })));
  /** 页面不在时，待拖拽区只在本窗口内攒；页面回来后再由页面状态接管 */
  const [batchedIds, setBatchedIds] = useState<readonly string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PendingVideoDelete | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /** 中间件写盘后回文件名；目标目录为空时对应桌面 */
  const onCapture = useCallback(
    async (
      dataUrl: string,
      captureDir: string,
    ): Promise<VideoPreviewCaptureReceipt> => {
      const name = await captureVideoFrame(dataUrl, captureDir);
      const target = captureDir.length > 0 ? captureDir : '桌面';

      return { message: `已保存到${target}：${name}` };
    },
    [],
  );

  /** 选截图目录：快照里第一条所在目录作为默认定位；取消返回 null */
  const onPickDir = useCallback(async (): Promise<string | null> => {
    const [first] = items;
    const slash = first.id.lastIndexOf('/');
    const defaultDir = slash > 0 ? first.id.slice(0, slash) : null;
    const picked = await pickPickedDir(defaultDir);

    return 'path' in picked ? picked.path : null;
  }, [items]);

  const onRequestDelete = useCallback(
    (id: string) => {
      const item = items.find((candidate) => candidate.id === id);

      if (!item) {
        return;
      }

      setPendingDelete({
        entry: { kind: 'file', name: item.name },
        path: item.id,
      });
    },
    [items],
  );

  const cancelDelete = () => {
    if (!deleteLoading) {
      setPendingDelete(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleteLoading) {
      return;
    }

    setDeleteLoading(true);

    try {
      await deleteEntry(pendingDelete.path);

      if (!mounted.current) {
        return;
      }

      const removedIndex = items.findIndex(
        (item) => item.id === pendingDelete.path,
      );
      const nextItems = items.filter((item) => item.id !== pendingDelete.path);

      setItems(nextItems);

      if (nextItems.length === 0) {
        setPendingDelete(null);
        onRequestClose();

        return;
      }

      if (activeId === pendingDelete.path) {
        const next = nextItems[Math.min(removedIndex, nextItems.length - 1)];

        setActiveId(next.id);
        setSwitchTick((tick) => tick + 1);
      }

      setPendingDelete(null);
      notifications.show({
        title: '已删除',
        message: '文件已删除',
        color: 'teal',
        autoClose: 4000,
      });
    } catch (error: unknown) {
      if (!mounted.current) {
        return;
      }

      notifications.show({
        title: '删除失败',
        message: getErrorMessage(error, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      if (mounted.current) {
        setDeleteLoading(false);
      }
    }
  };

  const onToggleBatch = useCallback((id: string) => {
    setBatchedIds((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id],
    );
  }, []);

  const isBatched = useCallback(
    (id: string) => batchedIds.includes(id),
    [batchedIds],
  );

  return {
    cancelDelete,
    confirmDelete,
    deleteConfirmOpen: pendingDelete !== null,
    deleteEntry: pendingDelete?.entry ?? null,
    deleteLoading,
    isBatched,
    items,
    onCapture,
    onPickDir,
    onRequestDelete,
    onToggleBatch,
  };
};
