/**
 * 设置面板的入参：视频去向 / 瓦片尺寸 / 预览全屏 / 筛选用多选还是单选 / 页面安全锁，
 * 值都由页面持有并持久化，面板只负责改。
 */

import type {
  FilesViewMode,
  MoveMode,
  TypeFilterMode,
  VideoOpenMode,
  VideoThumbStyle,
} from '../../types';

/** 设置面板 props */
export type SettingsPanelProps = {
  /** 视频点击后：弹窗预览 / 外部应用 */
  videoOpenMode: VideoOpenMode;
  /** 外部打开用的应用名 */
  videoApp: string;
  /** 外部打开时瓦片大图摆视频帧还是播放器图标 */
  videoThumbStyle: VideoThumbStyle;
  /** 改瓦片大图 */
  onVideoThumbStyleChange: (style: VideoThumbStyle) => void;
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
  /** hover 玻璃层透明度（0–100） */
  veilOpacity: number;
  /** 改 hover 玻璃层透明度 */
  onVeilOpacityChange: (opacity: number) => void;
  /** 类型筛选：多选 / 单选 */
  filterMode: TypeFilterMode;
  /** 改类型筛选的操作方式 */
  onFilterModeChange: (mode: TypeFilterMode) => void;
  /** 列表是否按类型分组成段展示 */
  grouped: boolean;
  /** 改分组展示开关 */
  onGroupedChange: (enabled: boolean) => void;
  /** 拖拽移动走弹窗还是直接拖到列表里的文件夹 */
  moveMode: MoveMode;
  /** 改拖拽移动的走法 */
  onMoveModeChange: (mode: MoveMode) => void;
  /** 页面安全锁是否开启 */
  lockEnabled: boolean;
  /** 安全锁密码：空串表示还没设，此时开关不可开 */
  lockPassword: string;
  /** 改安全锁开关 */
  onLockEnabledChange: (enabled: boolean) => void;
  /** 改安全锁密码 */
  onLockPasswordChange: (password: string) => void;
  /** 当前展示形态：网格 / 表格 */
  view: FilesViewMode;
  /** 改展示形态 */
  onViewModeChange: (view: FilesViewMode) => void;
};
