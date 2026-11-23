/**
 * 筛选弹层面板：顶部关键词按名称模糊搜索，下方是「全部 + 分类」列表，改动即时生效。
 * 「全部」与分类列表之间用分割线隔开：多选模式下「全部」是复选框（全勾选中、勾一部分半选、
 * 一个没勾未选），单选模式下是单选框；多选点某一类即勾 / 取消，单选一次只能有一类。
 * 底部重置把分类退回全选并清空关键词。
 */

import {
  Checkbox,
  Divider,
  Group,
  Radio,
  Stack,
  UnstyledButton,
} from '@mantine/core';

import { PANEL_FIELD_STYLES } from '@/components/buttons/IconPopoverButton/constants';
import FreeSearchInput from '@/components/fields/FreeSearchInput';
import FreePanelFooter from '@/components/panels/FreePanelFooter';

import {
  FILE_CATEGORY_LABELS,
  FILE_CATEGORY_VALUES,
  TYPE_FILTER_ALL_LABEL,
} from '../../constants';
import type { FileCategory } from '../../types';
import { isTypeFilterAllSelected } from '../../utils/files';

import type { TypeFilterPanelProps } from './types';

import styles from './index.scss';

/** 单选时某一类是否被选中：只有恰好一类且就是它 */
const isSingleChoice = (selected: FileCategory[], value: FileCategory): boolean =>
  selected.length === 1 && selected[0] === value;

const TypeFilterPanel = ({
  mode,
  selected,
  keyword,
  onChange,
  onKeywordChange,
  onReset,
}: TypeFilterPanelProps) => {
  const allSelected = isTypeFilterAllSelected(selected);
  const partiallySelected = selected.length > 0 && !allSelected;
  /** 有没有条件生效：没全选或有关键词时「重置」可点 */
  const filterActive = !allSelected || keyword.trim() !== '';

  /** 点某一类：多选就勾 / 取消，单选就换成这一类 */
  const pick = (value: FileCategory) => {
    if (mode === 'single') {
      onChange([value]);

      return;
    }

    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  /** 点「全部」：多选时全勾 / 全清，单选时直接全选 */
  const pickAll = () => {
    onChange(mode === 'multi' && allSelected ? [] : [...FILE_CATEGORY_VALUES]);
  };

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
        <UnstyledButton className={styles.row} onClick={pickAll}>
          <Group gap="xs" wrap="nowrap">
            {mode === 'multi' ? (
              <Checkbox
                checked={allSelected}
                indeterminate={partiallySelected}
                readOnly
                size="xs"
              />
            ) : (
              <Radio checked={allSelected} readOnly size="xs" />
            )}
            <span>{TYPE_FILTER_ALL_LABEL}</span>
          </Group>
        </UnstyledButton>

        <Divider my={4} size="xs" />

        {FILE_CATEGORY_VALUES.map((value) => (
          <UnstyledButton
            className={styles.row}
            key={value}
            onClick={() => pick(value)}
          >
            <Group gap="xs" wrap="nowrap">
              {mode === 'multi' ? (
                <Checkbox checked={selected.includes(value)} readOnly size="xs" />
              ) : (
                <Radio checked={isSingleChoice(selected, value)} readOnly size="xs" />
              )}
              <span>{FILE_CATEGORY_LABELS[value]}</span>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>

      <FreePanelFooter
        disabled={!filterActive}
        hint="勾选的类型才显示；App 不露出文件夹，可在设置里切换多选 / 单选"
        onReset={onReset}
      />
    </Stack>
  );
};

export default TypeFilterPanel;
