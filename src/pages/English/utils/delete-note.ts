/**
 * 删除确认层的映射：左下角勾中的 key → 这次删哪一边 / 说明块说什么。
 *
 * 勾选项的语义只在这里解释一次：页面常量给两个 choice（Markdown / Record），
 * 弹窗只负责画 checkbox 与把 key 集合带回来，翻成删除范围这件事放在这儿，
 * 免得同一套映射在 `constants` 与页面里各写一遍、日后加第三项时漏改一处。
 */

import type { NoteDeleteMode } from '../types';

/** 勾中的 key 与删除范围：两个都勾是两边都删，只勾一个就是只删那一个，都没勾则没有范围 */
export const toNoteDeleteMode = (
  checkedKeys: readonly string[],
): NoteDeleteMode | null => {
  const markdown = checkedKeys.includes('markdown');
  const record = checkedKeys.includes('record');

  if (markdown && record) {
    return 'both';
  }

  if (markdown) {
    return 'markdown';
  }

  if (record) {
    return 'record';
  }

  return null;
};

/** 按勾选执行删除：一项都没勾时什么也不做（按钮此时本就不可点，这里是兜底） */
export const runNoteDelete = (
  checkedKeys: readonly string[],
  run: (mode: NoteDeleteMode) => Promise<void>,
): Promise<void> => {
  const mode = toNoteDeleteMode(checkedKeys);

  return mode ? run(mode) : Promise.resolve();
};

/** 按勾选说清这次删什么、留什么；一项都没勾时直说没有可删的 */
export const describeNoteDelete = (checkedKeys: readonly string[]): string => {
  const mode = toNoteDeleteMode(checkedKeys);

  if (mode === 'both') {
    return '这篇笔记的 Markdown 与 Record 都会从 learn-english 仓库删除。';
  }

  if (mode === 'markdown') {
    return '只删这篇笔记的 Markdown，记录库里的 Record 保留，之后仍可继续复习。';
  }

  if (mode === 'record') {
    return '只删记录库里的 Record，这篇笔记的 Markdown 原样保留。';
  }

  return '一项都没勾：没有要删除的内容。';
};
