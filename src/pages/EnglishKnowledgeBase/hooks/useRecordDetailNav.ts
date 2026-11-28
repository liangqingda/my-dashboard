import { useCallback, useState } from 'react';

import type { FreeModalNav } from '@/components/modals/FreeModal/types';

import type { RecordSummary } from '../types';

/** `/Review` 详情导航的入参：当前筛选结果 */
type Params = {
  /** 初始打开的记录 ID；程序坞从快照恢复时用，页面默认不传 */
  initialId?: string | null;
  /** 当前筛选结果，顺序与列表一致 */
  records: RecordSummary[];
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
 * 知识库详情的开合与翻页：位置按筛选结果算。列表是整份渲染的，
 * 翻页不需要再补渲染任何行。
 */
export const useRecordDetailNav = ({
  initialId = null,
  records,
}: Params): Result => {
  const [activeId, setActiveId] = useState<string | null>(initialId);

  /** 打开第 N 条：越界的索引直接忽略 */
  const openAt = useCallback(
    (index: number) => {
      const record = records.at(index);

      if (record === undefined) {
        return;
      }

      setActiveId(record.id);
    },
    [records],
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
  const activeTitle = activeIndex >= 0 ? records[activeIndex].title : null;

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
