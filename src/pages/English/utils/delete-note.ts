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

/**
 * 按勾选说清这次删什么、留什么；一项都没勾时直说没有可删的。
 *
 * 文案按两边各自的真实作用写：Markdown 是知识点原文（只删它时学习状态还在，
 * 后续复习会把笔记重新生成）；Record 只是学习状态（只删它时笔记还在，
 * 复制笔记路径发给 learn-english 仍能复习这个知识点）。
 */
export const describeNoteDelete = (checkedKeys: readonly string[]): string => {
  const mode = toNoteDeleteMode(checkedKeys);

  if (mode === 'both') {
    return '笔记和学习状态一起清掉：这条知识点退出知识库，笔记也不会再重新生成。';
  }

  if (mode === 'markdown') {
    return '只删笔记，学习状态保留：这条仍会按计划复习，且笔记会在后续复习中重新生成。';
  }

  if (mode === 'record') {
    return '只删学习状态，笔记保留：复制笔记路径到 learn-english project 仍可复习此知识点。';
  }

  return '一项都没勾：没有要删除的内容。';
};
