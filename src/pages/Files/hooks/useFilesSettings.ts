/**
 * 文件页的设置项（持久化到 localStorage）：目前只有「视频点击后去哪儿」——
 * 弹窗预览，还是交给外部应用打开（外部应用可在设置面板里选，默认 IINA）。
 *
 * 后续再添设置项时按同样的形状加一对 codec + 键，不要在页面里各写一份存储逻辑。
 */

import { useStoredState } from '@/hooks/useStoredState';
import { createChoiceCodec, STRING_CODEC } from '@/utils/local-storage';

import {
  DEFAULT_VIDEO_APP,
  VIDEO_APP_STORAGE_KEY,
  VIDEO_OPEN_MODE_STORAGE_KEY,
} from '../constants';
import type { VideoOpenMode } from '../types';

/** 视频去向：只有「弹窗」「外部」两档，脏值回落弹窗 */
const VIDEO_OPEN_MODE_CODEC = createChoiceCodec<VideoOpenMode>(
  ['preview', 'external'],
  'preview',
);

/** 文件页设置的返回 */
export type UseFilesSettingsResult = {
  /** 视频点击后是弹窗预览还是外部应用打开 */
  videoOpenMode: VideoOpenMode;
  /** 外部打开用的应用名；空串表示用默认播放器 */
  videoApp: string;
  /** 改视频去向 */
  setVideoOpenMode: (mode: VideoOpenMode) => void;
  /** 改外部打开用的应用 */
  setVideoApp: (app: string) => void;
};

/** 文件页设置的读写：只在挂载时读一次存储，之后以状态为准 */
export const useFilesSettings = (): UseFilesSettingsResult => {
  const [videoOpenMode, setVideoOpenMode] = useStoredState(
    VIDEO_OPEN_MODE_STORAGE_KEY,
    VIDEO_OPEN_MODE_CODEC,
  );
  const [storedApp, setVideoApp] = useStoredState(
    VIDEO_APP_STORAGE_KEY,
    STRING_CODEC,
  );

  return {
    setVideoApp,
    setVideoOpenMode,
    videoApp: storedApp.trim() || DEFAULT_VIDEO_APP,
    videoOpenMode,
  };
};
