import {
  CloseButton,
  Group,
  SegmentedControl,
  Select,
  Text,
  TextInput,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

import {
  ALL_CATEGORIES,
  SEARCH_PLACEHOLDER,
  SEARCH_WIDTH,
  STATUS_FILTERS,
} from '../constants';

import type { RecordsToolbarProps } from './types';

import styles from './index.scss';

/**
 * 复习库列表顶部的筛选行：状态分段、分类下拉、关键词搜索排一行，
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
      <TextInput
        aria-label="按关键词搜索记录"
        leftSection={<IconSearch size={15} stroke={1.9} />}
        onChange={(event) => onKeywordChange(event.currentTarget.value)}
        placeholder={SEARCH_PLACEHOLDER}
        rightSection={
          keyword ? (
            <CloseButton
              aria-label="清空搜索"
              onClick={() => onKeywordChange('')}
              size="xs"
            />
          ) : null
        }
        size="xs"
        value={keyword}
        w={SEARCH_WIDTH}
      />
    </Group>
    <Text c="dimmed" size="xs">
      {loading && total === 0 ? '读取中…' : countText}
    </Text>
  </Group>
);

export default RecordsToolbar;
