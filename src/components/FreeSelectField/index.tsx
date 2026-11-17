/**
 * 弹层面板里的「字段组」：标题 + 一档下拉 + 下面一行口径说明。
 *
 * 面板里的下拉有一套固定口径，散在各处会各自漂：`size="xs"`、标题下补 4px、
 * **不进门户**（`comboboxProps={{ withinPortal: false }}`）——面板本身已在弹层里，
 * 下拉再套一层 Portal，列表在 popover 眼里算「外面」，点选项会先把弹层关掉、选择动作就丢了。
 *
 * 这里只统一外观与这套默认行为：选项、当前值、说明文案都由调用方给；
 * 值怎么编解码、选中之后改什么状态，也不归它（`onChange` 只回传档名）。
 */

import { Select, Stack, Text } from '@mantine/core';

import { PANEL_FIELD_STYLES } from '@/components/IconPopoverButton/constants';

import type { FreeSelectFieldProps } from './types';

const FreeSelectField = ({
  data,
  description,
  label,
  onChange,
  value,
}: FreeSelectFieldProps) => (
  <Stack gap={4}>
    <Select
      allowDeselect={false}
      comboboxProps={{ withinPortal: false }}
      data={data}
      label={label}
      onChange={(next) => {
        // 已经关掉取消选择，null 只在清空态出现，不该把「清空」当成一档选择
        if (next !== null) {
          onChange(next);
        }
      }}
      size="xs"
      styles={PANEL_FIELD_STYLES}
      value={value}
    />
    {description ? (
      <Text c="dimmed" size="xs">
        {description}
      </Text>
    ) : null}
  </Stack>
);

export default FreeSelectField;
