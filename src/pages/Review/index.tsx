import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Group, ScrollArea, Skeleton, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import MenuContentLayout from '@/layouts/MenuContentLayout';
import { getErrorMessage } from '@/utils/error';
import { onPageRefresh } from '@/utils/page-refresh';

import {
  ALL_CATEGORIES,
  DEFAULT_STATUS_FILTER,
  SKELETON_ROWS,
} from './constants';
import type { StatusFilter } from './constants';
import DeleteRecordConfirm from './DeleteRecordConfirm';
import { useRecordDetailNav } from './hooks/useRecordDetailNav';
import { useReviewRecords } from './hooks/useReviewRecords';
import RecordDetailModal from './RecordDetailModal';
import RecordsTable from './RecordsTable';
import RecordsToolbar from './RecordsToolbar';
import type { RecordSummary } from './types';
import {
  buildCategoryLabels,
  categoryLabel,
  countLabel,
  describeDelete,
  filterRecords,
  searchRecords,
} from './utils/records';
import { deleteReviewRecord } from './utils/records-api';

import styles from './index.scss';

/**
 * 复习库：把 learn-english 的 learning-records / mastered-learning-records 合并成一张表，
 * 按更新时间倒序（中间件已排好）。点开看详情、右侧图标删除，取数与删除都走 Vite 中间件。
 */
const Review = () => {
  const { categories, records, loading, error, refresh, reload, removeRecord } =
    useReviewRecords();

  /** 状态筛选：默认全部，按学习推进排在学习中 / 熟悉 / 已掌握之间切换 */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    DEFAULT_STATUS_FILTER,
  );
  /** 分类筛选：空串表示全部 */
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  /** 关键词：只在列表已有的摘要字段里过滤，敲一个字符就即时生效 */
  const [keyword, setKeyword] = useState('');
  /** 等待确认删除的记录 */
  const [pendingDelete, setPendingDelete] = useState<RecordSummary | null>(null);
  /** 删除请求进行中 */
  const [deleting, setDeleting] = useState(false);

  // 页面标题栏的「刷新当前页面」：重新读取两个记录目录
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 分类键 → 中文标题：清单缺失或没声明的分类用键名兜底，不让它静默消失 */
  const categoryLabels = useMemo(
    () => buildCategoryLabels(categories),
    [categories],
  );

  /**
   * 分类下拉的选项：先放清单里未隐藏的分类，再补上「记录里出现、清单没声明」的键。
   * 这样记录仓库加分类、或清单写漏，都能在下拉里找到，不会因为筛不到而消失。
   */
  const categoryOptions = useMemo(() => {
    const declared = categories
      .filter((category) => category.hidden !== true)
      .map((category) => category.key);
    const undeclared = records
      .map((record) => record.categoryKey)
      .filter((key) => !categoryLabels.has(key));

    return [
      { label: '全部分类', value: ALL_CATEGORIES },
      ...Array.from(new Set([...declared, ...undeclared])).map((key) => ({
        label: categoryLabel(categoryLabels, key),
        value: key,
      })),
    ];
  }, [categories, categoryLabels, records]);

  /** 关键词命中的记录：标题 / 分类标题 / 记录 ID 任一处包含即命中 */
  const searchedRecords = useMemo(
    () => searchRecords(records, keyword, categoryLabels),
    [categoryLabels, keyword, records],
  );

  /** 当前筛选结果：先关键词，再状态与分类；顺序沿用中间件的更新时间倒序 */
  const visibleRecords = useMemo(
    () => filterRecords(searchedRecords, statusFilter, categoryFilter),
    [categoryFilter, searchedRecords, statusFilter],
  );

  /** 首屏骨架 / 空态 / 列表三种形态先算好，JSX 里不再叠三元 */
  const showSkeleton = loading && records.length === 0;
  const showEmpty = !showSkeleton && visibleRecords.length === 0;

  /** 列表滚动容器的视口：换筛选后把滚动位置拉回顶部，否则会停在上一份结果的中间 */
  const viewportRef = useRef<HTMLDivElement>(null);

  /** 详情的开合、翻页与计数（范围是全部筛选结果，和列表计数一致） */
  const detail = useRecordDetailNav({ records: visibleRecords });

  /**
   * 详情里正开着的那条摘要：删除要从摘要里取标题（确认框要说清删的是哪一条）。
   * 关着或记录已被筛掉时为 null，详情 header 也就不给删除入口。
   */
  const activeRecord =
    detail.activeIndex >= 0
      ? (visibleRecords[detail.activeIndex] ?? null)
      : null;

  /** 筛选项变了：滚动位置回顶、关掉详情，从新结果的第一条看起 */
  const resetList = useCallback(() => {
    detail.resetDetail();
    viewportRef.current?.scrollTo({ top: 0 });
  }, [detail]);

  /** 计数文案：筛选命中数与总数 */
  const countText = countLabel(visibleRecords.length, records.length);

  /** 点删除图标：先弹确认框，不直接删 */
  const requestDelete = useCallback((record: RecordSummary) => {
    setPendingDelete(record);
  }, []);

  /** 取消删除：请求进行中时不允许关，避免用户以为取消了、实际正在删 */
  const cancelDelete = useCallback(() => {
    setDeleting(false);
    setPendingDelete(null);
  }, []);

  /** 确认删除：删记录 → 挪走列表那一条 → 关掉可能开着的详情 */
  const confirmDelete = async () => {
    if (pendingDelete === null) {
      return;
    }

    setDeleting(true);

    try {
      const { commit } = await deleteReviewRecord(pendingDelete.id);

      removeRecord(pendingDelete.id);

      detail.closeIfDeleted(pendingDelete.id);

      const message = describeDelete(commit);

      notifications.show({
        color: commit.error ? 'yellow' : 'teal',
        message,
      });
      setPendingDelete(null);
    } catch (caught) {
      notifications.show({
        color: 'red',
        message: getErrorMessage(caught, '删除记录失败'),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MenuContentLayout fill title="复习库">
      <Stack className={styles.shell} gap="sm">
        <RecordsToolbar
          category={categoryFilter}
          categoryOptions={categoryOptions}
          countText={countText}
          keyword={keyword}
          loading={loading}
          onCategoryChange={(value) => {
            setCategoryFilter(value);
            resetList();
          }}
          onKeywordChange={(value) => {
            setKeyword(value);
            resetList();
          }}
          onStatusChange={(value) => {
            setStatusFilter(value);
            resetList();
          }}
          status={statusFilter}
          total={records.length}
        />
        {error !== null ? (
          <Alert color="red" title="读取记录失败">
            <Group gap="sm" justify="space-between" wrap="nowrap">
              <Text size="xs">{error}</Text>
              <Button onClick={refresh} size="xs" variant="light">
                重试
              </Button>
            </Group>
          </Alert>
        ) : null}

        {showSkeleton ? (
          <Stack gap={6}>
            {SKELETON_ROWS.map((row) => (
              <Skeleton height={28} key={row} />
            ))}
          </Stack>
        ) : null}

        {showEmpty ? (
          <Text className={styles.empty} size="sm">
            {records.length === 0
              ? '记录库里还没有条目'
              : '没有符合当前筛选条件的记录'}
          </Text>
        ) : null}

        {!showSkeleton && !showEmpty ? (
          <ScrollArea
            className={styles.list}
            scrollbars="y"
            type="auto"
            viewportRef={viewportRef}
          >
            <RecordsTable
              categoryLabels={categoryLabels}
              onDelete={requestDelete}
              onOpen={detail.openRecord}
              records={visibleRecords}
            />
          </ScrollArea>
        ) : null}
      </Stack>

      <RecordDetailModal
        confirming={pendingDelete !== null}
        nav={detail.nav}
        onClose={detail.closeDetail}
        onRequestDelete={
          activeRecord === null ? null : () => requestDelete(activeRecord)
        }
        recordId={detail.activeId}
        title={detail.activeTitle}
      />
      <DeleteRecordConfirm
        loading={deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        record={pendingDelete}
      />
    </MenuContentLayout>
  );
};

export default Review;
