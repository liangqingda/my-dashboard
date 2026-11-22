/**
 * 筛选弹层面板：顶部关键词按文件名模糊搜索，下方 checkbox 多选分类，改动即时写回；
 * 底部重置清掉全部条件。分类选项来自当前目录实际出现过的分类，空列表时给一句空态说明。
 */

import { Checkbox, Group, Stack, Text, UnstyledButton } from '@mantine/core';

import { PANEL_FIELD_STYLES } from '@/components/buttons/IconPopoverButton/constants';
import FreeSearchInput from '@/components/fields/FreeSearchInput';
import FreePanelFooter from '@/components/panels/FreePanelFooter';

import type { FileCategory } from '../../types';

import type { TypeFilterPanelProps } from './types';

import styles from './index.scss';

const TypeFilterPanel = ({
  keyword,
  onChange,
  onKeywordChange,
  onReset,
  options,
  selected,
}: TypeFilterPanelProps) => {
  const toggle = (value: FileCategory) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  /** 有没有条件生效：没有时「重置」置灰，点了也没东西可清 */
  const active = selected.length > 0 || keyword.trim() !== '';

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

      {options.length === 0 ? (
        <Text c="dimmed" size="xs">
          当前目录没有可筛选的文件
        </Text>
      ) : (
        <Stack gap={2}>
          {options.map((option) => (
            <UnstyledButton
              className={styles.row}
              key={option.value}
              onClick={() => toggle(option.value)}
            >
              <Group gap="xs" wrap="nowrap">
                <Checkbox checked={selected.includes(option.value)} readOnly size="xs" />
                <span>{option.label}</span>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      )}

      <FreePanelFooter
        disabled={!active}
        hint="只过滤文件，不影响文件夹"
        onReset={onReset}
      />
    </Stack>
  );
};

export default TypeFilterPanel;
