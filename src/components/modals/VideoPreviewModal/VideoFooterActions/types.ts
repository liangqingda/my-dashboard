/**
 * 播放器控制栏右侧操作组的契约：选集、删除、截图、外部打开、加入 / 移出待拖拽区、设置、
 * 网页全屏、整屏全屏。
 * 动作与弹层归属都在弹窗这一层，这里只把按钮按固定顺序排好。
 */

import type { VideoPreviewSettings } from '../hooks/useVideoSettings';
import type { VideoSettingsPopoverProps } from '../VideoSettingsPopover/types';
import type { VideoPreviewItem } from '../types';

/** 传给设置弹层的取值与改法：弹窗把一整组设置绑好，操作组不再逐字段拆 */
export type FooterSettingsBinding = {
  arrowMode: VideoPreviewSettings['arrowMode'];
  captureDir: string;
  previewScale: number;
  seekStep: number;
  spaceMode: VideoPreviewSettings['spaceMode'];
  onArrowModeChange: VideoSettingsPopoverProps['onArrowModeChange'];
  onCaptureDirChange: VideoSettingsPopoverProps['onCaptureDirChange'];
  onPickDir: VideoSettingsPopoverProps['onPickDir'];
  onPreviewScaleChange: VideoSettingsPopoverProps['onPreviewScaleChange'];
  onSeekStepChange: VideoSettingsPopoverProps['onSeekStepChange'];
  onSpaceModeChange: VideoSettingsPopoverProps['onSpaceModeChange'];
};

/** 控制栏右侧操作组入参 */
export type VideoFooterActionsProps = {
  /** 当前目录里的视频（选集列表，顺序即翻篇顺序） */
  items: readonly VideoPreviewItem[];
  /** 正在播放的条目 id */
  activeId: string;
  /** 点选某一条（选集） */
  onSelect: (id: string) => void;
  /** 删除请求：只打开二次确认层；不传则没有删除按钮 */
  onRequestDelete?: (() => void) | null;
  /** 截图正在落盘：相机按钮转圈 */
  capturing: boolean;
  /** 截当前一帧（与 `Enter` 同一口径）；不传则没有相机按钮（程序坞窗口里不能落盘） */
  onCapture?: () => void;
  /** 用外部播放器打开当前视频；不传则没有这颗按钮 */
  onOpenExternal?: () => void;
  /** 外部播放器名称（跟设置里选的应用走），只用于按钮提示 */
  externalApp?: string;
  /** 弹层层级：程序坞窗口里把设置 / 选集弹层抬到窗口之上 */
  popoverZIndex?: number;
  /** 把当前视频加入 / 移出待拖拽区；不传则没有这颗按钮 */
  onToggleBatch?: () => void;
  /** 当前这一条已在待拖拽区：那颗按钮亮成强调色、文案改成「移出」 */
  batched?: boolean;
  /** 设置面板是否展开 */
  settingsOpen: boolean;
  /** 设置面板开合回调 */
  onSettingsChangeOpened: (opened: boolean) => void;
  /** 选集弹层开合回调：上层据此汇总「有没有弹层开着」，点画面只收弹层、不切播放 */
  onEpisodeChangeOpened?: (opened: boolean) => void;
  /** 网页全屏（框体铺满视口）是否开启 */
  viewportFullscreen: boolean;
  /** 切网页全屏 */
  onToggleViewportFullscreen: () => void;
  /** 整屏全屏（浏览器 Fullscreen API）是否开启 */
  browserFullscreen: boolean;
  /** 切整屏全屏 */
  onToggleBrowserFullscreen: () => void;
  /** 设置弹层的取值与改法绑定 */
  settings: FooterSettingsBinding;
  /** 本组按钮与弹层内所有 tip 固定深底浅字、不随主题反转 */
  tipDark?: boolean;
};
