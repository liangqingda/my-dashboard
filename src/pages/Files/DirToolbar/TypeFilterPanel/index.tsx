/**
 * 类型筛选弹层面板：checkbox 多选分类，改动即时写回已选列表；底部重置清掉全部条件。
 * 选项来自当前目录实际出现过的分类，空列表时给一句空态说明。
 */

import { Checkbox, Group, Stack, Text, UnstyledButton } from '@mantine/core';

import FreePanelFooter from '@/components/panels/FreePanelFooter';

import type { FileCategory } from '../../types';

import type { TypeFilterPanelProps } from './types';

import styles from './index.scss';

const TypeFilterPanel = ({ onChange, options, selected }: TypeFilterPanelProps) => {
  const toggle = (value: FileCategory) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <Stack gap="sm">
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
        disabled={selected.length === 0}
        hint="只过滤文件，不影响文件夹"
        onReset={() => onChange([])}
      />
    </Stack>
  );
};

export default TypeFilterPanel;
