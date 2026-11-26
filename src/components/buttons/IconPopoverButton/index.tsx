/**
 * 带就近弹层的图标按钮：点一下在图标下方弹出调用方给的一块面板。
 *
 * 只做三件事：把按钮摆到 `Popover.Target` 的锚点上、管弹层的开合与落点（位置 / 间距 / 内边距）、
 * 给一处「生效」高亮。
 * 按钮本体（形状 / 尺寸档 / 语气 / 不随文字收缩）全部来自 `FreeIconAction`，这里只传 `tone`，
 * 不再定义任何按钮样式。
 *
 * 面板里放什么、什么时候收起都不归它——过滤、字号这类语义各自在调用方那一层。
 */

import { Popover, Tooltip } from '@mantine/core';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import { cx } from '@/utils/cx';

import type { IconPopoverButtonProps } from './types';

import styles from './index.scss';

/** 默认弹层宽度：一档范围 + 关键词这类内容正好排得开 */
const DROPDOWN_WIDTH = 272;

/** 默认弹层内边距：与组件库弹层的一档内边距持平 */
const DROPDOWN_PADDING = 12;

const IconPopoverButton = ({
  active = false,
  children,
  disabled = false,
  hint,
  icon,
  label,
  maxHeight,
  offset = 8,
  onChange,
  opened,
  padding = DROPDOWN_PADDING,
  position = 'bottom-end',
  shortcut,
  tipDark = false,
  width = DROPDOWN_WIDTH,
  zIndex,
}: IconPopoverButtonProps) => {
  const stateText = hint ?? (active ? `${label}（已生效）` : label);
  const tooltip = shortcut ? `${stateText}（${shortcut}）` : stateText;

  return (
    <Popover
      offset={offset}
      onChange={onChange}
      opened={opened}
      position={position}
      shadow="md"
      width={width}
      withArrow
      withinPortal
      zIndex={zIndex}
    >
      {/* 提示要拼「已生效」和键位，所以按钮只出本体（`tooltip="none"`），tip 在这里挂 */}
      <Popover.Target>
        <Tooltip
          classNames={{ tooltip: cx(tipDark && styles.tipDark) }}
          label={tooltip}
          withArrow
        >
          <FreeIconAction
            disabled={disabled}
            label={label}
            onClick={() => onChange(!opened)}
            size="sm"
            tone={active ? 'accent' : 'normal'}
            tooltip="none"
          >
            {icon}
          </FreeIconAction>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown
        className={cx(maxHeight !== undefined && styles.scrollable)}
        /* 百分比 / dvh 不是间距档：走 style 落 max-height，避免被 spacing 换算成 rem */
        style={{ maxHeight, padding }}
      >
        {children}
      </Popover.Dropdown>
    </Popover>
  );
};

export default IconPopoverButton;
