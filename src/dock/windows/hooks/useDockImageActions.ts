/**
 * 图片坞窗的后备能力：页面卸载后仍按快照里的条目完成裁剪、删除、墙纸与待拖拽。
 *
 * 页面还挂载时窗口优先用 `PreviewDockActions` 的页面回调；这份 hook 只在页面不在时接管。
 * 删除 / 墙纸 / 裁剪落盘不在坞窗重写：直接用文件页同一套 `useEntryDelete`、`useWallpaper`、
 * `useImageCropSave`，这里只补一份「快照列表」与其本地刷新。
 */

import { useCallback, useState } from 'react';

import type { ImagePreviewItem } from '@/components/modals/ImagePreviewModal/types';

import { useImageCropSave } from '@/pages/Files/hooks/useImageCropSave';
import { useEntryDelete } from '@/pages/Files/hooks/useEntryDelete';
import { useWallpaper } from '@/pages/Files/hooks/useWallpaper';

/** 后备能力入参 */
type Params = {
  /** 坞窗按快照路径补出来的整组图片 */
  initialItems: readonly ImagePreviewItem[];
  /** 删除最后一张后要关掉窗口 */
  onRequestClose: () => void;
  /** 当前条目，删除后要顺位切到下一张 */
  activeId: string;
  /** 切到另一张 */
  setActiveId: (id: string) => void;
  /** 切换序号：删除后顺位切换也要让计数浮标重新出现 */
  setSwitchTick: (updater: (tick: number) => number) => void;
};

/**
 * 图片坞窗自己完成的一套操作；页面不在时由窗口使用。
 *
 * @returns 带缓存版本的图片列表、四类动作与两层确认弹窗状态
 */
export const useDockImageActions = ({
  activeId,
  initialItems,
  onRequestClose,
  setActiveId,
  setSwitchTick,
}: Params) => {
  const [items, setItems] = useState(() => initialItems.map((item) => ({ ...item })));
  /** 页面不在时，待拖拽区只在本窗口内攒；页面回来后再由页面状态接管 */
  const [batchedIds, setBatchedIds] = useState<readonly string[]>([]);
  /** 裁剪落盘与地址版本和文件页共用同一份动作 */
  const { cropImage, version } = useImageCropSave();
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
  /** 墙纸确认与写入复用文件页的 `useWallpaper` */
  const wallpaper = useWallpaper();
  const { requestWallpaper } = wallpaper;

  const onRequestWallpaper = useCallback(
    (id: string, name: string) => {
      requestWallpaper({ name, path: id });
    },
    [requestWallpaper],
  );

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

  /** 覆盖源文件后让当前张重新取图；列表本身不变 */
  const displayItems = version === 0
    ? items
    : items.map((item) => ({ ...item, src: `${item.src}&v=${version}` }));

  return {
    cancelDelete: removal.cancelDelete,
    cancelWallpaper: wallpaper.cancel,
    confirmDelete: removal.confirmDelete,
    confirmWallpaper: wallpaper.confirm,
    deleteConfirmOpen: removal.deletingEntry !== null,
    deleteEntry: removal.deletingEntry,
    deleteLoading: removal.deleteLoading,
    displayItems,
    isBatched,
    onCrop: cropImage,
    onRequestDelete: removal.requestDelete,
    onRequestWallpaper,
    onToggleBatch,
    wallpaperConfirmOpen: wallpaper.request !== null,
    wallpaperLoading: wallpaper.loading,
    wallpaperRequest: wallpaper.request,
  };
};
