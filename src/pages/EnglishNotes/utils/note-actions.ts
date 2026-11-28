/**
 * 英语笔记的写操作与提示：页面预览与程序坞 Markdown 窗共用。
 *
 * 保存与删除都可能是「部分成功」（md 写了但提交失败、md 删了但记录没删成），
 * 提示文案必须说清哪一步成了、哪一步没成，不能只报一句「已删除」。
 */

import { notifications } from '@mantine/notifications';

import type { DeletedNoteResult, NoteDeleteMode } from '../types';

import { deleteEnglishNote, saveEnglishNote } from './notes-api';

/** 删除结果的第一段：这一篇删掉了什么 / 留住了什么 */
const describeDeletedHead = ({
  noteDeleted,
  recordDeleted,
  recordError,
  recordKept,
}: DeletedNoteResult): string => {
  if (recordKept) {
    return '笔记已删除，学习记录已保留';
  }

  if (noteDeleted && recordDeleted) {
    return '笔记与学习记录已删除';
  }

  if (noteDeleted) {
    return recordError
      ? `笔记已删除，但学习记录删除失败：${recordError}`
      : '笔记已删除（没有找到对应的学习记录）';
  }

  if (recordDeleted) {
    return '学习记录已删除，笔记保留';
  }

  return '没有删除任何内容';
};

/** 删除结果的后一段：提交 / 推送到了哪一步；没提交就没有这一段 */
const describeDeletedCommit = ({
  commitError,
  commitHash,
  pushError,
}: DeletedNoteResult): string[] => {
  if (commitError) {
    return [`自动提交失败：${commitError}`];
  }

  if (!commitHash) {
    return [];
  }

  return [
    `已提交 ${commitHash}`,
    pushError ? `未推送：${pushError}` : '已推送到远端',
  ];
};

/** 提示的颜色：记录没删成是错误，提交 / 推送没成是警告，其余算成功 */
const describeDeletedColor = ({
  recordError,
  commitError,
  pushError,
}: DeletedNoteResult): string => {
  if (recordError) {
    return 'red';
  }

  return commitError || pushError ? 'orange' : 'teal';
};

/** 删除成功的提示：说清删了什么、提交推送到哪一步 */
const describeDeleted = (
  result: DeletedNoteResult,
): {
  message: string;
  color: string;
} => ({
  color: describeDeletedColor(result),
  message: [describeDeletedHead(result), ...describeDeletedCommit(result)].join(
    '；',
  ),
});

/**
 * 删一篇笔记并弹结果提示。
 *
 * @param name 笔记相对笔记目录的路径，如 `errors/errors-a.md`
 * @param mode 删除范围：两边都删 / 只删 Markdown / 只删记录
 * @returns 接口原始结果，由调用方决定关窗与列表摘除
 */
export const deleteEnglishNoteWithNotice = async (
  name: string,
  mode: NoteDeleteMode = 'both',
): Promise<DeletedNoteResult> => {
  const deleted = await deleteEnglishNote(name, mode);
  const { color, message } = describeDeleted(deleted);

  notifications.show({ color, message, title: '已删除' });

  return deleted;
};

/**
 * 保存一篇笔记，并把「自动提交失败」收成弹窗可展示的 notice。
 *
 * @returns 只有提交失败时带 notice；保存接口失败仍由调用方抛出
 */
export const saveEnglishNoteWithCommitNotice = async (
  name: string,
  content: string,
): Promise<{ notice?: string }> => {
  const saved = await saveEnglishNote(name, content);

  return saved.commitError
    ? { notice: `自动提交失败：${saved.commitError}` }
    : {};
};
