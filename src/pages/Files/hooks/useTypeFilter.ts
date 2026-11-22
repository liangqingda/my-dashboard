/**
 * 文件类型筛选：多选分类，空数组表示不过滤。选择是手动切换的展示偏好，持久化到
 * localStorage；读回时逐项校验分类档位，脏值 / 重复项丢掉，不渲染不认识的分类。
 */

import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import type { StoredCodec } from '@/utils/local-storage';

import { FILE_CATEGORY_OPTIONS, TYPE_FILTER_STORAGE_KEY } from '../constants';
import type { FileCategory } from '../types';

const CATEGORY_VALUES = FILE_CATEGORY_OPTIONS.map((option) => option.value);

/** 已选分类数组的编解码：存 JSON 数组；逐项校验档位并按出现顺序去重 */
const categoryFilterCodec: StoredCodec<FileCategory[]> = {
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

    const seen = new Set<FileCategory>();

    for (const item of parsed) {
      if (
        typeof item === 'string' &&
        (CATEGORY_VALUES as string[]).includes(item) &&
        !seen.has(item as FileCategory)
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
    categoryFilterCodec,
  );

  const onChange = useCallback(
    (next: FileCategory[]) => setSelected(next),
    [setSelected],
  );

  return { selected, onChange };
};
