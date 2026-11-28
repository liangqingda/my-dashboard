/**
 * 子区块标题行的派生口径：区块标题 + 上级小节，子预览 header 与程序坞条目标题共用。
 */

import type { MarkdownPreviewSection } from '../types';

/** 拼成「区块标题 · 上级小节」；上级小节为空时只留区块标题，标题为空退回 key */
export const sectionHeading = (section: MarkdownPreviewSection): string =>
  [section.title || section.key, section.parentTitle].filter(Boolean).join(' · ');
