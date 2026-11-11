/**
 * 筛选图标按钮：点一下就在图标下方就近弹出一块面板。
 *
 * 组件不知道「筛什么」——面板内容与筛选口径都由调用方定义，
 * 这里只负责按钮外观、弹层开合与「筛选中」的高亮。
 * 预览弹窗的正文筛选与英语页的列表筛选共用这一份外观。
 */

import { ActionIcon, Popover, Tooltip } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import type { FilterButtonProps } from './types';

import styles from './index.scss';

/** 与标题栏其它图标同档的图标尺寸 / 线宽，以及弹层默认宽度（一档范围 + 关键词正好排得开） */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;
const DROPDOWN_WIDTH = 272;

const FilterButton = ({
  active,
  children,
  label,
  onChange,
  opened,
  width = DROPDOWN_WIDTH,
}: FilterButtonProps) => {
  const hint = active ? `${label}（已生效）` : label;

  return (
    <Popover
      offset={8}
      onChange={onChange}
      opened={opened}
      position="bottom-end"
      shadow="md"
      width={width}
      withArrow
      withinPortal
    >
      <Popover.Target>
        <Tooltip label={hint} withArrow>
          <ActionIcon
            aria-label={label}
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
};

export default FilterButton;
