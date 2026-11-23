/**
 * 文件类型筛选：单选「全部 / 视频 / 图片 / PDF / Markdown / App / 其它」，默认全部。
 * 选择是一个展示偏好，持久化到 localStorage；读回时校验档位，不认识的值回落「全部」。
 * 用单选而不是多选：「选了 App 还看到别的」这种误读，多选框本身解释不清，单选一眼就是过滤。
 */

import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import { createChoiceCodec } from '@/utils/local-storage';

import {
  FILE_CATEGORY_OPTIONS,
  TYPE_FILTER_ALL,
  TYPE_FILTER_STORAGE_KEY,
} from '../constants';
import type { TypeFilterValue } from '../types';

const TYPE_FILTER_VALUES: TypeFilterValue[] = [
  TYPE_FILTER_ALL,
  ...FILE_CATEGORY_OPTIONS.map((option) => option.value),
];

/** 存裸字符串（`all` / `app` …），不认识的值回落「全部」 */
const typeFilterCodec = createChoiceCodec<TypeFilterValue>(
  TYPE_FILTER_VALUES,
  TYPE_FILTER_ALL,
);

export const useTypeFilter = () => {
  const [active, setActive] = useStoredState(
    TYPE_FILTER_STORAGE_KEY,
    typeFilterCodec,
  );

  const onChange = useCallback(
    (next: TypeFilterValue) => setActive(next),
    [setActive],
  );

  return { active, onChange };
};
