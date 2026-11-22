import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import type { StoredCodec } from '@/utils/local-storage';

import { FAVORITES_STORAGE_KEY } from '../constants';
import type { FavoriteEntry } from '../types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 收藏目录的编解码：localStorage 存 JSON 数组；读回时逐项校验路径与名字非空，
 * 同一路径重复出现只留第一条；脏值 / 非法 JSON 一律回落空列表。
 */
const favoritesCodec: StoredCodec<FavoriteEntry[]> = {
  decode: (raw) => {
    if (raw === null) {
      return [];
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

    return parsed.flatMap((item) => {
      if (!isObject(item)) {
        return [];
      }

      const path = typeof item.path === 'string' ? item.path : '';
      const name = typeof item.name === 'string' ? item.name : '';

      if (!path || !name || seen.has(path)) {
        return [];
      }

      seen.add(path);

      return [{ path, name }];
    });
  },
  encode: (value) => JSON.stringify(value),
};

/**
 * 收藏目录：收藏 / 取消收藏当前目录，按路径判重；列表持久化到 localStorage，
 * 刷新后保留。同路径再点一次即取消收藏。
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

  /** 收藏一条目录；已在收藏里则取消收藏 */
  const toggleFavorite = useCallback(
    (entry: FavoriteEntry) => {
      setFavorites(
        favorites.some((item) => item.path === entry.path)
          ? favorites.filter((item) => item.path !== entry.path)
          : [...favorites, entry],
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

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
};
