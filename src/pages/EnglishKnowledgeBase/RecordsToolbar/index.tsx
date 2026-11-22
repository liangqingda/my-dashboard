import {
  Group,
  SegmentedControl,
  Select,
  Text,
} from '@mantine/core';

import FreeSearchInput from '@/components/fields/FreeSearchInput';

import {
  ALL_CATEGORIES,
  SEARCH_PLACEHOLDER,
  SEARCH_WIDTH,
  STATUS_FILTERS,
} from '../constants';

import type { RecordsToolbarProps } from './types';

import styles from './index.scss';

/**
 * 知识库列表顶部的筛选行：状态分段、分类下拉、关键词搜索排一行，
 * 右侧显示计数（还没数据时显示「读取中…」）。筛选项归页面持有，这里只负责呈现与冒泡。
 */
const RecordsToolbar = ({
  category,
  categoryOptions,
  countText,
  keyword,
  loading,
  onCategoryChange,
  onKeywordChange,
  onStatusChange,
  status,
  total,
}: RecordsToolbarProps) => (
  <Group className={styles.toolbar} gap="sm" justify="space-between" wrap="wrap">
    <Group gap="sm" wrap="wrap">
      <SegmentedControl
        data={STATUS_FILTERS}
        onChange={onStatusChange}
        size="xs"
        value={status}
      />
      <Select
        allowDeselect={false}
        aria-label="按分类筛选"
        data={categoryOptions}
        onChange={(value) => onCategoryChange(value ?? ALL_CATEGORIES)}
        size="xs"
        value={category}
        w={128}
      />
      <FreeSearchInput
        ariaLabel="按关键词搜索记录"
        onChange={onKeywordChange}
        placeholder={SEARCH_PLACEHOLDER}
        value={keyword}
        width={SEARCH_WIDTH}
      />
    </Group>
    <Text c="dimmed" size="xs">
      {loading && total === 0 ? '读取中…' : countText}
    </Text>
  </Group>
);

export default RecordsToolbar;
