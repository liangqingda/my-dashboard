/**
 * 同文档链接的图标按钮：点一下在图标下方弹出「点了链接之后怎么办」的两档选择。
 *
 * 只是按钮 + 弹层外壳（`IconPopoverButton`），行为值本身归弹窗持有
 * （`useAnchorLinkBehavior`）——它是一份跨篇记住的阅读偏好，不跟着某一篇走。
 */

import { Radio, Stack, Text } from '@mantine/core';
import { IconAnchor } from '@tabler/icons-react';

import IconPopoverButton from '@/components/IconPopoverButton';

import type { AnchorLinkBehavior, AnchorLinkControlProps } from '../types';
import { ANCHOR_LINK_BEHAVIORS } from '../constants';

/** 与标题栏其它图标同档的图标尺寸 / 线宽 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

/** 弹层宽度：一行说明 + 两条带描述的选项，正好排得开 */
const DROPDOWN_WIDTH = 252;

/**
 * 两档行为的文案：标签说结果，描述补一句「点完具体发生什么」，
 * 不用再让人猜「弹窗打开区块」是什么意思。
 */
const OPTION_TEXT: Record<
  AnchorLinkBehavior,
  { label: string; description: string }
> = {
  jump: { description: '在当前正文里滚到那个位置', label: '跳转到锚点' },
  modal: { description: '把那一节内容单独开窗预览', label: '弹窗打开该区块' },
};

/** 选项顺序与枚举一致，值只有一份来源（`constants.ts`） */
const OPTIONS = ANCHOR_LINK_BEHAVIORS.map((behavior) => ({
  behavior,
  ...OPTION_TEXT[behavior],
}));

const AnchorLinkControl = ({
  behavior,
  onChange,
  onBehaviorChange,
  opened,
}: AnchorLinkControlProps) => {
  /** 单选组给回来的是字符串，先对回枚举里的那一档，拿不到就不动 */
  const handleChange = (value: string) => {
    const option = OPTIONS.find((item) => item.behavior === value);

    if (option) {
      onBehaviorChange(option.behavior);
    }
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
      <Stack gap={8}>
        <Text c="dimmed" size="xs">
          点同文档链接（#锚点）时
        </Text>
        <Radio.Group onChange={handleChange} value={behavior}>
          <Stack gap={6}>
            {OPTIONS.map((option) => (
              <Radio
                description={option.description}
                key={option.behavior}
                label={option.label}
                value={option.behavior}
              />
            ))}
          </Stack>
        </Radio.Group>
      </Stack>
    </IconPopoverButton>
  );
};

export default AnchorLinkControl;
