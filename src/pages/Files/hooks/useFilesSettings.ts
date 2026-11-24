/**
 * 文件页的设置项（持久化到 localStorage）：视频点击后去哪儿（弹窗预览 / 外部应用）、
 * 外部打开时瓦片大图摆视频帧还是播放器图标、瓦片图源尺寸与名称字号、
 * hover 玻璃层透明度、预览默认全屏，以及类型筛选用多选还是单选。
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
  DEFAULT_TILE_NAME_SIZE,
  DEFAULT_TILE_SIZE,
  DEFAULT_VIDEO_APP,
  IMAGE_PREVIEW_FULLSCREEN_STORAGE_KEY,
  TILE_NAME_SIZE_MAX,
  TILE_NAME_SIZE_MIN,
  TILE_NAME_SIZE_STORAGE_KEY,
  TILE_SIZE_MAX,
  TILE_SIZE_MIN,
  TILE_SIZE_STORAGE_KEY,
  TYPE_FILTER_MODE_STORAGE_KEY,
  VIDEO_APP_STORAGE_KEY,
  VIDEO_OPEN_MODE_STORAGE_KEY,
  VIDEO_PREVIEW_FULLSCREEN_STORAGE_KEY,
  VEIL_OPACITY_STORAGE_KEY,
  VIDEO_THUMB_STYLE_STORAGE_KEY,
} from '../constants';
import type { TypeFilterMode, VideoOpenMode, VideoThumbStyle } from '../types';

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

/** hover 玻璃层透明度：0–100 的百分比，脏值回落 100（完全不透明） */
const VEIL_OPACITY_CODEC = createRangedNumberCodec(0, 100, 100);

/** 图源尺寸：px，脏值回落 104 */
const TILE_SIZE_CODEC = createRangedNumberCodec(
  TILE_SIZE_MIN,
  TILE_SIZE_MAX,
  DEFAULT_TILE_SIZE,
);

/** 名称字号：px，脏值回落 14 */
const TILE_NAME_SIZE_CODEC = createRangedNumberCodec(
  TILE_NAME_SIZE_MIN,
  TILE_NAME_SIZE_MAX,
  DEFAULT_TILE_NAME_SIZE,
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
  /** hover 玻璃层的透明度（0–100） */
  veilOpacity: number;
  /** 改 hover 玻璃层的透明度 */
  setVeilOpacity: (opacity: number) => void;
  /** 网格瓦片图源边长（px） */
  tileSize: number;
  /** 改图源边长 */
  setTileSize: (size: number) => void;
  /** 网格瓦片名称字号（px） */
  nameSize: number;
  /** 改名称字号 */
  setNameSize: (size: number) => void;
  /** 类型筛选：多选 / 单选 */
  filterMode: TypeFilterMode;
  /** 改类型筛选的操作方式 */
  setFilterMode: (mode: TypeFilterMode) => void;
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
  const [tileSize, setTileSize] = useStoredState(
    TILE_SIZE_STORAGE_KEY,
    TILE_SIZE_CODEC,
  );
  const [nameSize, setNameSize] = useStoredState(
    TILE_NAME_SIZE_STORAGE_KEY,
    TILE_NAME_SIZE_CODEC,
  );
  const [filterMode, setFilterMode] = useStoredState(
    TYPE_FILTER_MODE_STORAGE_KEY,
    FILTER_MODE_CODEC,
  );

  return {
    filterMode,
    imageFullscreen,
    nameSize,
    setNameSize,
    setFilterMode,
    setImageFullscreen,
    setTileSize,
    setVideoApp,
    setVideoFullscreen,
    setVideoOpenMode,
    setVeilOpacity,
    setVideoThumbStyle,
    tileSize,
    veilOpacity,
    videoApp: storedApp.trim() || DEFAULT_VIDEO_APP,
    videoFullscreen,
    videoOpenMode,
    videoThumbStyle,
  };
};
