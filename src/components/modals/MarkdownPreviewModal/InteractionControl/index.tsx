/**
 * 「文档内交互方式」的图标按钮：点一下在图标下方弹出两组与「点一下会怎样」有关的设置。
 *
 * 字段都走公共的 `FreeSelectField`（标题在上、下拉在下、选中项的说明用一行灰字补在下面），
 * 与筛选面板是同一套外观与同一条「下拉不进门户」的规矩——都收在那一个组件里，
 * 这里只给选项、分组与说明文案。
 *
 * 分组头单独一套样式（`index.scss` 的 `groupTitle` 等）：11px 淡色小标签 + 主色竖标 + 右侧横线，
 * 与字段标题（组件库默认字号、正文墨色）明显分开两档——两者同档时读起来像并列的四个字段。
 *
 * 两组偏好（都是跨篇记住的阅读偏好，写在 localStorage）：
 * 1. 同文档链接（`[文字](#锚点)`）：点链接之后滚过去 / 弹窗读那一节；子区域预览能前后切到哪些链接；
 * 2. 折叠块（`<details>`，笔记里的场景对话原文、故事原文）：点标题之后原地展开 / 弹窗读。
 *    只有一个折叠块里真有内容时这一组才有意义，所以文档里没有折叠块时整组不渲染。
 *
 * 值怎么存归弹窗（`useAnchorLinkBehavior` / `useAnchorNavScope` / `useDetailsBlockBehavior`），
 * 这里只管按钮外观、弹层开合与把选中的值递上去。
 */

import { Box, Group, Stack, Text } from '@mantine/core';
import { IconHandClick } from '@tabler/icons-react';

import FreeSelectField from '@/components/fields/FreeSelectField';
import IconPopoverButton from '@/components/buttons/IconPopoverButton';

import type {
  AnchorLinkBehavior,
  AnchorNavScope,
  DetailsBlockBehavior,
  DetailsNavScope,
  InteractionControlProps,
} from '../types';
import {
  ANCHOR_LINK_BEHAVIORS,
  ANCHOR_NAV_SCOPES,
  DETAILS_BLOCK_BEHAVIORS,
  DETAILS_NAV_SCOPES,
} from '../constants';

import styles from './index.scss';

/** 与标题栏其它图标同档的图标尺寸 / 线宽 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

/** 弹层宽度：与筛选面板同宽（272），两组字段都排得开 */
const DROPDOWN_WIDTH = 272;

/** 两档链接行为：档名给下拉，口径说明单列一行（塞进选项会把下拉撑宽） */
const ANCHOR_BEHAVIOR_OPTIONS: Record<
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

/** 两档折叠块行为：原地展开保留浏览器默认，弹窗预览把这一段单独读 */
const DETAILS_BEHAVIOR_OPTIONS: Record<
  DetailsBlockBehavior,
  { description: string; label: string }
> = {
  expand: { description: '在正文里直接展开这一段，与浏览器默认行为一致', label: '原地展开' },
  modal: { description: '叠一层弹窗单独读，正文里的折叠块保持收着', label: '弹窗预览' },
};

/** 两种折叠块切换口径：档名进下拉、口径说明单列一行 */
const DETAILS_SCOPE_OPTIONS: Record<
  DetailsNavScope,
  { description: string; label: string }
> = {
  all: { description: '按正文顺序切换全文所有折叠块', label: '切换全文所有折叠块' },
  section: {
    description: '只算同一个标题小节下的折叠块，如「场景对话」那两块',
    label: '只切换同一小节',
  },
};

/** 选项顺序与枚举一致，值只有一份来源（`constants.ts`） */
const ANCHOR_BEHAVIOR_DATA = ANCHOR_LINK_BEHAVIORS.map((behavior) => ({
  label: ANCHOR_BEHAVIOR_OPTIONS[behavior].label,
  value: behavior,
}));

const SCOPE_DATA = ANCHOR_NAV_SCOPES.map((scope) => ({
  label: SCOPE_OPTIONS[scope].label,
  value: scope,
}));

const DETAILS_BEHAVIOR_DATA = DETAILS_BLOCK_BEHAVIORS.map((behavior) => ({
  label: DETAILS_BEHAVIOR_OPTIONS[behavior].label,
  value: behavior,
}));

const DETAILS_SCOPE_DATA = DETAILS_NAV_SCOPES.map((scope) => ({
  label: DETAILS_SCOPE_OPTIONS[scope].label,
  value: scope,
}));

const InteractionControl = ({
  anchorBehavior,
  anchorScope,
  detailsBehavior,
  detailsScope,
  hasAnchorLinks,
  hasDetailBlocks,
  onAnchorBehaviorChange,
  onAnchorScopeChange,
  onChange,
  onDetailsBehaviorChange,
  onDetailsScopeChange,
  opened,
}: InteractionControlProps) => {
  /**
   * 下拉给回来的是档名文本，先对回枚举里的那一档再上报：
   * 对不上（数据与选项漂了）就当没点，不把不合法的值写进阅读偏好。
   */
  const pickValue = <Value extends string>(
    data: readonly { label: string; value: Value }[],
    value: string,
    report: (next: Value) => void,
  ) => {
    const option = data.find((item) => item.value === value);

    if (option) {
      report(option.value);
    }
  };

  /** 有一组真按「弹窗预览」走时图标换主色，与筛选生效同一个表达 */
  const active = anchorBehavior === 'modal' || detailsBehavior === 'modal';

  return (
    <IconPopoverButton
      active={active}
      hint={active ? '文档内交互方式（有弹窗预览）' : '文档内交互方式'}
      icon={<IconHandClick size={ICON_SIZE} stroke={ICON_STROKE} />}
      label="文档内交互方式"
      onChange={onChange}
      opened={opened}
      width={DROPDOWN_WIDTH}
    >
      <Stack gap={16}>
        {hasAnchorLinks ? (
          <Stack gap={8}>
            <Group gap={6} wrap="nowrap">
              <Box className={styles.groupMark} />
              <Text className={styles.groupTitle}>同文档链接</Text>
              <Box className={styles.groupRule} />
            </Group>
            <FreeSelectField
              data={ANCHOR_BEHAVIOR_DATA}
              description={ANCHOR_BEHAVIOR_OPTIONS[anchorBehavior].description}
              label="点链接之后"
              onChange={(value) =>
                pickValue(ANCHOR_BEHAVIOR_DATA, value, onAnchorBehaviorChange)
              }
              value={anchorBehavior}
            />
            <FreeSelectField
              data={SCOPE_DATA}
              description={SCOPE_OPTIONS[anchorScope].description}
              label="区块预览切换范围"
              onChange={(value) =>
                pickValue(SCOPE_DATA, value, onAnchorScopeChange)
              }
              value={anchorScope}
            />
          </Stack>
        ) : null}
        {hasDetailBlocks ? (
          <Stack gap={8}>
            <Stack gap={4}>
              <Group gap={6} wrap="nowrap">
                <Box className={styles.groupMark} />
                <Text className={styles.groupTitle}>折叠块</Text>
                <Box className={styles.groupRule} />
              </Group>
              <Text className={styles.groupNote}>
                场景对话原文、故事原文这类折叠块
              </Text>
            </Stack>
            <FreeSelectField
              data={DETAILS_BEHAVIOR_DATA}
              description={DETAILS_BEHAVIOR_OPTIONS[detailsBehavior].description}
              label="点标题之后"
              onChange={(value) =>
                pickValue(DETAILS_BEHAVIOR_DATA, value, onDetailsBehaviorChange)
              }
              value={detailsBehavior}
            />
            <FreeSelectField
              data={DETAILS_SCOPE_DATA}
              description={DETAILS_SCOPE_OPTIONS[detailsScope].description}
              label="折叠块预览切换范围"
              onChange={(value) =>
                pickValue(DETAILS_SCOPE_DATA, value, onDetailsScopeChange)
              }
              value={detailsScope}
            />
          </Stack>
        ) : null}
      </Stack>
    </IconPopoverButton>
  );
};

export default InteractionControl;
