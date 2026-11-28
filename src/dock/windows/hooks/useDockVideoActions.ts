/**
 * 视频坞窗的后备能力：页面卸载后仍能截图、选目录、删除、外部打开与待拖拽。
 *
 * 页面还在时窗口优先用页面登记的回调；这份 hook 只在页面不在时接管。
 * 截图 / 选目录 / 外部打开 / 删除都直接用文件页同一套 `useVideoCapture`、`useOpenExternal`、
 * `useEntryDelete`，这里只补一份「快照列表」与其本地刷新。
 */

import { useCallback, useMemo, useState } from 'react';

import type {
  VideoPreviewItem,
} from '@/components/modals/VideoPreviewModal/types';

import { useEntryDelete } from '@/pages/Files/hooks/useEntryDelete';
import { useOpenExternal } from '@/pages/Files/hooks/useOpenExternal';
import { useVideoCapture } from '@/pages/Files/hooks/useVideoCapture';

/** 后备能力入参 */
type Params = {
  /** 坞窗按快照路径补出来的整组视频 */
  initialItems: readonly VideoPreviewItem[];
  /** 外部打开用的应用名；跟页面设置或快照走 */
  externalApp?: string;
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
  externalApp,
  initialItems,
  onRequestClose,
  setActiveId,
  setSwitchTick,
}: Params) => {
  const [items, setItems] = useState(() => initialItems.map((item) => ({ ...item })));
  /** 页面不在时，待拖拽区只在本窗口内攒；页面回来后再由页面状态接管 */
  const [batchedIds, setBatchedIds] = useState<readonly string[]>([]);
  /** 截图目录的默认定位：当前快照第一条所在目录 */
  const defaultDir = useMemo(() => {
    const [first] = items;
    const slash = first.id.lastIndexOf('/');

    return slash > 0 ? first.id.slice(0, slash) : null;
  }, [items]);
  /** 截图 / 选目录和文件页共用同一份动作 */
  const { captureFrame, pickMediaDir } = useVideoCapture({ defaultDir });
  /** 外部打开和文件页共用同一份动作 */
  const openExternal = useOpenExternal();
  const onOpenExternal = useCallback(
    (id: string) => {
      openExternal(id, externalApp);
    },
    [externalApp, openExternal],
  );
  /** 删除确认与提示复用文件页的删除编排，只把「路径从哪份列表解析」换成快照列表 */
  const removal = useEntryDelete({
    resolveEntry: (path) => {
      const item = items.find((candidate) => candidate.id === path);

      return item ? { kind: 'file', name: item.name } : null;
    },
    reload: () => undefined,
    onDeleted: (path) => {
      const removedIndex = items.findIndex(
        (item) => item.id === path,
      );
      const nextItems = items.filter((item) => item.id !== path);

      setItems(nextItems);

      if (nextItems.length === 0) {
        onRequestClose();

        return;
      }

      if (activeId === path) {
        const next = nextItems[Math.min(removedIndex, nextItems.length - 1)];

        setActiveId(next.id);
        setSwitchTick((tick) => tick + 1);
      }
    },
  });

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
    cancelDelete: removal.cancelDelete,
    confirmDelete: removal.confirmDelete,
    deleteConfirmOpen: removal.deletingEntry !== null,
    deleteEntry: removal.deletingEntry,
    deleteLoading: removal.deleteLoading,
    isBatched,
    items,
    onCapture: captureFrame,
    onOpenExternal,
    onPickDir: pickMediaDir,
    onRequestDelete: removal.requestDelete,
    onToggleBatch,
  };
};
