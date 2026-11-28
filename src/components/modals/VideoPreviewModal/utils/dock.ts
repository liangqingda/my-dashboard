/**
 * 视频预览窗口的程序坞描述：目录与当前段都进快照，换页 / 刷新后仍能重开这一组视频。
 *
 * 与图片预览同形，多一张封面（`poster`）让恢复窗口先摆出缩略图而不是黑底。
 */

import type { FreeModalDock } from '@/components/modals/FreeModal/types';

import type { VideoPreviewItem } from '../types';

type VideoDockParams = {
  /** 当前条目 id */
  activeId: string;
  /** 当前不可收起（全屏 / 弹层 / 确认层开着） */
  disabled: boolean;
  /** 指定条目 id（程序坞恢复的窗口用稳定 id）；不传按当前条目生成 */
  id?: string;
  /** 整个目录（顺序即翻篇顺序） */
  items: readonly VideoPreviewItem[];
  /** 这扇窗是谁：页面弹窗还是程序坞恢复出来的 */
  origin: 'page' | 'dock';
  /** 页面标识：恢复窗口按它继续记字号 / 播放偏好 */
  storageScope: string;
  /** 设置里选定的外部播放器名，随快照存一份 */
  externalApp?: string;
  /** 窗口标题与程序坞 tip */
  title: string;
};

export const createVideoDock = ({
  activeId,
  disabled,
  externalApp,
  id,
  items,
  origin,
  storageScope,
  title,
}: VideoDockParams): FreeModalDock => ({
  disabled,
  id: id ?? `video-preview:${storageScope}:${activeId}`,
  kind: 'video-preview',
  origin,
  snapshot: {
    activeId,
    externalApp,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      poster: item.poster,
      src: item.src,
    })),
    storageScope,
  },
  title,
});
