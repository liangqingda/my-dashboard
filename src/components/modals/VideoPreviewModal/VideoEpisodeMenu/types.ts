/**
 * 选集弹层的契约：列当前目录的全部视频，高亮正在播的一条，点选交回调用方。
 * 弹层由 hover 唤出，开合状态归本组件；条目与高亮由调用方给。
 */

import type { VideoPreviewItem } from '../types';

/** 选集弹层入参 */
export type VideoEpisodeMenuProps = {
  /** 当前目录里的视频（顺序即翻篇顺序） */
  items: readonly VideoPreviewItem[];
  /** 正在播放的条目 id */
  activeId: string;
  /** 点选某一条 */
  onSelect: (id: string) => void;
  /** 弹层开合上报：上层据此判断「有没有弹层开着」，点画面时只收弹层、不切播放 */
  onChangeOpened?: (opened: boolean) => void;
};
