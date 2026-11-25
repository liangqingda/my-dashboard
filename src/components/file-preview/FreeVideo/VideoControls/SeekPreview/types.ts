/**
 * 悬停预览浮层的入参：帧图与这一处的落点都由父组件给，浮层不自己算时间。
 */

import type { VideoFrame } from '../../hooks/use-video-frames';
import type { SeekPreviewState } from '../types';

/** 悬停预览浮层入参 */
export type SeekPreviewProps = {
  /** 帧图（定长，抽不到的格子是 null），按时间顺序排列 */
  frames: VideoFrame[];
  /** 这一处对应的帧下标、浮层位置与时间 */
  preview: SeekPreviewState;
};
