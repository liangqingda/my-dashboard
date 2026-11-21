/**
 * 标题栏里的一个图标操作：图标不自解释，所以 tooltip 与 aria-label 用同一句人话；
 * 颜色按语气分档，形状（尺寸 / 变体）保持一致，标题栏里不出现大小不一的按钮。
 */

import { ActionIcon, Tooltip } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { HeaderIconActionProps } from './types';
import { TONE_CLASS } from './constants';

import styles from './index.scss';

const HeaderIconAction = ({
  children,
  disabled = false,
  label,
  loading = false,
  onClick,
  size = 'md',
  tone = 'normal',
}: HeaderIconActionProps) => (
  <Tooltip label={label} withArrow>
    <ActionIcon
      aria-label={label}
      className={cx(styles.button, TONE_CLASS[tone])}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      size={size === 'lg' ? 'lg' : 'sm'}
      variant="subtle"
    >
      {children}
    </ActionIcon>
  </Tooltip>
);

export default HeaderIconAction;
