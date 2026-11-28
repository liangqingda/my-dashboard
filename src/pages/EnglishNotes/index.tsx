import { useCallback, useEffect, useMemo, useState } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';

import FilterButton from '@/components/buttons/FilterButton';
import FreeIconAction from '@/components/buttons/FreeIconAction';
import MenuContentLayout from '@/layouts/MenuContentLayout';
import { onPageRefresh } from '@/utils/page-refresh';
import { cx } from '@/utils/cx';

import type { NoteSummary, NotesSort } from './types';
import { DEFAULT_NOTE_SORT } from './constants';
import { useActiveNote } from './hooks/useActiveNote';
import { useEnglishNotes } from './hooks/useEnglishNotes';
import { useNotePreviewFilter } from './hooks/useNotePreviewFilter';
import { useNotesFilter } from './hooks/useNotesFilter';
import { useNotesViewMode } from './hooks/useNotesViewMode';
import NotesBoard from './NotesBoard';
import NotesFilter from './NotesFilter';
import NotesTable from './NotesTable';
import NotePreviewModal from './NotePreviewModal';
import { buildCategoryPlan } from './utils/category';
import {
  groupNotesByCategory,
  sortNoteRows,
  toNoteRows,
} from './utils/notes';

import styles from './index.scss';

/** 稳定的空数组，避免每次渲染都换新引用 */
const NO_NOTES: NoteSummary[] = [];

/** 英语笔记页：把 learning-record-notes 下的笔记按分类分列展示，整页不滚动。 */
const English = () => {
  const {
    categories,
    notes,
    loading,
    error,
    refresh,
    reload,
    applySummary,
    removeSummary,
  } = useEnglishNotes();
  /** 当前打开的笔记与它的正文：取正文、翻篇、保存、刷新、删除都在这个 hook 里 */
  const {
    active,
    content: activeBody,
    loading: noteLoading,
    open: openNote,
    close: closeNote,
    save: saveActive,
    refresh: refreshActive,
    remove: removeActive,
  } = useActiveNote({
    notes,
    onDeleted: removeSummary,
    onSummary: applySummary,
  });
  /**
   * 展示形式：分列看板 / 表格平铺，用 header 右侧图标按钮切换。
   * 记在 localStorage 里，切过的形态都留着，来回切只切显隐（见 `useNotesViewMode`）。
   */
  const { isBoardView, mounted, toggle: toggleView, view } = useNotesViewMode();
  /** 预览窗是否只是收进了程序坞：保留 active 正文，恢复时同一套操作还能用 */
  const [previewMinimized, setPreviewMinimized] = useState(false);
  /** 表格视图的排序状态：默认按更新时间倒序 */
  const [sort, setSort] = useState<NotesSort>(DEFAULT_NOTE_SORT);
  /** 列表筛选弹层是否打开：由页面持有，切视图、刷新时不留下一个悬着的面板 */
  const [notesFilterOpen, setNotesFilterOpen] = useState(false);
  /**
   * 列表筛选条件（时间范围 + 指定日期 + 分类）：
   * 条件持久化在 hook 里，这里只拿过滤结果与改条件的动作。
   */
  const {
    active: notesFilterActive,
    apply: applyNotesFilter,
    categoryKey: notesFilterCategoryKey,
    date: notesFilterDate,
    range: notesFilterRange,
    reset: resetNotesFilter,
    setCategoryKey: setNotesFilterCategoryKey,
    setDate: setNotesFilterDate,
    setRange: setNotesFilterRange,
  } = useNotesFilter();
  /** 当前筛选后真正参与展示的笔记：看板、表格与预览翻篇都用这一份 */
  const filteredNotes = useMemo(
    () => applyNotesFilter(notes),
    [applyNotesFilter, notes],
  );

  /**
   * 分类方案一次算好：列有哪些、标题、顺序都由记录仓库的分类清单决定，
   * 清单里没出现、但笔记里出现的分类键也会成一列，不会静默消失。
   * 用**全部笔记**算：筛选不该让分类下拉少一项，也不该凭筛选结果重排看板。
   */
  const plan = useMemo(
    () => buildCategoryPlan(notes, categories),
    [notes, categories],
  );
  /** 各列一次算好，看板与翻页共用同一份结果（每列只排一次序；只看筛选后的笔记） */
  const columns = useMemo(
    () => groupNotesByCategory(filteredNotes, plan),
    [filteredNotes, plan],
  );
  /** 筛到某一类时看板只留那一列：其余列只会陪着一片「这一列还没有笔记」 */
  const visibleColumns = useMemo(
    () =>
      notesFilterCategoryKey === ''
        ? columns
        : columns.filter((column) => column.key === notesFilterCategoryKey),
    [columns, notesFilterCategoryKey],
  );
  /** 表格视图的行：一行一篇，按当前排序状态排好 */
  const rows = useMemo(
    () => sortNoteRows(toNoteRows(filteredNotes, plan), sort, plan),
    [filteredNotes, plan, sort],
  );
  /** 表格里的可见顺序，翻页与计数在表格视图下也走这一份 */
  const rowNotes = useMemo(() => rows.map((row) => row.note), [rows]);
  /**
   * 翻页与计数只在「当前视图看得见的那一份」里进行：
   * 看板按本列走（计数是「本篇在本列第几 / 本列共几」，不跨分类跳），
   * 表格按整表的更新时间倒序走（和屏幕上从上到下的顺序一致）。
   */
  const scopeNotes = useMemo(() => {
    if (!active) {
      return NO_NOTES;
    }

    if (view === 'table') {
      return rowNotes;
    }

    const key = active.categoryKey;

    return columns.find((column) => column.key === key)?.notes ?? NO_NOTES;
  }, [active, columns, rowNotes, view]);
  const activeIndex =
    active === null
      ? -1
      : scopeNotes.findIndex((note) => note.name === active.name);

  const previewFilter = useNotePreviewFilter();

  // 页面头部「刷新当前页面」按钮：重新读取仓库里的笔记
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 从列表 / 翻篇打开预览：任何新打开都要先取消「收在程序坞」的隐藏态 */
  const openPreview = useCallback(
    async (name: string) => {
      setPreviewMinimized(false);
      await openNote(name);
    },
    [openNote],
  );

  const closePreview = useCallback(() => {
    setPreviewMinimized(false);
    closeNote();
  }, [closeNote]);

  /** 在「当前视图的可见顺序」里循环切换上一篇 / 下一篇。 */
  const step = (delta: number) => {
    if (activeIndex < 0 || scopeNotes.length === 0) {
      return;
    }

    const next = (activeIndex + delta + scopeNotes.length) % scopeNotes.length;

    void openPreview(scopeNotes[next].name);
  };

  /**
   * 点击表格列标题：同一列上反转方向，换一列时用它的自然默认
   * （更新时间默认新的在前，分类默认按看板列顺序）。
   */
  const sortBy = useCallback((key: NotesSort['key']) => {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return { key, direction: key === 'updated' ? 'desc' : 'asc' };
    });
  }, []);

  return (
    <>
      <MenuContentLayout
        actions={
          <>
            {/* 筛选图标按钮：与预览弹窗的筛选同一个组件，弹层里换成本页的两个筛选项 */}
            <FilterButton
              active={notesFilterActive}
              label="筛选笔记"
              onChange={setNotesFilterOpen}
              opened={notesFilterOpen}
              width={288}
            >
              <NotesFilter
                categories={plan.columns}
                categoryKey={notesFilterCategoryKey}
                date={notesFilterDate}
                onCategoryChange={setNotesFilterCategoryKey}
                onDateChange={setNotesFilterDate}
                onRangeChange={setNotesFilterRange}
                onReset={resetNotesFilter}
                range={notesFilterRange}
              />
            </FilterButton>
            <FreeIconAction
              label={isBoardView ? '切换为表格形式' : '切换为分列看板'}
              onClick={toggleView}
            >
              {isBoardView ? (
                <IconLayoutGrid size={16} stroke={1.9} />
              ) : (
                <IconLayoutList size={16} stroke={1.9} />
              )}
            </FreeIconAction>
          </>
        }
        fill
        title="英语笔记"
      >
        {error ? (
          <div className={styles.errorBar}>
            <span className={styles.errorText}>{error}</span>
            <UnstyledButton
              className={styles.retry}
              onClick={refresh}
              type="button"
            >
              重新读取
            </UnstyledButton>
          </div>
        ) : null}

        {mounted.board ? (
          <div className={cx(styles.pane, !isBoardView && styles.hiddenPane)}>
            <NotesBoard
              columns={visibleColumns}
              error={error}
              filtered={notesFilterActive}
              loading={loading}
              onOpen={openPreview}
            />
          </div>
        ) : null}

        {mounted.table ? (
          <div className={cx(styles.pane, isBoardView && styles.hiddenPane)}>
            <NotesTable
              error={error}
              filtered={notesFilterActive}
              loading={loading}
              onOpen={openPreview}
              onSort={sortBy}
              rows={rows}
              sort={sort}
            />
          </div>
        ) : null}
      </MenuContentLayout>

      <NotePreviewModal
        active={active}
        body={activeBody}
        filter={previewFilter}
        loading={noteLoading}
        onClose={closePreview}
        onMinimize={() => setPreviewMinimized(true)}
        onNext={scopeNotes.length > 1 ? () => step(1) : null}
        onPrevious={scopeNotes.length > 1 ? () => step(-1) : null}
        onRefresh={import.meta.env.DEV && activeBody !== null ? refreshActive : null}
        onSave={
          import.meta.env.DEV && activeBody !== null ? saveActive : undefined
        }
        opened={active !== null && !previewMinimized}
        position={
          active && scopeNotes.length > 0 && activeIndex >= 0
            ? { index: activeIndex + 1, total: scopeNotes.length }
            : undefined
        }
        remove={
          import.meta.env.DEV && activeBody !== null ? removeActive : undefined
        }
      />
    </>
  );
};

export default English;
