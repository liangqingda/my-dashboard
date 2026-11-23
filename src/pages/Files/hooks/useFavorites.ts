import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import type { StoredCodec } from '@/utils/local-storage';

import {
  DEFAULT_FAVORITES,
  FAVORITES_STORAGE_KEY,
  SYSTEM_APPS_FAVORITE,
} from '../constants';
import type { FavoriteEntry } from '../types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 固定项排在前、非固定项在后；两组各自保持原有顺序 */
const groupPinnedFirst = (list: FavoriteEntry[]): FavoriteEntry[] => [
  ...list.filter((entry) => entry.pinned),
  ...list.filter((entry) => !entry.pinned),
];

/**
 * 收藏目录的编解码：localStorage 存 JSON 数组，条目为 `{ path, name, pinned }`；
 * 读回时逐项校验路径与名字非空、同一路径只留第一条，再按「固定优先」重排。
 * 旧数据（条目没有 `pinned` 字段）补回预置的系统应用条目；新格式下用户自己删掉的条目、
 * 以及清空后的空数组都不会被补回来。脏值 / 非法 JSON 一律回落空列表。
 */
const favoritesCodec: StoredCodec<FavoriteEntry[]> = {
  decode: (raw) => {
    if (raw === null) {
      return [...DEFAULT_FAVORITES];
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();
    /** 旧格式没有 `pinned`：据此判断要不要补预置条目；空数组按「用户清空了收藏」处理，不补 */
    const legacy = parsed.some(
      (item) => isObject(item) && typeof item.pinned !== 'boolean',
    );

    const entries = parsed.flatMap((item): FavoriteEntry[] => {
      if (!isObject(item)) {
        return [];
      }

      const path = typeof item.path === 'string' ? item.path : '';
      const name = typeof item.name === 'string' ? item.name : '';

      if (!path || !name || seen.has(path)) {
        return [];
      }

      seen.add(path);

      return [{ name, path, pinned: item.pinned === true }];
    });

    const seeded =
      legacy && !seen.has(SYSTEM_APPS_FAVORITE.path)
        ? [{ ...SYSTEM_APPS_FAVORITE }, ...entries]
        : entries;

    return groupPinnedFirst(seeded);
  },
  encode: (value) => JSON.stringify(value),
};

/**
 * 收藏目录：收藏 / 取消收藏当前目录，按路径判重；列表持久化到 localStorage，
 * 刷新后保留。固定项恒排在最前，非固定项按用户拖拽的顺序排在其后。
 */
export const useFavorites = () => {
  const [favorites, setFavorites] = useStoredState(
    FAVORITES_STORAGE_KEY,
    favoritesCodec,
  );

  const isFavorite = useCallback(
    (path: string) => favorites.some((entry) => entry.path === path),
    [favorites],
  );

  /** 收藏一条目录（默认不固定）；已在收藏里则取消收藏 */
  const toggleFavorite = useCallback(
    (entry: Omit<FavoriteEntry, 'pinned'>) => {
      setFavorites(
        favorites.some((item) => item.path === entry.path)
          ? favorites.filter((item) => item.path !== entry.path)
          : groupPinnedFirst([...favorites, { ...entry, pinned: false }]),
      );
    },
    [favorites, setFavorites],
  );

  /** 按路径移除收藏 */
  const removeFavorite = useCallback(
    (path: string) => {
      setFavorites(favorites.filter((item) => item.path !== path));
    },
    [favorites, setFavorites],
  );

  /** 切换一条收藏的固定状态：固定项升到顶部，取消固定则沉到非固定组末尾 */
  const togglePinnedFavorite = useCallback(
    (path: string) => {
      setFavorites(
        groupPinnedFirst(
          favorites.map((entry) =>
            entry.path === path ? { ...entry, pinned: !entry.pinned } : entry,
          ),
        ),
      );
    },
    [favorites, setFavorites],
  );

  /** 拖拽排序：把 `fromPath` 挪到 `toPath` 之前；固定状态不变，之后仍按固定分组重排 */
  const moveFavorite = useCallback(
    (fromPath: string, toPath: string) => {
      if (fromPath === toPath) {
        return;
      }

      const moving = favorites.find((entry) => entry.path === fromPath);
      const rest = favorites.filter((entry) => entry.path !== fromPath);
      const toIndex = rest.findIndex((entry) => entry.path === toPath);

      if (moving === undefined || toIndex < 0) {
        return;
      }

      setFavorites(
        groupPinnedFirst([
          ...rest.slice(0, toIndex),
          moving,
          ...rest.slice(toIndex),
        ]),
      );
    },
    [favorites, setFavorites],
  );

  return {
    favorites,
    isFavorite,
    moveFavorite,
    removeFavorite,
    toggleFavorite,
    togglePinnedFavorite,
  };
};
