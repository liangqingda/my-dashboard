/**
 * 英语笔记模块的常量。
 *
 * 分类的键、中文标题与列顺序**不在这里定义**：唯一来源是记录仓库的
 * `learning-record-notes/categories.json`，由 Vite 中间件随笔记一起读出来
 * （见 `docs/local-repo-data.md`）。记录仓库加一个分类，页面自动多一列，
 * 本项目不需要改代码。
 */

import type { MarkdownPreviewRemove } from '@/components/modals/MarkdownPreviewModal';
import { createChoiceCodec } from '@/utils/local-storage';
import type { StoredCodec } from '@/utils/local-storage';
import { scopedStorageKey } from '@/utils/page-storage';

import type {
  NoteDeleteMode,
  NoteFilterScope,
  NotesSort,
  NotesTimeRange,
  NotesViewMode,
} from './types';
import { describeNoteDelete, runNoteDelete } from './utils/delete-note';

/** 表格视图的默认排序：按「笔记更新时间」倒序，新的在最上面 */
export const DEFAULT_NOTE_SORT: NotesSort = {
  key: 'updated',
  direction: 'desc',
};

/** 表格里字段缺失时的占位，避免出现空单元格 */
export const EMPTY_CELL = '—';

/**
 * 笔记目录名，相对 learn-english 仓库根目录。
 * 与 `scripts/vite/english-notes-store.ts` 的 `NOTES_DIR` 是同一个值：
 * 前端只在「复制相对路径」时拼接它，不参与读盘，改目录时两处一起改。
 */
export const NOTES_DIR = 'learning-record-notes';

/**
 * 这一页在 localStorage 里的页面标识：对应路由 `/english/notes`
 * （`/english/notes` → `english-notes`，拼法见 `@/utils/page-storage`）。
 * 页面级偏好与页面里用到的公共组件（Markdown 预览弹窗）都挂在这一个标识下。
 */
export const NOTES_STORAGE_SCOPE = 'english-notes';

/** 展示形式（分列看板 / 表格）的存储键：刷新页面后保持上次切换到的形态 */
export const VIEW_MODE_STORAGE_KEY = scopedStorageKey(
  NOTES_STORAGE_SCOPE,
  'view-mode',
);

/** 展示形式的编解码：只认 board / table，写坏的存储值回落分列看板 */
export const VIEW_MODE_CODEC = createChoiceCodec<NotesViewMode>(
  ['board', 'table'],
  'board',
);

/**
 * 笔记编辑器撤销栈的步数上限：小文档按步数兜底，长文档另受总字节上限约束。
 * 一份快照就是一份完整块数组，只按固定步数封顶会让栈随篇幅线性吃内存，
 * 所以再按 `UNDO_BYTES_LIMIT` 按字节裁剪。
 */
export const UNDO_DEPTH = 50;

/** 撤销栈的总字节上限：超出就丢最旧的快照，至少保留一步可撤 */
export const UNDO_BYTES_LIMIT = 2 * 1024 * 1024;

/**
 * 信息表里由记录仓库 / 脚本同步的字段行：编辑器里整行只读。
 *
 * 口径对齐 learn-english `check_note.py` 的模板（基础信息行 / 轮次信息行 / 菜单项信息行）：
 * 这些值由记录与 `sync` 写回，手改了下次同步也会被覆盖；基础信息里唯一可编辑的是「目标知识点」。
 */
export const READONLY_NOTE_ROW_LABELS: readonly string[] = [
  '记录 ID / 试卷 ID',
  '累计复习次数',
  '下次复习',
  '笔记生成时间',
  '笔记更新时间',
  '生成时间',
  '分类 · 状态变化',
  '本轮得分',
  '题量与错题数',
  '主观题得分',
];

/**
 * 删除确认层左下角的两个勾选项：勾谁删谁，两个都勾就是两边一起删。
 *
 * 默认只勾 Markdown——「删掉这篇笔记」是常见意图，Record 要删得自己再勾一下；
 * 两项都不勾时确认层没有可删的内容，删除按钮不可点。
 */
export const NOTE_DELETE_CHOICES = [
  {
    defaultChecked: true,
    hint: '原文：讲解、例句和历次复习笔记；路径可复制，粘贴给复习就是一轮练习',
    key: 'markdown',
    label: 'Markdown',
  },
  {
    hint: '学习状态：复习次数、下次复习、是否掌握，不含原文',
    key: 'record',
    label: 'Record',
  },
];

/**
 * 交给预览弹窗的删除能力：勾选项、说明文案与删除范围在这里装配。
 *
 * 页面只判断「现在能不能删」（开发模式 + 正文已到），确认层说什么、勾上之后删什么
 * 都由这份契约决定；`confirm` 收的是勾中的 key，这里再翻成删除范围（见 `useActiveNote.remove`）。
 *
 * @param run 用户确认后真正执行删除（参数是删除范围）
 * @returns 预览弹窗的 `remove` 入参
 */
export const createNoteRemove = (
  run: (mode: NoteDeleteMode) => Promise<void>,
): MarkdownPreviewRemove => ({
  choices: NOTE_DELETE_CHOICES,
  confirm: (checkedKeys) => runNoteDelete(checkedKeys, run),
  description: describeNoteDelete,
});

/**
 * 预览筛选的存储键：范围与关键词分两个键存。
 * 筛选条件要黏住——换一篇笔记、刷新页面都沿用上次的选择，不必重新点一遍。
 */
export const FILTER_SCOPE_STORAGE_KEY = scopedStorageKey(
  NOTES_STORAGE_SCOPE,
  'filter-scope',
);

export const FILTER_KEYWORD_STORAGE_KEY = scopedStorageKey(
  NOTES_STORAGE_SCOPE,
  'filter-keyword',
);

/** 筛选范围的编解码：只认这四种范围，写坏的存储值回落「全部内容」 */
export const FILTER_SCOPE_CODEC = createChoiceCodec<NoteFilterScope>(
  ['all', 'explain', 'exercise', 'wrong'],
  'all',
);

/**
 * 原样存字符串的编解码：没写过就是空串。
 * 预览关键词、列表的指定日期与分类键都用它——三者都只是「一段原样保留的文本」。
 */
export const TEXT_CODEC: StoredCodec<string> = {
  decode: (raw) => raw ?? '',
  encode: (value) => value,
};

/**
 * 列表筛选里「分类」的两个特殊值。
 *
 * - `ALL_CATEGORIES`：不按分类筛（真实分类键来自正文记录 ID 前缀，不会长成这样）；
 * - `UNCATEGORIZED_CATEGORY`：只看认不出分类的那些笔记（它们的分类键是空串，
 *   而空串在状态里另有含义——「不按分类筛」，所以得换一个值来指代）。
 */
export const ALL_CATEGORIES = '__all__';

export const UNCATEGORIZED_CATEGORY = '__uncategorized__';

/**
 * 列表筛选的存储键：时间范围、指定日期、分类分三个键存。
 * 和预览筛选一样黏住——刷新页面重新进入仍沿用上次的条件。
 */
export const NOTES_FILTER_RANGE_STORAGE_KEY = scopedStorageKey(
  NOTES_STORAGE_SCOPE,
  'notes-filter-range',
);

export const NOTES_FILTER_DATE_STORAGE_KEY = scopedStorageKey(
  NOTES_STORAGE_SCOPE,
  'notes-filter-date',
);

export const NOTES_FILTER_CATEGORY_STORAGE_KEY = scopedStorageKey(
  NOTES_STORAGE_SCOPE,
  'notes-filter-category',
);

/** 时间范围的编解码：只认六档，写坏的存储值回落「全部时间」 */
export const NOTES_FILTER_RANGE_CODEC = createChoiceCodec<NotesTimeRange>(
  ['all', 'hour', 'day', 'week', 'month', 'date'],
  'all',
);
