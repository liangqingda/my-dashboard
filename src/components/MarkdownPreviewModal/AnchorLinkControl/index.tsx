/**
 * 同文档链接的图标按钮：点一下在图标下方弹出两个与锚点有关的设置。
 *
 * 两个字段都走公共的 `FreeSelectField`（标题在上、下拉在下、选中项的口径用一行灰字补在下面），
 * 与筛选面板是同一套外观与同一条「下拉不进门户」的规矩——都收在那一个组件里，这里只给选项与说明。
 *
 * 落地的两个偏好：
 * 1. 点链接之后怎么办（`behavior`）：滚过去 / 弹窗打开那一块；
 * 2. 子区域预览里能前后切到哪些链接（`scope`）：全文所有链接 / 只同一处目录里的那几个。
 * 两份值都归弹窗持有（`useAnchorLinkBehavior` / `useAnchorNavScope`）——它们是跨篇记住的
 * 阅读偏好，不跟着某一篇走；这里只管按钮外观、弹层开合与把选中的值递上去。
 */

import { Stack } from '@mantine/core';
import { IconAnchor } from '@tabler/icons-react';

import FreeSelectField from '@/components/FreeSelectField';
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

/** 与标题栏其它图标同档的图标尺寸 / 线宽 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

/** 弹层宽度：与筛选面板同宽（272），两个字段都排得开 */
const DROPDOWN_WIDTH = 272;

/** 两档行为：档名给下拉，口径说明单列一行（塞进选项会把下拉撑宽） */
const BEHAVIOR_OPTIONS: Record<
  AnchorLinkBehavior,
  { description: string; label: string }
> = {
  jump: { description: '滚到锚点位置，左侧目录跟着高亮', label: '跳转到锚点' },
  modal: { description: '把锚点指向的那一节单独开窗', label: '弹窗打开该区块' },
};

/** 两种切换口径：同上，档名进下拉、口径说明单列一行 */
const SCOPE_OPTIONS: Record<AnchorNavScope, { description: string; label: string }> = {
  all: { description: '按链接顺序切换全文所有链接指向的区块', label: '切换全文所有链接' },
  section: { description: '只算同一处目录里的链接，如「讲解」里那两条', label: '只切换同一处链接' },
};

/** 选项顺序与枚举一致，值只有一份来源（`constants.ts`） */
const BEHAVIOR_DATA = ANCHOR_LINK_BEHAVIORS.map((behavior) => ({
  label: BEHAVIOR_OPTIONS[behavior].label,
  value: behavior,
}));

const SCOPE_DATA = ANCHOR_NAV_SCOPES.map((scope) => ({
  label: SCOPE_OPTIONS[scope].label,
  value: scope,
}));

const AnchorLinkControl = ({
  behavior,
  onChange,
  onBehaviorChange,
  onScopeChange,
  opened,
  scope,
}: AnchorLinkControlProps) => {
  /**
   * 下拉给回来的是档名文本，先对回枚举里的那一档再上报：
   * 对不上（数据与选项漂了）就当没点，不把不合法的值写进阅读偏好。
   */
  const handleBehaviorChange = (value: string) => {
    const option = BEHAVIOR_DATA.find((item) => item.value === value);

    if (option) {
      onBehaviorChange(option.value);
    }
  };

  const handleScopeChange = (value: string) => {
    const option = SCOPE_DATA.find((item) => item.value === value);

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
      <Stack gap="sm">
        <FreeSelectField
          data={BEHAVIOR_DATA}
          description={BEHAVIOR_OPTIONS[behavior].description}
          label="点链接之后"
          onChange={handleBehaviorChange}
          value={behavior}
        />
        <FreeSelectField
          data={SCOPE_DATA}
          description={SCOPE_OPTIONS[scope].description}
          label="区块预览切换范围"
          onChange={handleScopeChange}
          value={scope}
        />
      </Stack>
    </IconPopoverButton>
  );
};

export default AnchorLinkControl;
