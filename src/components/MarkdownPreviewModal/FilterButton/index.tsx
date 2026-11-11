/**
 * 标题栏里的筛选按钮：点一下就在图标下方就近弹出一块面板。
 *
 * 弹窗不知道「错题」「习题」是什么——面板里放什么、正文怎么筛都由调用方定义
 * （见 `MarkdownPreviewFilter`），这里只负责按钮外观、弹层开合与「筛选中」的高亮。
 */

import { ActionIcon, Popover, Tooltip } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import type { FilterButtonProps } from './types';

import styles from './index.scss';

/** 与标题栏其它图标同档的尺寸 / 线宽，以及弹层宽度（三个范围 + 关键词正好排得开） */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;
const DROPDOWN_WIDTH = 272;

const FilterButton = ({
  active,
  children,
  onChange,
  opened,
}: FilterButtonProps) => (
  <Popover
    offset={8}
    onChange={onChange}
    opened={opened}
    position="bottom-end"
    shadow="md"
    width={DROPDOWN_WIDTH}
    withArrow
    withinPortal
  >
    <Popover.Target>
      <Tooltip label={active ? '筛选正文（已生效）' : '筛选正文'} withArrow>
        <ActionIcon
          aria-label="筛选正文"
          className={cx(styles.button, active && styles.active)}
          onClick={() => onChange(!opened)}
          size="sm"
          variant="subtle"
        >
          <IconFilter size={ICON_SIZE} stroke={ICON_STROKE} />
        </ActionIcon>
      </Tooltip>
    </Popover.Target>
    <Popover.Dropdown className={styles.dropdown}>{children}</Popover.Dropdown>
  </Popover>
);

export default FilterButton;
