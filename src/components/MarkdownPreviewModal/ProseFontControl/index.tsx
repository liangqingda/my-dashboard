/**
 * 正文字号图标按钮：点一下在图标下方弹出一块小面板，减 / 加各一档，并能一键回到默认。
 *
 * 按钮外观与弹层定位来自公共的 `IconPopoverButton`；字号值本身归弹窗
 * （`useProseFontScale`）持有——它是一份跨篇、跨会话记住的阅读偏好，不跟着某一篇走。
 */

import { ActionIcon, Button, Group, Stack, Text } from '@mantine/core';
import { IconMinus, IconPlus, IconTypography } from '@tabler/icons-react';

import IconPopoverButton from '@/components/IconPopoverButton';

import type { ProseFontControlProps } from '../types';

/** 与标题栏其它图标同档；加减两个小按钮的图标再小一号 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;
const STEP_ICON_SIZE = 14;
/** 弹层宽度：一行「标签 + 当前值」，一行两个加减按钮 + 恢复默认，正好排得开 */
const DROPDOWN_WIDTH = 208;

const ProseFontControl = ({
  onChange,
  opened,
  scale,
}: ProseFontControlProps) => {
  const { canDecrease, canIncrease, decrease, increase, offset, reset } = scale;
  const valueText = offset === 0 ? '默认' : `${offset > 0 ? '+' : ''}${offset}px`;

  return (
    <IconPopoverButton
      active={offset !== 0}
      hint={`正文字号（${valueText}）`}
      icon={<IconTypography size={ICON_SIZE} stroke={ICON_STROKE} />}
      label="调节正文字号"
      onChange={onChange}
      opened={opened}
      width={DROPDOWN_WIDTH}
    >
      <Stack gap={10}>
        <Group justify="space-between" wrap="nowrap">
          <Text c="dimmed" size="xs">
            正文字号
          </Text>
          <Text fw={600} size="xs">
            {valueText}
          </Text>
        </Group>
        <Group justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <ActionIcon
              aria-label="减小正文字号"
              disabled={!canDecrease}
              onClick={decrease}
              size="sm"
              variant="light"
            >
              <IconMinus size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
            </ActionIcon>
            <ActionIcon
              aria-label="增大正文字号"
              disabled={!canIncrease}
              onClick={increase}
              size="sm"
              variant="light"
            >
              <IconPlus size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
            </ActionIcon>
          </Group>
          <Button
            disabled={offset === 0}
            onClick={reset}
            size="compact-xs"
            variant="subtle"
          >
            恢复默认
          </Button>
        </Group>
      </Stack>
    </IconPopoverButton>
  );
};

export default ProseFontControl;
