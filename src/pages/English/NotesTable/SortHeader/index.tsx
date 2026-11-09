import { UnstyledButton } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
} from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import type { SortHeaderProps } from './types';

import styles from './index.scss';

/** 方向 → 图标；未激活的列用双箭头提示「这一列可排序」 */
const SORT_ICONS = { asc: IconArrowUp, desc: IconArrowDown };

/** 可排序的列标题：点击切到这一列，再点一次反转方向 */
const SortHeader = ({ label, onSort, sort, sortKey }: SortHeaderProps) => {
  const active = sort.key === sortKey;
  const SortIcon = active ? SORT_ICONS[sort.direction] : IconArrowsSort;

  return (
    <UnstyledButton
      aria-label={`按${label}排序`}
      className={cx(styles.button, active && styles.active)}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      {label}
      <SortIcon aria-hidden="true" className={styles.icon} size={13} stroke={1.9} />
    </UnstyledButton>
  );
};

export default SortHeader;
