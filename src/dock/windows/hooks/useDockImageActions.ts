/**
 * 图片坞窗的后备能力：页面卸载后仍按快照里的条目完成裁剪、删除、墙纸与待拖拽。
 *
 * 页面还挂载时窗口优先用 `PreviewDockActions` 的页面回调；这份 hook 只在页面不在时接管，
 * 避免拿已卸载页面的旧闭包。删除与墙纸的二次确认层由窗口自己渲染，动作落在当前条目上。
 */

import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';

import type {
  ImageCropRequest,
  ImageCropResult,
} from '@/components/modals/ImagePreviewModal/types';
import { useMounted } from '@/hooks/useMounted';
import { getErrorMessage } from '@/utils/error';

import type { DeletingEntry } from '@/pages/Files/hooks/useEntryDelete';
import type { WallpaperRequest } from '@/pages/Files/hooks/useWallpaper';
import {
  cropImage,
  deleteEntry,
  setDesktopWallpaper,
} from '@/pages/Files/utils/files-api';

/** 待确认删除的图片：条目信息给确认层展示，路径给接口 */
type PendingImageDelete = {
  /** 确认层要用的人话条目 */
  entry: DeletingEntry;
  /** 图片绝对路径 */
  path: string;
};

/** 后备能力入参 */
type Params = {
  /** 快照里的整组图片 */
  initialItems: readonly { id: string; name: string; src: string }[];
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
  const mounted = useMounted();
  const [items, setItems] = useState(() => initialItems.map((item) => ({ ...item })));
  /**
   * 覆盖源文件后路径没变，浏览器不会自己重取；换一个查询值让正在看的这张重新加载。
   * 另存不改列表，和页面上的裁剪保持同一口径。
   */
  const [version, setVersion] = useState(0);
  /** 页面不在时，待拖拽区只在本窗口内攒；页面回来后再由页面状态接管 */
  const [batchedIds, setBatchedIds] = useState<readonly string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PendingImageDelete | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingWallpaper, setPendingWallpaper] =
    useState<WallpaperRequest | null>(null);
  const [wallpaperLoading, setWallpaperLoading] = useState(false);

  const onCrop = useCallback(
    async (request: ImageCropRequest): Promise<ImageCropResult> => {
      const result = await cropImage(request);

      if (result.mode === 'replace') {
        setVersion((current) => current + 1);
      }

      return result;
    },
    [],
  );

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

  const cancelDelete = useCallback(() => {
    if (!deleteLoading) {
      setPendingDelete(null);
    }
  }, [deleteLoading]);

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

  const onRequestWallpaper = useCallback(
    (id: string, name: string) => {
      setPendingWallpaper({ name, path: id });
    },
    [],
  );

  const cancelWallpaper = useCallback(() => {
    if (!wallpaperLoading) {
      setPendingWallpaper(null);
    }
  }, [wallpaperLoading]);

  const confirmWallpaper = async () => {
    if (!pendingWallpaper || wallpaperLoading) {
      return;
    }

    setWallpaperLoading(true);

    try {
      await setDesktopWallpaper(pendingWallpaper.path);

      if (!mounted.current) {
        return;
      }

      notifications.show({
        title: '已设为桌面墙纸',
        message: `「${pendingWallpaper.name}」已铺到桌面`,
        color: 'teal',
        autoClose: 4000,
      });
      setPendingWallpaper(null);
    } catch (error: unknown) {
      if (!mounted.current) {
        return;
      }

      notifications.show({
        title: '设置墙纸失败',
        message: getErrorMessage(error, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      if (mounted.current) {
        setWallpaperLoading(false);
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

  /** 覆盖源文件后让当前张重新取图；列表本身不变 */
  const displayItems = version === 0
    ? items
    : items.map((item) => ({ ...item, src: `${item.src}&v=${version}` }));

  return {
    cancelDelete,
    cancelWallpaper,
    confirmDelete,
    confirmWallpaper,
    deleteConfirmOpen: pendingDelete !== null,
    deleteEntry: pendingDelete?.entry ?? null,
    deleteLoading,
    displayItems,
    isBatched,
    onCrop,
    onRequestDelete,
    onRequestWallpaper,
    onToggleBatch,
    wallpaperConfirmOpen: pendingWallpaper !== null,
    wallpaperLoading,
    wallpaperRequest: pendingWallpaper,
  };
};
