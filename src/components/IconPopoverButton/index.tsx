/**
 * 带就近弹层的图标按钮：点一下在图标下方弹出调用方给的一块面板。
 *
 * 只做三件事：与标题栏其它图标同档的按钮外观、「生效」时换主色、弹层的开合与定位。
 * 面板里放什么、什么时候收起都不归它——过滤、字号这类语义各自在调用方那一层。
 */

import { ActionIcon, Popover, Tooltip } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { IconPopoverButtonProps } from './types';

import styles from './index.scss';

/** 默认弹层宽度：一档范围 + 关键词这类内容正好排得开 */
const DROPDOWN_WIDTH = 272;

const IconPopoverButton = ({
  active = false,
  children,
  hint,
  icon,
  label,
  onChange,
  opened,
  width = DROPDOWN_WIDTH,
}: IconPopoverButtonProps) => {
  const tooltip = hint ?? (active ? `${label}（已生效）` : label);

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
        <Tooltip label={tooltip} withArrow>
          <ActionIcon
            aria-label={label}
            className={cx(styles.button, active && styles.active)}
            onClick={() => onChange(!opened)}
            size="sm"
            variant="subtle"
          >
            {icon}
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown className={styles.dropdown}>{children}</Popover.Dropdown>
    </Popover>
  );
};

export default IconPopoverButton;
