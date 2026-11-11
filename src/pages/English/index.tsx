import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';

import FilterButton from '@/components/FilterButton';
import MarkdownPreviewModal from '@/components/MarkdownPreviewModal';
import type { MarkdownPreviewFilter } from '@/components/MarkdownPreviewModal';
import MenuContentLayout from '@/layouts/MenuContentLayout';
import { useStoredState } from '@/hooks/useStoredState';
import { onPageRefresh } from '@/utils/page-refresh';
import { cx } from '@/utils/cx';

import type { NoteSummary, NotesSort, NotesViewMode } from './types';
import {
  DEFAULT_NOTE_SORT,
  VIEW_MODE_CODEC,
  VIEW_MODE_STORAGE_KEY,
} from './constants';
import { useActiveNote } from './hooks/useActiveNote';
import { useEnglishNotes } from './hooks/useEnglishNotes';
import { useNoteFilter } from './hooks/useNoteFilter';
import { useNotesFilter } from './hooks/useNotesFilter';
import NoteEditor from './NoteEditor';
import NoteFilter from './NoteFilter';
import NotesBoard from './NotesBoard';
import NotesFilter from './NotesFilter';
import NotesTable from './NotesTable';
import { buildCategoryPlan } from './utils/category';
import {
  getNoteRelativePath,
  groupNotesByCategory,
  sortNoteRows,
  toNoteRows,
} from './utils/notes';

import styles from './index.scss';

/** 稳定的空数组，避免每次渲染都换新引用 */
const NO_NOTES: NoteSummary[] = [];

/** 英语练习页：把 learning-record-notes 下的笔记按分类分列展示，整页不滚动。 */
const English = () => {
  const { categories, notes, loading, error, refresh, reload, applySummary } =
    useEnglishNotes();
  /** 当前打开的笔记与它的正文：取正文、翻篇、保存、刷新都在这个 hook 里 */
  const {
    active,
    content: activeBody,
    loading: noteLoading,
    open: openNote,
    close: closeNote,
    save: saveActive,
    refresh: refreshActive,
  } = useActiveNote({ notes, onSummary: applySummary });
  /**
   * 展示形式：分列看板 / 表格平铺，用 header 右侧图标按钮切换。
   * 记在 localStorage 里，刷新页面重新进入后保持上次切换到的形态。
   */
  const [view, setView] = useStoredState(
    VIEW_MODE_STORAGE_KEY,
    VIEW_MODE_CODEC,
  );
  /**
   * 已经挂载过的展示形式：第一次切换过去时才挂载一份，之后两边都留着，
   * 来回切只切显隐，不再把几百个条目整棵拆掉重建。
   */
  const [mounted, setMounted] = useState<Record<NotesViewMode, boolean>>(() => ({
    board: view === 'board',
    table: view === 'table',
  }));
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

  /** 预览正文的筛选条件：范围 + 关键词，记在 localStorage，换篇 / 刷新都保留 */
  const {
    active: filterActive,
    apply: applyFilter,
    keyword: filterKeyword,
    reset: resetFilter,
    scope: filterScope,
    setKeyword: setFilterKeyword,
    setScope: setFilterScope,
  } = useNoteFilter();
  /**
   * 交给弹窗的筛选槽：筛选语义（错题 / 习题 / 关键词）与持久化都在这一页，
   * 弹窗只管图标按钮、就近弹层与「编辑态不筛」。
   */
  const previewFilter = useMemo<MarkdownPreviewFilter>(
    () => ({
      active: filterActive,
      apply: applyFilter,
      render: () => (
        <NoteFilter
          keyword={filterKeyword}
          onKeywordChange={setFilterKeyword}
          onReset={resetFilter}
          onScopeChange={setFilterScope}
          scope={filterScope}
        />
      ),
    }),
    [
      applyFilter,
      filterActive,
      filterKeyword,
      filterScope,
      resetFilter,
      setFilterKeyword,
      setFilterScope,
    ],
  );

  // 页面头部「刷新当前页面」按钮：重新读取仓库里的笔记
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 在「当前视图的可见顺序」里循环切换上一篇 / 下一篇。 */
  const step = (delta: number) => {
    if (activeIndex < 0 || scopeNotes.length === 0) {
      return;
    }

    const next = (activeIndex + delta + scopeNotes.length) % scopeNotes.length;

    void openNote(scopeNotes[next].name);
  };

  /**
   * 切换展示形式：分列看板 ⇄ 表格平铺。
   * 切过去的那一份第一次要挂载一次（几百个条目建一遍 DOM，这一次免不了），
   * 之后就靠 `mounted` 留着，切回来不再重新挂载。
   */
  const toggleView = () => {
    const next: NotesViewMode = view === 'board' ? 'table' : 'board';

    setView(next);
    setMounted((current) =>
      current[next] ? current : { ...current, [next]: true },
    );
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

  /** 当前是否为分列看板；图标与提示文案都按「切过去是什么」来写 */
  const isBoardView = view === 'board';

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
            <Tooltip
              label={isBoardView ? '切换为表格形式' : '切换为分列看板'}
              withArrow
            >
              <ActionIcon
                aria-label={isBoardView ? '切换为表格形式' : '切换为分列看板'}
                className={styles.viewToggle}
                onClick={toggleView}
                size="sm"
                variant="subtle"
              >
                {isBoardView ? (
                  <IconLayoutGrid size={16} stroke={1.9} />
                ) : (
                  <IconLayoutList size={16} stroke={1.9} />
                )}
              </ActionIcon>
            </Tooltip>
          </>
        }
        fill
        title="英语练习"
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
              onOpen={openNote}
            />
          </div>
        ) : null}

        {mounted.table ? (
          <div className={cx(styles.pane, isBoardView && styles.hiddenPane)}>
            <NotesTable
              error={error}
              filtered={notesFilterActive}
              loading={loading}
              onOpen={openNote}
              onSort={sortBy}
              rows={rows}
              sort={sort}
            />
          </div>
        ) : null}
      </MenuContentLayout>

      <MarkdownPreviewModal
        Editor={NoteEditor}
        filter={previewFilter}
        loading={noteLoading}
        markdown={activeBody ?? ''}
        onClose={closeNote}
        onNext={scopeNotes.length > 1 ? () => step(1) : null}
        onPrevious={scopeNotes.length > 1 ? () => step(-1) : null}
        onRefresh={import.meta.env.DEV && activeBody !== null ? refreshActive : null}
        onSave={
          import.meta.env.DEV && activeBody !== null ? saveActive : undefined
        }
        opened={active !== null}
        position={
          active && scopeNotes.length > 0 && activeIndex >= 0
            ? { index: activeIndex + 1, total: scopeNotes.length }
            : undefined
        }
        relativePath={active ? getNoteRelativePath(active.name) : undefined}
        title={active?.name ?? ''}
      />
    </>
  );
};

export default English;
