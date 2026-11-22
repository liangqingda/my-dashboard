/**
 * 视频侧栏的契约：只列「当前目录里有哪些视频、当前在放哪一条」，
 * 切换由 `onSelect` 交回弹窗，不在这里做翻篇边界判断。
 */

import type { VideoPreviewItem } from '../types';

/** 侧栏入参 */
export type VideoSidebarProps = {
  /** 当前目录的视频（顺序即翻篇顺序） */
  items: readonly VideoPreviewItem[];
  /** 当前正在播放的条目 id */
  activeId: string;
  /** 点选某一条 */
  onSelect: (id: string) => void;
};
