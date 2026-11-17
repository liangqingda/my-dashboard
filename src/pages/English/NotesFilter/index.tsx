/**
 * 英语列表的筛选面板（页面 header 的筛选按钮点开就是这个）。
 *
 * 时间范围一档下拉 + 指定日期时出现的日历 + 分类一档下拉，改动即时生效、不用点「应用」。
 * 面板本身无状态：条件由页面持有并持久化（见 `hooks/useNotesFilter`），
 * 这里只把改动交回去——「刷新页面仍沿用上次的条件」因此只有一处实现。
 * 与预览弹窗里的正文筛选（`NoteFilter`）互不相干：这一份只决定列表显示哪些笔记。
 *
 * 两个下拉与底部收尾都走公共的 `FreeSelectField` / `FreePanelFooter`，
 * 这一页只定「筛什么」。日历用 `@mantine/dates` 的 `DatePicker`（内联渲染、不带自己的弹层）：
 * 面板本身就是一个弹层，里面再套一层 Portal 会被判成「点在外面」而把面板收掉。
 */

import { Stack } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';

import FreePanelFooter from '@/components/FreePanelFooter';
import FreeSelectField from '@/components/FreeSelectField';

import { ALL_CATEGORIES, NOTES_FILTER_RANGE_CODEC, UNCATEGORIZED_CATEGORY } from '../constants';

import { RANGE_OPTIONS, RANGE_SELECT_DATA } from './constants';
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
      <FreeSelectField
        data={RANGE_SELECT_DATA}
        description={rangeHint}
        label="时间范围"
        onChange={(value) => onRangeChange(NOTES_FILTER_RANGE_CODEC.decode(value))}
        value={range}
      />

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

      <FreeSelectField
        data={categoryData}
        label="分类"
        onChange={(value) =>
          onCategoryChange(value === ALL_CATEGORIES ? '' : value)
        }
        value={categoryValue}
      />

      {/* 底部一句边界说明 + 重置：让「只筛列表」这件事当场可见 */}
      <FreePanelFooter
        disabled={!active}
        hint="只影响列表，不动笔记"
        onReset={onReset}
      />
    </Stack>
  );
};

export default NotesFilter;
