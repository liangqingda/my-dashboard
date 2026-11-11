/**
 * 英语笔记预览的筛选面板（弹窗 header 的筛选按钮点开就是这个）。
 *
 * 三档范围 + 关键词，改动即时生效、不用点「应用」。
 * 面板本身无状态：条件由页面持有并持久化（见 `hooks/useNoteFilter`），
 * 这里只把改动交回去——「换一篇、刷新页面仍保留筛选」因此只有一处实现。
 */

import { ActionIcon, Group, Radio, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

import { FILTER_SCOPE_CODEC } from '../constants';

import { RADIO_STYLES, SCOPE_OPTIONS } from './constants';
import type { NoteFilterProps } from './types';

import styles from './index.scss';

/** 输入框右侧清空按钮与图标的尺寸，跟面板整体的小字号对齐 */
const ICON_SIZE = 13;
const ICON_STROKE = 1.9;

const NoteFilter = ({
  keyword,
  onKeywordChange,
  onReset,
  onScopeChange,
  scope,
}: NoteFilterProps) => {
  /** 有没有条件生效：没有时「重置」置灰，点了也没东西可清（口径与 hook 里的 active 一致） */
  const active = scope !== 'all' || keyword.trim() !== '';

  return (
    <Stack gap="sm">
      <Radio.Group
        label="筛选范围"
        onChange={(value: string) =>
          onScopeChange(FILTER_SCOPE_CODEC.decode(value))
        }
        size="xs"
        value={scope}
      >
        {/* gap 收到 4：每项自身已经有两行，项与项之间不用再留一大段 */}
        <Stack gap={4}>
          {SCOPE_OPTIONS.map((option) => (
            <Radio
              description={option.description}
              key={option.value}
              label={option.label}
              styles={RADIO_STYLES}
              value={option.value}
            />
          ))}
        </Stack>
      </Radio.Group>
      <TextInput
        label="关键词"
        leftSection={<IconSearch size={ICON_SIZE} stroke={ICON_STROKE} />}
        onChange={(event) => onKeywordChange(event.currentTarget.value)}
        placeholder="题目、答案、讲解里搜"
        rightSection={
          keyword === '' ? null : (
            <ActionIcon
              aria-label="清空关键词"
              onClick={() => onKeywordChange('')}
              size={18}
              variant="subtle"
            >
              <IconX size={ICON_SIZE} stroke={ICON_STROKE} />
            </ActionIcon>
          )
        }
        size="xs"
        value={keyword}
      />
      {/* 底部一句边界说明 + 重置：让「只筛预览」这件事当场可见 */}
      <Group gap={8} justify="space-between" wrap="nowrap">
        <Text c="dimmed" size="xs">
          只影响预览，不改笔记
        </Text>
        <UnstyledButton
          className={styles.reset}
          disabled={!active}
          onClick={onReset}
          type="button"
        >
          重置
        </UnstyledButton>
      </Group>
    </Stack>
  );
};

export default NoteFilter;
