/**
 * 文件类型筛选：勾选哪些分类就显示哪些，默认全选；「全部」勾选框随其余项呈选中 / 半选 / 未选。
 * 这里只管「勾了哪几类」（JSON 数组，持久化）；「多选 / 单选」是设置项，放在 `useFilesSettings`。
 */

import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import type { StoredCodec } from '@/utils/local-storage';

import { FILE_CATEGORY_VALUES, TYPE_FILTER_STORAGE_KEY } from '../constants';
import type { FileCategory } from '../types';

/** 默认全选 */
const ALL_CATEGORIES: FileCategory[] = [...FILE_CATEGORY_VALUES];

/**
 * 已选分类的编解码：没写过（`null`）按全选；存 JSON 数组，逐项校验并去重。
 * 存成空数组是「一个都不勾」的合法状态，只有勾完再取消才会回「全部」。
 */
const selectedCodec: StoredCodec<FileCategory[]> = {
  decode: (raw) => {
    if (raw === null) {
      return ALL_CATEGORIES;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return ALL_CATEGORIES;
    }

    if (!Array.isArray(parsed)) {
      return ALL_CATEGORIES;
    }

    const seen = new Set<FileCategory>();

    for (const item of parsed) {
      if (
        typeof item === 'string' &&
        (FILE_CATEGORY_VALUES as string[]).includes(item)
      ) {
        seen.add(item as FileCategory);
      }
    }

    return [...seen];
  },
  encode: (value) => JSON.stringify(value),
};

export const useTypeFilter = () => {
  const [selected, setSelected] = useStoredState(
    TYPE_FILTER_STORAGE_KEY,
    selectedCodec,
  );

  const onChange = useCallback(
    (next: FileCategory[]) => setSelected(next),
    [setSelected],
  );

  return {
    /** 当前勾选的分类 */
    selected,
    /** 换一批勾选的分类 */
    onChange,
  };
};
