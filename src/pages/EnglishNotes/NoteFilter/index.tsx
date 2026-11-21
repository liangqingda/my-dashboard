/**
 * 英语笔记预览的筛选面板（弹窗 header 的筛选按钮点开就是这个）。
 *
 * 关键词一档输入 + 范围一档下拉，改动即时生效、不用点「应用」。
 * 面板本身无状态：条件由页面持有并持久化（见 `hooks/useNoteFilter`），
 * 这里只把改动交回去——「换一篇、刷新页面仍保留筛选」因此只有一处实现。
 *
 * 关键词输入框挂回车导航：Enter 下一个命中、Shift+Enter 上一个，由弹窗层给的
 * `navigation` 滚动定位；当前 / 总数在输入框下方一行给出。
 *
 * 字段组与底部「说明 + 重置」用公共的 `FreeSelectField` / `FreePanelFooter`：
 * 这一页只定「筛什么」（全部 / 只看讲解 / 只看习题 / 只看错题 + 关键词），
 * 下拉外观、字段间距、底部那行不归这里。
 */

import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { ActionIcon, Stack, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

import FreePanelFooter from '@/components/panels/FreePanelFooter';
import FreeSelectField from '@/components/fields/FreeSelectField';
import { PANEL_FIELD_STYLES } from '@/components/buttons/IconPopoverButton/constants';
import type { MarkdownFilterNavigation } from '@/components/modals/MarkdownPreviewModal';

import { FILTER_SCOPE_CODEC } from '../constants';

import { SCOPE_OPTIONS, SCOPE_SELECT_DATA } from './constants';
import type { NoteFilterProps } from './types';

/** 输入框右侧清空按钮与图标的尺寸，跟面板整体的小字号对齐 */
const ICON_SIZE = 13;
const ICON_STROKE = 1.9;

/** 命中计数文案：无关键词不显示；有词但零命中显示「无匹配」 */
const resolveMatchHint = (
  navigation: MarkdownFilterNavigation | null,
  keyword: string,
): string => {
  if (!navigation || keyword.trim() === '') {
    return '';
  }

  if (navigation.total === 0) {
    return '无匹配';
  }

  return `${navigation.current + 1} / ${navigation.total}`;
};

const NoteFilter = ({
  keyword,
  navigation,
  onKeywordChange,
  onReset,
  onScopeChange,
  scope,
}: NoteFilterProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  /** 面板随弹层挂载即聚焦关键词输入框，点开就能直接打字 */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /** 有没有条件生效：没有时「重置」置灰，点了也没东西可清（口径与 hook 里的 active 一致） */
  const active = scope !== 'all' || keyword.trim() !== '';
  /** 收起时只留一档名字，选中的这一档到底筛掉什么，靠这句单行说明补上 */
  const scopeHint = SCOPE_OPTIONS.find(
    (option) => option.value === scope,
  )?.description;
  /** 命中计数：无关键词不显示；有词但零命中显示「无匹配」 */
  const matchHint = resolveMatchHint(navigation, keyword);

  /** Enter 下一个、Shift+Enter 上一个；没有可切换的命中时不动作 */
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !navigation || navigation.total === 0) {
      return;
    }

    event.preventDefault();

    if (event.shiftKey) {
      navigation.prev();
    } else {
      navigation.next();
    }
  };

  return (
    <Stack gap="sm">
      <TextInput
        description={matchHint === '' ? undefined : matchHint}
        label="关键词"
        leftSection={<IconSearch size={ICON_SIZE} stroke={ICON_STROKE} />}
        onChange={(event) => onKeywordChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="题目、答案、讲解里搜"
        ref={inputRef}
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
      <FreeSelectField
        data={SCOPE_SELECT_DATA}
        description={scopeHint}
        label="筛选范围"
        onChange={(value) => onScopeChange(FILTER_SCOPE_CODEC.decode(value))}
        value={scope}
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
