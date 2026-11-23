/**
 * 筛选弹层面板：顶部关键词按名称模糊搜索，下方是「全部 + 分类」单选列表，点哪一项即时生效；
 * 底部重置把档位退回「全部」并清空关键词。档位是页面固定的，默认「全部」。
 * 单选口径：选「App」只剩应用条目（文件夹一并隐藏），选其它类只留该类文件与含该类文件的文件夹。
 */

import { Group, Radio, Stack, UnstyledButton } from '@mantine/core';

import { PANEL_FIELD_STYLES } from '@/components/buttons/IconPopoverButton/constants';
import FreeSearchInput from '@/components/fields/FreeSearchInput';
import FreePanelFooter from '@/components/panels/FreePanelFooter';

import {
  FILE_CATEGORY_OPTIONS,
  TYPE_FILTER_ALL,
  TYPE_FILTER_ALL_LABEL,
} from '../../constants';
import type { TypeFilterValue } from '../../types';

import type { TypeFilterPanelProps } from './types';

import styles from './index.scss';

/** 列表项：`全部` 在最上面，其后按固定的分类顺序 */
const FILTER_ROWS: { label: string; value: TypeFilterValue }[] = [
  { label: TYPE_FILTER_ALL_LABEL, value: TYPE_FILTER_ALL },
  ...FILE_CATEGORY_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  })),
];

const TypeFilterPanel = ({
  active,
  keyword,
  onChange,
  onKeywordChange,
  onReset,
}: TypeFilterPanelProps) => {
  /** 有没有条件生效：没选「全部」或有关键词时「重置」可点 */
  const filterActive = active !== TYPE_FILTER_ALL || keyword.trim() !== '';

  return (
    <Stack gap="sm">
      <FreeSearchInput
        ariaLabel="按文件名搜索"
        autoFocus
        clearLabel="清空关键词"
        label="关键词"
        onChange={onKeywordChange}
        placeholder="按文件名搜"
        styles={PANEL_FIELD_STYLES}
        value={keyword}
      />

      <Stack gap={2}>
        {FILTER_ROWS.map((row) => (
          <UnstyledButton
            className={styles.row}
            key={row.value}
            onClick={() => onChange(row.value)}
          >
            <Group gap="xs" wrap="nowrap">
              <Radio checked={active === row.value} readOnly size="xs" />
              <span>{row.label}</span>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>

      <FreePanelFooter
        disabled={!filterActive}
        hint="单选；选 App 只列应用条目，文件夹一并隐藏"
        onReset={onReset}
      />
    </Stack>
  );
};

export default TypeFilterPanel;
