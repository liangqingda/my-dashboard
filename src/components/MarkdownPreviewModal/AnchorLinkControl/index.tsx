/**
 * 同文档链接的图标按钮：点一下在图标下方弹出「点了链接之后怎么办」的两个选项。
 *
 * 两档都是短句，所以用单选组（一档就是一个点击动作，不用先展开再选）；
 * 尺寸收一档、标签与圆点水平居中——弹层只有 220px 宽，按默认 sm 的圆点 + 20px 行高会显得空。
 *
 * 行为值本身归弹窗持有（`useAnchorLinkBehavior`）——它是一份跨篇记住的阅读偏好，
 * 不跟着某一篇走；这里只管按钮外观、弹层开合与把选中的值递上去。
 */

import { Radio, Stack, Text } from '@mantine/core';
import { IconAnchor } from '@tabler/icons-react';

import IconPopoverButton from '@/components/IconPopoverButton';

import type { AnchorLinkBehavior, AnchorLinkControlProps } from '../types';
import { ANCHOR_LINK_BEHAVIORS } from '../constants';

import styles from './index.scss';

/** 与标题栏其它图标同档的图标尺寸 / 线宽 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

/** 弹层宽度：一句说明 + 两档短标签，排得开又不至于空 */
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
  /** 单选组给回来的是字符串，先对回枚举里的那一档，拿不到就不动 */
  const handleChange = (value: string) => {
    const option = OPTIONS.find((item) => item.value === value);

    if (option) {
      onBehaviorChange(option.value);
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
      <Stack gap={6}>
        <Text c="dimmed" size="xs">
          点同文档链接（#锚点）时
        </Text>
        <Radio.Group onChange={handleChange} value={behavior}>
          <Stack gap={4}>
            {OPTIONS.map((option) => (
              <Radio
                classNames={{
                  body: styles.body,
                  label: styles.label,
                  labelWrapper: styles.labelWrapper,
                }}
                key={option.value}
                label={option.label}
                size="xs"
                value={option.value}
              />
            ))}
          </Stack>
        </Radio.Group>
      </Stack>
    </IconPopoverButton>
  );
};

export default AnchorLinkControl;
