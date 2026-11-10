/**
 * 英语笔记模块的常量。
 *
 * 分类的键、中文标题与列顺序**不在这里定义**：唯一来源是记录仓库的
 * `learning-record-notes/categories.json`，由 Vite 中间件随笔记一起读出来
 * （见 `docs/local-repo-data.md`）。记录仓库加一个分类，页面自动多一列，
 * 本项目不需要改代码。
 */

import { createChoiceCodec } from '@/utils/local-storage';

import type { NotesSort, NotesViewMode } from './types';

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

/** 展示形式（分列看板 / 表格）的存储键：刷新页面后保持上次切换到的形态 */
export const VIEW_MODE_STORAGE_KEY = 'my-dashboard:english:view-mode';

/** 展示形式的编解码：只认 board / table，写坏的存储值回落分列看板 */
export const VIEW_MODE_CODEC = createChoiceCodec<NotesViewMode>(
  ['board', 'table'],
  'board',
);

/** 笔记编辑器的撤销栈保留步数 */
export const UNDO_DEPTH = 50;
