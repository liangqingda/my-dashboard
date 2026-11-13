/**
 * 筛选图标按钮：`IconPopoverButton` 套上筛选图标，两处在用——
 * 预览弹窗 header 的「筛选正文」与英语页 header 的「筛选笔记」。
 *
 * 它只是按钮 + 弹层外壳，筛什么、面板长什么样、条件存在哪都由调用方决定；
 * 按钮外观与弹层定位来自公共的 `IconPopoverButton`，这里不再维护第二份样式。
 */

import { IconFilter } from '@tabler/icons-react';

import IconPopoverButton from '@/components/IconPopoverButton';

import type { FilterButtonProps } from './types';

/** 与标题栏其它图标同档的图标尺寸 / 线宽 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

const FilterButton = ({
  active,
  children,
  label,
  onChange,
  opened,
  width,
}: FilterButtonProps) => (
  <IconPopoverButton
    active={active}
    icon={<IconFilter size={ICON_SIZE} stroke={ICON_STROKE} />}
    label={label}
    onChange={onChange}
    opened={opened}
    width={width}
  >
    {children}
  </IconPopoverButton>
);

export default FilterButton;
