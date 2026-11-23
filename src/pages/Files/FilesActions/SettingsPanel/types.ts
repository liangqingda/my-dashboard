/**
 * 设置面板的入参：目前只有「视频点击后去哪儿」这一项，
 * 值都由页面持有并持久化，面板只负责改。
 */

import type { VideoOpenMode } from '../../types';

/** 设置面板 props */
export type SettingsPanelProps = {
  /** 视频点击后：弹窗预览 / 外部应用 */
  videoOpenMode: VideoOpenMode;
  /** 外部打开用的应用名 */
  videoApp: string;
  /** 改视频去向 */
  onVideoOpenModeChange: (mode: VideoOpenMode) => void;
  /** 改外部打开的应用 */
  onVideoAppChange: (app: string) => void;
  /** 图片预览弹窗默认是否全屏 */
  imageFullscreen: boolean;
  /** 视频预览弹窗默认是否全屏 */
  videoFullscreen: boolean;
  /** 改图片预览的默认全屏 */
  onImageFullscreenChange: (enabled: boolean) => void;
  /** 改视频预览的默认全屏 */
  onVideoFullscreenChange: (enabled: boolean) => void;
};
