/**
 * 文件类型筛选：各档默认全显示，勾掉哪类就把哪类排除。排除项是手动切换的展示偏好，
 * 持久化到 localStorage；读回时逐项校验分类档位，脏值 / 重复项丢掉，不认不认识的分类。
 * 空数组表示没有排除项（全部显示），所以默认状态不需要写任何值。
 */

import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import type { StoredCodec } from '@/utils/local-storage';

import { FILE_CATEGORY_OPTIONS, TYPE_FILTER_STORAGE_KEY } from '../constants';
import type { FileCategory } from '../types';

const CATEGORY_VALUES = FILE_CATEGORY_OPTIONS.map((option) => option.value);

/** 排除项数组的编解码：存 JSON 数组；逐项校验档位并按出现顺序去重 */
const excludedFilterCodec: StoredCodec<FileCategory[]> = {
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
  const [excluded, setExcluded] = useStoredState(
    TYPE_FILTER_STORAGE_KEY,
    excludedFilterCodec,
  );

  const onChange = useCallback(
    (next: FileCategory[]) => setExcluded(next),
    [setExcluded],
  );

  return { excluded, onChange };
};
