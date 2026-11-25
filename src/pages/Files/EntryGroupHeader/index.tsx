/**
 * 列表分组标题：网格分组段与表格分组行共用同一套标题外观（对齐 macOS 访达的分组段）。
 * 整行可点切换展开 / 收起，箭头随状态旋转；段 / 行的容器与底色由调用方各自给。
 */

import type { MouseEvent } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import type { EntryGroupHeaderProps } from './types';

import styles from './index.scss';

const EntryGroupHeader = ({
  collapsed,
  label,
  onToggle,
}: EntryGroupHeaderProps) => {
  /** 停掉冒泡：外层分组行也绑了同一个切换，避免点标题触发两次 */
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };

  return (
    <UnstyledButton className={styles.header} onClick={handleClick} type="button">
      <IconChevronRight
        className={cx(styles.chevron, !collapsed && styles.chevronOpen)}
        size={14}
        stroke={1.8}
      />
      <span className={styles.label}>{label}</span>
    </UnstyledButton>
  );
};

export default EntryGroupHeader;
