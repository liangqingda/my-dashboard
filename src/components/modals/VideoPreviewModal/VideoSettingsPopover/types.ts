/**
 * 视频设置面板的契约：可改的偏好、目录选择与开合状态；
 * 值本身由弹窗持有并持久化，面板只负责回传。
 */

import type { VideoArrowMode, VideoSpaceMode } from '../constants';

/** 设置面板的入参 */
export type VideoSettingsPopoverProps = {
  /** ← / → 的去向 */
  arrowMode: VideoArrowMode;
  /** 截图目录；空串表示默认（桌面） */
  captureDir: string;
  /** 改方向键去向 */
  onArrowModeChange: (mode: VideoArrowMode) => void;
  /** 改截图目录；空串表示恢复默认 */
  onCaptureDirChange: (dir: string) => void;
  /** 改悬停预览帧图大小（%） */
  onPreviewScaleChange: (percent: number) => void;
  /** 弹层开合 */
  onChangeOpened: (opened: boolean) => void;
  /** 调系统目录选择框选截图存放目录；返回 null 表示取消；不传则路径没有「选择目录」 */
  onPickDir?: () => Promise<string | null>;
  /** 改空格键去向 */
  onSpaceModeChange: (mode: VideoSpaceMode) => void;
  /** 改步长（秒） */
  onSeekStepChange: (seconds: number) => void;
  /** 是否展开 */
  opened: boolean;
  /** 悬停预览帧图大小（占视频画面宽度的百分比，30–90） */
  previewScale: number;
  /** 当前步长（秒） */
  seekStep: number;
  /** 空格键的去向 */
  spaceMode: VideoSpaceMode;
  /** 按钮与省略 tip 固定深底浅字、不随主题反转 */
  tipDark?: boolean;
};
