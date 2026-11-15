/**
 * 同文档链接的图标按钮：点一下在图标下方弹出「点了链接之后怎么办」的下拉选择。
 *
 * 弹层内容只有一个 `Select`，并且**挂载即聚焦**（`autoFocus` + Mantine 默认的
 * `openOnFocus`），所以点开按钮时选项已经摊开，少一次点击。
 * 下拉**不放进门户**（`withinPortal: false`）：门户里的列表在 popover 看来是「外面」，
 * 点选项会先把弹层关掉，选择动作就丢了。
 *
 * 行为值本身归弹窗持有（`useAnchorLinkBehavior`）——它是一份跨篇记住的阅读偏好，
 * 不跟着某一篇走；这里只管按钮外观、弹层开合与把选中的值递上去。
 */

import { Select } from '@mantine/core';
import { IconAnchor } from '@tabler/icons-react';

import IconPopoverButton from '@/components/IconPopoverButton';

import type { AnchorLinkBehavior, AnchorLinkControlProps } from '../types';
import { ANCHOR_LINK_BEHAVIORS } from '../constants';

/** 与标题栏其它图标同档的图标尺寸 / 线宽 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

/** 弹层宽度：一个下拉加上内边距，正好排得开 */
const DROPDOWN_WIDTH = 220;

/** 两档行为在选项里的文案：说结果，不让人猜「弹窗打开区块」是什么意思 */
const OPTION_LABEL: Record<AnchorLinkBehavior, string> = {
  jump: '跳转到锚点',
  modal: '弹窗打开该区块',
};

/** 选项顺序与枚举一致，值只有一份来源（`constants.ts`） */
const OPTIONS = ANCHOR_LINK_BEHAVIORS.map((behavior) => ({
  label: OPTION_LABEL[behavior],
  value: behavior,
}));

const AnchorLinkControl = ({
  behavior,
  onChange,
  onBehaviorChange,
  opened,
}: AnchorLinkControlProps) => {
  /**
   * 下拉给回来的是字符串（清空时是 null），先对回枚举里的那一档，拿不到就不动；
   * 选完顺带把弹层收起——这一档设置点一次就定完了。
   */
  const handleChange = (value: string | null) => {
    const option = OPTIONS.find((item) => item.value === value);

    if (!option) {
      return;
    }

    onBehaviorChange(option.value);
    onChange(false);
  };

  return (
    <IconPopoverButton
      active={behavior === 'modal'}
      hint="同文档链接打开方式"
      icon={<IconAnchor size={ICON_SIZE} stroke={ICON_STROKE} />}
      label="同文档链接打开方式"
      onChange={onChange}
      opened={opened}
      width={DROPDOWN_WIDTH}
    >
      <Select
        allowDeselect={false}
        aria-label="同文档链接打开方式"
        autoFocus
        comboboxProps={{ withinPortal: false }}
        data={OPTIONS}
        onChange={handleChange}
        size="sm"
        value={behavior}
      />
    </IconPopoverButton>
  );
};

export default AnchorLinkControl;
