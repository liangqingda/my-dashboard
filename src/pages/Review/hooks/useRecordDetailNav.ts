import { useCallback, useState } from 'react';

import type { FreeModalNav } from '@/components/FreeModal/types';

import type { RecordSummary } from '../types';

/** `/Review` 详情导航的入参：列表结果、首屏行数与「补渲染」回调都由页面给 */
type Params = {
  /** 当前筛选结果（全量，含还没渲染出来的行） */
  records: RecordSummary[];
  /** 首屏行数（视口高度算出来的） */
  initialRows: number;
  /** 让第 N 行进入渲染范围：翻页翻到后面的条目时调用 */
  ensureRows: (index: number) => void;
};

/** 详情导航对外暴露的状态与动作 */
type Result = {
  /** 当前打开详情的记录 ID；null 表示关着 */
  activeId: string | null;
  /** 它在筛选结果里的位置，-1 表示关着 */
  activeIndex: number;
  /** 详情弹窗标题：取列表摘要，不等详情回来 */
  activeTitle: string | null;
  /** 上一个 / 下一个与计数（范围是全部筛选结果，和列表计数一致） */
  nav: FreeModalNav;
  /** 点击整行 / 标题 */
  openRecord: (record: RecordSummary) => void;
  /** 关掉详情 */
  closeDetail: () => void;
  /** 筛选条件变了：连详情一起重置 */
  resetDetail: () => void;
  /** 删掉的正好是开着的这一条时，把详情关掉 */
  closeIfDeleted: (id: string) => void;
};

/**
 * 复习库详情的开合与翻页：位置按筛选结果全量算，翻到还没渲染的行时
 * 先把渲染行数补到它那一行，回到列表时那一条才在。
 */
export const useRecordDetailNav = ({
  ensureRows,
  initialRows,
  records,
}: Params): Result => {
  const [activeId, setActiveId] = useState<string | null>(null);

  /** 打开第 N 条：越界的索引直接忽略 */
  const openAt = useCallback(
    (index: number) => {
      const record = records.at(index);

      if (record === undefined) {
        return;
      }

      setActiveId(record.id);

      const needed = index + 1 - initialRows;

      if (needed > 0) {
        ensureRows(index);
      }
    },
    [ensureRows, initialRows, records],
  );

  const openRecord = useCallback(
    (record: RecordSummary) => {
      const index = records.findIndex((item) => item.id === record.id);

      openAt(index < 0 ? 0 : index);
    },
    [openAt, records],
  );

  const closeDetail = useCallback(() => {
    setActiveId(null);
  }, []);

  const resetDetail = closeDetail;

  const closeIfDeleted = useCallback((id: string) => {
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const activeIndex =
    activeId === null
      ? -1
      : records.findIndex((record) => record.id === activeId);
  const activeTitle =
    activeIndex >= 0 ? records[activeIndex].title : null;

  const nav: FreeModalNav = {
    index: activeIndex + 1,
    nextLabel: '下一条',
    onNext:
      activeIndex >= 0 && activeIndex < records.length - 1
        ? () => openAt(activeIndex + 1)
        : null,
    onPrevious: activeIndex > 0 ? () => openAt(activeIndex - 1) : null,
    previousLabel: '上一条',
    total: records.length,
  };

  return {
    activeId,
    activeIndex,
    activeTitle,
    closeDetail,
    closeIfDeleted,
    nav,
    openRecord,
    resetDetail,
  };
};
