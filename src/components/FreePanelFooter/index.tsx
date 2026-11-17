/**
 * 弹层面板底部的一行收尾：左边一句「这块筛选只影响什么」，右边「重置」。
 *
 * 两处面板（预览弹窗的正文筛选、英语列表的笔记筛选）原本各写一遍，
 * 外观还分叉了——一个手写 `UnstyledButton` + 自定义 scss，一个用组件库 `Button`。
 * 现在统一走组件库的 `Button variant="subtle" size="compact-xs"`，
 * 这里只管排布、置灰口径与那句边界说明的位置；文案与动作由调用方给。
 */

import { Button, Group, Text } from '@mantine/core';

import type { FreePanelFooterProps } from './types';

const FreePanelFooter = ({ disabled, hint, onReset }: FreePanelFooterProps) => (
  <Group gap={8} justify="space-between" wrap="nowrap">
    <Text c="dimmed" size="xs">
      {hint}
    </Text>
    <Button
      disabled={disabled}
      onClick={onReset}
      size="compact-xs"
      type="button"
      variant="subtle"
    >
      重置
    </Button>
  </Group>
);

export default FreePanelFooter;
