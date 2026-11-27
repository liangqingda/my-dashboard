/**
 * 文件页的设置项（持久化到 localStorage）：视频点击后去哪儿（弹窗预览 / 外部应用）、
 * 外部打开时瓦片大图摆视频帧还是播放器图标、hover 玻璃层透明度、预览默认全屏，
 * 以及类型筛选用多选还是单选。
 *
 * 后续再添设置项时按同样的形状加一对 codec + 键，不要在页面里各写一份存储逻辑。
 */

import { useStoredState } from '@/hooks/useStoredState';
import {
  createChoiceCodec,
  createRangedNumberCodec,
  FLAG_CODEC,
  STRING_CODEC,
} from '@/utils/local-storage';

import {
  DEFAULT_TILE_WIDTH,
  DEFAULT_VIDEO_APP,
  GROUPED_DISPLAY_STORAGE_KEY,
  IMAGE_PREVIEW_FULLSCREEN_STORAGE_KEY,
  LOCK_ENABLED_STORAGE_KEY,
  LOCK_PASSWORD_STORAGE_KEY,
  MOVE_MODE_STORAGE_KEY,
  TILE_WIDTH_MAX,
  TILE_WIDTH_MIN,
  TILE_WIDTH_STORAGE_KEY,
  TYPE_FILTER_MODE_STORAGE_KEY,
  VIDEO_APP_STORAGE_KEY,
  VIDEO_OPEN_MODE_STORAGE_KEY,
  VIDEO_PREVIEW_FULLSCREEN_STORAGE_KEY,
  VEIL_OPACITY_STORAGE_KEY,
  VIDEO_THUMB_STYLE_STORAGE_KEY,
} from '../constants';
import { snapTileWidth } from '../utils/tile-width';
import type {
  MoveMode,
  TypeFilterMode,
  VideoOpenMode,
  VideoThumbStyle,
} from '../types';

const FILTER_MODE_CODEC = createChoiceCodec<TypeFilterMode>(
  ['multi', 'single'],
  'multi',
);

/** 瓦片大图：视频帧 / 播放器图标，脏值回落图标（与旧行为一致） */
const VIDEO_THUMB_STYLE_CODEC = createChoiceCodec<VideoThumbStyle>(
  ['frame', 'app-icon'],
  'app-icon',
);

/** 视频去向：只有「弹窗」「外部」两档，脏值回落弹窗 */
const VIDEO_OPEN_MODE_CODEC = createChoiceCodec<VideoOpenMode>(
  ['preview', 'external'],
  'preview',
);

/** 拖拽移动的走法：只有「弹窗」「直接拖」两档，脏值回落弹窗 */
const MOVE_MODE_CODEC = createChoiceCodec<MoveMode>(['modal', 'direct'], 'modal');

/** hover 玻璃层透明度：0–100 的百分比，脏值回落 100（完全不透明） */
const VEIL_OPACITY_CODEC = createRangedNumberCodec(0, 100, 100);

/** 网格瓦片宽度：120–248 的像素值，读出来吸到 5 个档位之一（老存储值不在档位上） */
const TILE_WIDTH_CODEC = createRangedNumberCodec(
  TILE_WIDTH_MIN,
  TILE_WIDTH_MAX,
  DEFAULT_TILE_WIDTH,
);

/** 文件页设置的返回 */
export type UseFilesSettingsResult = {
  /** 视频点击后是弹窗预览还是外部应用打开 */
  videoOpenMode: VideoOpenMode;
  /** 外部打开用的应用名；空串表示用默认播放器 */
  videoApp: string;
  /** 外部打开时瓦片大图摆什么 */
  videoThumbStyle: VideoThumbStyle;
  /** 改瓦片大图 */
  setVideoThumbStyle: (style: VideoThumbStyle) => void;
  /** 改视频去向 */
  setVideoOpenMode: (mode: VideoOpenMode) => void;
  /** 改外部打开用的应用 */
  setVideoApp: (app: string) => void;
  /** 图片预览弹窗默认是否全屏 */
  imageFullscreen: boolean;
  /** 视频预览弹窗默认是否全屏 */
  videoFullscreen: boolean;
  /** 改图片预览的默认全屏 */
  setImageFullscreen: (enabled: boolean) => void;
  /** 改视频预览的默认全屏 */
  setVideoFullscreen: (enabled: boolean) => void;
  /** 网格瓦片宽度（px）：只会是 5 个档位之一，网格按它算列数、再均分铺满 */
  tileWidth: number;
  /** 改网格瓦片宽度 */
  setTileWidth: (width: number) => void;
  /** hover 玻璃层的透明度（0–100） */
  veilOpacity: number;
  /** 改 hover 玻璃层的透明度 */
  setVeilOpacity: (opacity: number) => void;
  /** 类型筛选：多选 / 单选 */
  filterMode: TypeFilterMode;
  /** 改类型筛选的操作方式 */
  setFilterMode: (mode: TypeFilterMode) => void;
  /** 拖拽移动走弹窗还是直接拖到列表里的文件夹 */
  moveMode: MoveMode;
  /** 改拖拽移动的走法 */
  setMoveMode: (mode: MoveMode) => void;
  /** 列表是否按类型分组成段展示 */
  grouped: boolean;
  /** 改分组展示开关 */
  setGrouped: (enabled: boolean) => void;
  /** 页面安全锁是否开启 */
  lockEnabled: boolean;
  /** 安全锁密码；空串表示还没设，此时锁不生效 */
  lockPassword: string;
  /** 改安全锁开关 */
  setLockEnabled: (enabled: boolean) => void;
  /** 改安全锁密码 */
  setLockPassword: (password: string) => void;
};

/** 文件页设置的读写：只在挂载时读一次存储，之后以状态为准 */
export const useFilesSettings = (): UseFilesSettingsResult => {
  const [videoOpenMode, setVideoOpenMode] = useStoredState(
    VIDEO_OPEN_MODE_STORAGE_KEY,
    VIDEO_OPEN_MODE_CODEC,
  );
  const [videoThumbStyle, setVideoThumbStyle] = useStoredState(
    VIDEO_THUMB_STYLE_STORAGE_KEY,
    VIDEO_THUMB_STYLE_CODEC,
  );
  const [storedApp, setVideoApp] = useStoredState(
    VIDEO_APP_STORAGE_KEY,
    STRING_CODEC,
  );
  const [imageFullscreen, setImageFullscreen] = useStoredState(
    IMAGE_PREVIEW_FULLSCREEN_STORAGE_KEY,
    FLAG_CODEC,
  );
  const [videoFullscreen, setVideoFullscreen] = useStoredState(
    VIDEO_PREVIEW_FULLSCREEN_STORAGE_KEY,
    FLAG_CODEC,
  );
  const [veilOpacity, setVeilOpacity] = useStoredState(
    VEIL_OPACITY_STORAGE_KEY,
    VEIL_OPACITY_CODEC,
  );
  const [storedTileWidth, setStoredTileWidth] = useStoredState(
    TILE_WIDTH_STORAGE_KEY,
    TILE_WIDTH_CODEC,
  );
  const [filterMode, setFilterMode] = useStoredState(
    TYPE_FILTER_MODE_STORAGE_KEY,
    FILTER_MODE_CODEC,
  );
  const [moveMode, setMoveMode] = useStoredState(
    MOVE_MODE_STORAGE_KEY,
    MOVE_MODE_CODEC,
  );
  const [grouped, setGrouped] = useStoredState(
    GROUPED_DISPLAY_STORAGE_KEY,
    FLAG_CODEC,
  );
  const [lockEnabled, setLockEnabled] = useStoredState(
    LOCK_ENABLED_STORAGE_KEY,
    FLAG_CODEC,
  );
  const [lockPassword, setLockPassword] = useStoredState(
    LOCK_PASSWORD_STORAGE_KEY,
    STRING_CODEC,
  );

  /** 存储里可能留着老档位（168 这类），读出来先吸到最近的档位再交给滑块与网格 */
  const tileWidth = snapTileWidth(storedTileWidth);

  return {
    filterMode,
    grouped,
    imageFullscreen,
    lockEnabled,
    lockPassword,
    moveMode,
    setFilterMode,
    setGrouped,
    setLockEnabled,
    setLockPassword,
    setImageFullscreen,
    setMoveMode,
    setTileWidth: (width: number) => setStoredTileWidth(snapTileWidth(width)),
    setVideoApp,
    setVideoFullscreen,
    setVideoOpenMode,
    setVeilOpacity,
    setVideoThumbStyle,
    tileWidth,
    veilOpacity,
    videoApp: storedApp.trim() || DEFAULT_VIDEO_APP,
    videoFullscreen,
    videoOpenMode,
    videoThumbStyle,
  };
};
