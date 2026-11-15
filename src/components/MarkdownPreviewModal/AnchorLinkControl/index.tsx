/**
 * 同文档链接的图标按钮：点一下在图标下方弹出两个与锚点有关的设置。
 *
 * 与筛选面板同一套外观（`NoteFilter`）：字段标题在上、下拉在下、选中项的口径用一行说明补在下面；
 * 因此这里也用 `Select`（`size="xs"`、标题下留 4px、下拉不进门户），不手写单选组。
 * 下拉**不放进门户**（`comboboxProps={{ withinPortal: false }}`）：门户里的列表在 popover 看来是
 * 「外面」，点选项会先把弹层关掉，选择动作就丢了。
 *
 * 落地的两个偏好：
 * 1. 点链接之后怎么办（`behavior`）：滚过去 / 弹窗打开那一块；
 * 2. 子区域预览里能前后切到哪些链接（`scope`）：全文所有链接 / 只同一处目录里的那几个。
 * 两份值都归弹窗持有（`useAnchorLinkBehavior` / `useAnchorNavScope`）——它们是跨篇记住的
 * 阅读偏好，不跟着某一篇走；这里只管按钮外观、弹层开合与把选中的值递上去。
 */

import { Select, Stack, Text } from '@mantine/core';
import { IconAnchor } from '@tabler/icons-react';
import type { CSSProperties } from 'react';

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

/**
 * 字段标题与下拉之间补 4px：组件库只靠标题行高留白，视觉上贴着控件。
 * 与筛选面板的 `FIELD_STYLES` 同一份口径。
 */
const FIELD_STYLES: Record<'label', CSSProperties> = {
  label: { marginBottom: 4 },
};

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
  /** 下拉给回来的是字符串或 null，先对回枚举里的那一档，拿不到就不动 */
  const handleBehaviorChange = (value: string | null) => {
    const option = BEHAVIOR_DATA.find((item) => item.value === value);

    if (option) {
      onBehaviorChange(option.value);
    }
  };

  const handleScopeChange = (value: string | null) => {
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
        <Stack gap={4}>
          <Select
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
            data={BEHAVIOR_DATA}
            label="点链接之后"
            onChange={handleBehaviorChange}
            size="xs"
            styles={FIELD_STYLES}
            value={behavior}
          />
          <Text c="dimmed" size="xs">
            {BEHAVIOR_OPTIONS[behavior].description}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Select
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
            data={SCOPE_DATA}
            label="区块预览切换范围"
            onChange={handleScopeChange}
            size="xs"
            styles={FIELD_STYLES}
            value={scope}
          />
          <Text c="dimmed" size="xs">
            {SCOPE_OPTIONS[scope].description}
          </Text>
        </Stack>
      </Stack>
    </IconPopoverButton>
  );
};

export default AnchorLinkControl;
