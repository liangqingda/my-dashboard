/**
 * 英语列表的筛选面板（页面 header 的筛选按钮点开就是这个）。
 *
 * 时间范围一档下拉 + 指定日期时出现的日历 + 分类一档下拉，改动即时生效、不用点「应用」。
 * 面板本身无状态：条件由页面持有并持久化（见 `hooks/useNotesFilter`），
 * 这里只把改动交回去——「刷新页面仍沿用上次的条件」因此只有一处实现。
 * 与预览弹窗里的正文筛选（`NoteFilter`）互不相干：这一份只决定列表显示哪些笔记。
 *
 * 日历用 `@mantine/dates` 的 `DatePicker`（内联渲染、不带自己的弹层）：
 * 面板本身就是一个弹层，里面再套一层 Portal 会被判成「点在外面」而把面板收掉。
 */

import { Button, Group, Select, Stack, Text } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';

import { ALL_CATEGORIES, NOTES_FILTER_RANGE_CODEC, UNCATEGORIZED_CATEGORY } from '../constants';

import { FIELD_STYLES, RANGE_OPTIONS, RANGE_SELECT_DATA } from './constants';
import type { NotesFilterProps } from './types';

import styles from './index.scss';

const NotesFilter = ({
  categoryKey,
  categories,
  date,
  onCategoryChange,
  onDateChange,
  onRangeChange,
  onReset,
  range,
}: NotesFilterProps) => {
  /** 收起后那一行口径说明：「指定日期」这档随选中的日期变，其余取常量里的文案 */
  const rangeDescription = RANGE_OPTIONS.find(
    (option) => option.value === range,
  )?.description;
  const selectedDay = dayjs(date);
  const rangeHint =
    range === 'date' && selectedDay.isValid()
      ? `只留 ${selectedDay.format('YYYY/MM/DD')} 更新过的笔记`
      : (rangeDescription ?? '');
  /** 分类下拉的数据：第一项是「全部分类」，其余来自记录仓库的分类清单 */
  const categoryData = [
    { label: '全部分类', value: ALL_CATEGORIES },
    ...categories.map((category) => ({
      label: category.label,
      // 空键是「未分类」：状态里的空串另有含义（不按分类筛），这里换成占位值
      value: category.key === '' ? UNCATEGORIZED_CATEGORY : category.key,
    })),
  ];
  /** 当前分类在下拉里的取值：空串（不按分类筛）落回「全部分类」 */
  const categoryValue = categoryKey === '' ? ALL_CATEGORIES : categoryKey;
  /** 有没有条件生效：没有时「重置」置灰，点了也没东西可清 */
  const active = range !== 'all' || categoryKey !== '';

  return (
    <Stack gap="sm">
      <Stack gap={4}>
        <Select
          allowDeselect={false}
          // 面板本身已在弹层里，下拉再套一层 Portal 会被当成「点在外面」把面板关掉
          comboboxProps={{ withinPortal: false }}
          data={RANGE_SELECT_DATA}
          label="时间范围"
          onChange={(value) => {
            if (value !== null) {
              onRangeChange(NOTES_FILTER_RANGE_CODEC.decode(value));
            }
          }}
          size="xs"
          styles={FIELD_STYLES}
          value={range}
        />
        <Text c="dimmed" size="xs">
          {rangeHint}
        </Text>
      </Stack>

      {/* 选了「指定日期」就把日历摊在下面：点一档就能直接选哪一天，不用再点一次 */}
      {range === 'date' ? (
        <DatePicker
          className={styles.datePicker}
          onChange={(value) => {
            if (value !== null) {
              onDateChange(value);
            }
          }}
          size="xs"
          value={selectedDay.isValid() ? date : null}
        />
      ) : null}

      <Select
        allowDeselect={false}
        comboboxProps={{ withinPortal: false }}
        data={categoryData}
        label="分类"
        onChange={(value) => {
          if (value !== null) {
            onCategoryChange(value === ALL_CATEGORIES ? '' : value);
          }
        }}
        size="xs"
        styles={FIELD_STYLES}
        value={categoryValue}
      />

      {/* 底部一句边界说明 + 重置：让「只筛列表」这件事当场可见 */}
      <Group gap={8} justify="space-between" wrap="nowrap">
        <Text c="dimmed" size="xs">
          只影响列表，不动笔记
        </Text>
        <Button
          disabled={!active}
          onClick={onReset}
          size="compact-xs"
          variant="subtle"
        >
          重置
        </Button>
      </Group>
    </Stack>
  );
};

export default NotesFilter;
