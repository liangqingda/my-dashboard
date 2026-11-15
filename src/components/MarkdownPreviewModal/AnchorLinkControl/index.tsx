/**
 * 同文档链接的图标按钮：点一下在图标下方弹出两个与锚点有关的设置。
 *
 * 两组都是短句、只能二选一，所以都用单选组（一档就是一个点击动作，不用先展开再选）；
 * 尺寸收一档、标签与圆点水平居中——弹层窄，按默认 sm 的圆点 + 20px 行高会显得空。
 *
 * 落地的两个偏好：
 * 1. 点链接之后怎么办（`behavior`）：滚过去 / 弹窗打开那一块；
 * 2. 子区域预览里能前后切到哪些链接（`scope`）：全文所有链接 / 只同一处目录里的那几个。
 * 两份值都归弹窗持有（`useAnchorLinkBehavior` / `useAnchorNavScope`）——它们是跨篇记住的
 * 阅读偏好，不跟着某一篇走；这里只管按钮外观、弹层开合与把选中的值递上去。
 */

import { Divider, Radio, Stack, Text } from '@mantine/core';
import { IconAnchor } from '@tabler/icons-react';

import IconPopoverButton from '@/components/IconPopoverButton';

import type {
  AnchorLinkBehavior,
  AnchorLinkControlProps,
  AnchorNavScope,
} from '../types';
import {
  ANCHOR_LINK_BEHAVIORS,
  ANCHOR_NAV_SCOPES,
} from '../constants';

import styles from './index.scss';

/** 与标题栏其它图标同档的图标尺寸 / 线宽 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

/** 弹层宽度：两句说明 + 两组两档短标签，排得开又不至于空 */
const DROPDOWN_WIDTH = 240;

/** 点击行为两档的文案：说结果，不让人猜「弹窗打开区块」是什么意思 */
const BEHAVIOR_LABEL: Record<AnchorLinkBehavior, string> = {
  jump: '跳转到锚点',
  modal: '弹窗打开该区块',
};

/** 前后切换口径两档的文案：第一档是「全文都算」，第二档是「只算这一处目录里的链接」 */
const SCOPE_LABEL: Record<AnchorNavScope, string> = {
  all: '切换全文所有链接',
  section: '只切换同一处的链接',
};

/** 选项顺序与枚举一致，值只有一份来源（`constants.ts`） */
const BEHAVIOR_OPTIONS = ANCHOR_LINK_BEHAVIORS.map((behavior) => ({
  label: BEHAVIOR_LABEL[behavior],
  value: behavior,
}));

const SCOPE_OPTIONS = ANCHOR_NAV_SCOPES.map((scope) => ({
  label: SCOPE_LABEL[scope],
  value: scope,
}));

/** 两组共用同一套尺寸与对齐：圆点与文字水平居中、标签收一档 */
const RADIO_CLASS_NAMES = {
  body: styles.body,
  label: styles.label,
  labelWrapper: styles.labelWrapper,
};

const AnchorLinkControl = ({
  behavior,
  onChange,
  onBehaviorChange,
  onScopeChange,
  opened,
  scope,
}: AnchorLinkControlProps) => {
  /** 单选组给回来的是字符串，先对回枚举里的那一档，拿不到就不动 */
  const handleBehaviorChange = (value: string) => {
    const option = BEHAVIOR_OPTIONS.find((item) => item.value === value);

    if (option) {
      onBehaviorChange(option.value);
    }
  };

  const handleScopeChange = (value: string) => {
    const option = SCOPE_OPTIONS.find((item) => item.value === value);

    if (option) {
      onScopeChange(option.value);
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
        <Radio.Group onChange={handleBehaviorChange} value={behavior}>
          <Stack gap={4}>
            {BEHAVIOR_OPTIONS.map((option) => (
              <Radio
                classNames={RADIO_CLASS_NAMES}
                key={option.value}
                label={option.label}
                size="xs"
                value={option.value}
              />
            ))}
          </Stack>
        </Radio.Group>
        <Divider className={styles.divider} />
        <Text c="dimmed" size="xs">
          区块预览里前后切换
        </Text>
        <Radio.Group onChange={handleScopeChange} value={scope}>
          <Stack gap={4}>
            {SCOPE_OPTIONS.map((option) => (
              <Radio
                classNames={RADIO_CLASS_NAMES}
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
