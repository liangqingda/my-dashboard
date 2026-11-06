import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Select, SegmentedControl, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

import CategoryRail from '@/features/english-records/category-rail';
import type { CategoryRailItem } from '@/features/english-records/category-rail';
import RecordEntry from '@/features/english-records/record-entry';
import type { EnglishRecord, RecordStatus } from '@/features/english-records/types';
import {
  categoryLabel,
  categoryOrder,
  matchesQuery,
  sortRecords,
} from '@/features/english-records/utils';
import type { SortKey } from '@/features/english-records/utils';

import styles from './index.scss';

/** 状态筛选项：全部或某个具体状态 */
type StatusFilter = 'all' | RecordStatus;

/** 从记录里汇总分类条数，按仓库的分类顺序排列 */
const buildCategoryItems = (records: EnglishRecord[]): CategoryRailItem[] => {
  const counts = new Map<string, number>();

  for (const record of records) {
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: categoryLabel(key), count }))
    .toSorted((a, b) => categoryOrder(a.key) - categoryOrder(b.key));
};

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'learning', label: '学习中' },
  { value: 'familiar', label: '熟悉' },
  { value: 'mastered', label: '已掌握' },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: '最近学习' },
  { value: 'score', label: '掌握分数' },
  { value: 'due', label: '下次复习' },
];

export type RecordsLibraryProps = {
  /** 全部记录 */
  records: EnglishRecord[];
  /** 从复习清单跳转过来的记录；父组件用 nonce 触发重新挂载 */
  focus: { id: string; nonce: number } | null;
};

/** 记录库：索引栏 + 搜索筛选 + 记录列表。 */
const RecordsLibrary = ({ records, focus }: RecordsLibraryProps) => {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(focus?.id ?? null);
  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(() => buildCategoryItems(records), [records]);

  const visible = useMemo(() => {
    const filtered = records.filter(
      (record) =>
        (category === 'all' || record.category === category) &&
        (status === 'all' || record.status === status) &&
        matchesQuery(record, deferredQuery),
    );

    return sortRecords(filtered, sort);
  }, [records, category, status, sort, deferredQuery]);

  const filtered = category !== 'all' || status !== 'all' || query.trim() !== '';

  // 从复习清单跳转过来时，把目标记录滚进视野；筛选已在挂载时重置。
  useEffect(() => {
    if (!focus) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`record-${focus.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => cancelAnimationFrame(frame);
  }, [focus]);

  const resetFilters = () => {
    setCategory('all');
    setStatus('all');
    setQuery('');
  };

  return (
    <div className={styles.desk}>
      <div className={styles.railWrap}>
        <CategoryRail
          items={categories}
          onChange={setCategory}
          total={records.length}
          value={category}
        />
      </div>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <TextInput
            aria-label="搜索记录"
            className={styles.search}
            leftSection={<IconSearch size={15} stroke={1.8} />}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="搜标题、例句、标签"
            size="xs"
            value={query}
          />
          <SegmentedControl
            data={STATUS_OPTIONS}
            onChange={(value) => setStatus(value)}
            size="xs"
            value={status}
          />
          <Select
            allowDeselect={false}
            aria-label="排序方式"
            className={styles.sort}
            data={SORT_OPTIONS}
            onChange={(value) => {
              if (value) {
                setSort(value);
              }
            }}
            size="xs"
            value={sort}
          />
        </div>
        <div className={styles.countRow}>
          <span className={styles.count}>
            {filtered ? `筛选后 ${visible.length} 条` : `共 ${visible.length} 条`}
          </span>
          {filtered ? (
            <button className={styles.reset} onClick={resetFilters} type="button">
              清空筛选
            </button>
          ) : null}
        </div>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>
              {records.length === 0
                ? '这个仓库里还没有记录。'
                : '没有符合条件的记录。'}
            </p>
            <p className={styles.emptyHint}>
              {records.length === 0
                ? '在 learn-english 里新增学习记录后，点右上角的刷新就能看到。'
                : '换个关键词，或清空分类和状态筛选再找找。'}
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {visible.map((record) => (
              <li key={record.id}>
                <RecordEntry
                  expanded={expandedId === record.id}
                  highlighted={focus?.id === record.id && expandedId === record.id}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === record.id ? null : record.id,
                    )
                  }
                  record={record}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RecordsLibrary;
