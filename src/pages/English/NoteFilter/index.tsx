/**
 * 英语笔记预览的筛选面板（弹窗 header 的筛选按钮点开就是这个）。
 *
 * 范围一档下拉 + 关键词，改动即时生效、不用点「应用」。
 * 面板本身无状态：条件由页面持有并持久化（见 `hooks/useNoteFilter`），
 * 这里只把改动交回去——「换一篇、刷新页面仍保留筛选」因此只有一处实现。
 *
 * 字段组与底部「说明 + 重置」用公共的 `FreeSelectField` / `FreePanelFooter`：
 * 这一页只定「筛什么」（全部 / 只看习题 / 只看错题 + 关键词），
 * 下拉外观、字段间距、底部那行不归这里。
 */

import { ActionIcon, Stack, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

import FreePanelFooter from '@/components/FreePanelFooter';
import FreeSelectField from '@/components/FreeSelectField';
import { PANEL_FIELD_STYLES } from '@/components/IconPopoverButton/constants';

import { FILTER_SCOPE_CODEC } from '../constants';

import { SCOPE_OPTIONS, SCOPE_SELECT_DATA } from './constants';
import type { NoteFilterProps } from './types';

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
  /** 收起时只留一档名字，选中的这一档到底筛掉什么，靠这句单行说明补上 */
  const scopeHint = SCOPE_OPTIONS.find((option) => option.value === scope)?.description;

  return (
    <Stack gap="sm">
      <FreeSelectField
        data={SCOPE_SELECT_DATA}
        description={scopeHint}
        label="筛选范围"
        onChange={(value) => onScopeChange(FILTER_SCOPE_CODEC.decode(value))}
        value={scope}
      />
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
        styles={PANEL_FIELD_STYLES}
        value={keyword}
      />
      {/* 底部一句边界说明 + 重置：让「只筛预览」这件事当场可见 */}
      <FreePanelFooter
        disabled={!active}
        hint="只影响预览，不改笔记"
        onReset={onReset}
      />
    </Stack>
  );
};

export default NoteFilter;
