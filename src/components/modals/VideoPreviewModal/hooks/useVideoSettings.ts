/**
 * 视频预览的五项界面偏好：方向键去向、快进 / 后退步长、空格键去向、截图存放目录、音频导出目录。
 *
 * 五项同属一个 localStorage 命名空间（`<页面标识>:video-preview`），各写各的字段：
 * 改步长不会把已选的截图目录冲掉。页面标识由调用方给（`storageScope`），
 * 同一个组件挂到第二页时不该共用第一页的偏好。
 */

import { useCallback, useState } from 'react';

import { readStoredField, writeStoredField } from '@/utils/local-storage';
import { scopedStorageKey } from '@/utils/page-storage';

import {
  ARROW_MODE_CODEC,
  EXPORT_DIR_CODEC,
  MAX_SEEK_STEP,
  MIN_SEEK_STEP,
  SETTINGS_CAPABILITY,
  SETTINGS_FIELD,
  SEEK_STEP_CODEC,
  SPACE_MODE_CODEC,
  type VideoArrowMode,
  type VideoSpaceMode,
} from '../constants';

/** 设置项的值 */
export type VideoPreviewSettings = {
  /** ← / → 是快进 / 后退还是翻篇 */
  arrowMode: VideoArrowMode;
  /** 截图存放目录；空串表示默认（用户桌面） */
  captureDir: string;
  /** 导出音频的目录；空串表示默认（视频所在目录） */
  audioDir: string;
  /** 快进 / 后退步长（秒） */
  seekStep: number;
  /** 空格键是播放 / 暂停还是关闭弹窗 */
  spaceMode: VideoSpaceMode;
};

/** 设置 hook 的返回 */
export type UseVideoSettingsResult = {
  /** 当前设置 */
  settings: VideoPreviewSettings;
  /** 改方向键去向 */
  setArrowMode: (next: VideoArrowMode) => void;
  /** 改截图目录；传空串表示恢复默认（桌面） */
  setCaptureDir: (next: string) => void;
  /** 改导出音频目录；传空串表示恢复默认（视频所在目录） */
  setAudioDir: (next: string) => void;
  /** 改步长；越界值夹回合法区间 */
  setSeekStep: (next: number) => void;
  /** 改空格键去向 */
  setSpaceMode: (next: VideoSpaceMode) => void;
};

/**
 * 读写视频预览的界面偏好。
 *
 * @param storageScope 页面标识（对应路由，拼法见 `@/utils/page-storage`）
 */
export const useVideoSettings = (
  storageScope: string,
): UseVideoSettingsResult => {
  const storageKey = scopedStorageKey(storageScope, SETTINGS_CAPABILITY);
  const [settings, setSettings] = useState<VideoPreviewSettings>(() => ({
    arrowMode: readStoredField(
      storageKey,
      SETTINGS_FIELD.arrowMode,
      ARROW_MODE_CODEC,
    ),
    audioDir: readStoredField(
      storageKey,
      SETTINGS_FIELD.audioDir,
      EXPORT_DIR_CODEC,
    ),
    captureDir: readStoredField(
      storageKey,
      SETTINGS_FIELD.captureDir,
      EXPORT_DIR_CODEC,
    ),
    seekStep: readStoredField(
      storageKey,
      SETTINGS_FIELD.seekStep,
      SEEK_STEP_CODEC,
    ),
    spaceMode: readStoredField(
      storageKey,
      SETTINGS_FIELD.spaceMode,
      SPACE_MODE_CODEC,
    ),
  }));

  const setArrowMode = useCallback(
    (next: VideoArrowMode) => {
      writeStoredField(
        storageKey,
        SETTINGS_FIELD.arrowMode,
        ARROW_MODE_CODEC,
        next,
      );
      setSettings((prev) => ({ ...prev, arrowMode: next }));
    },
    [storageKey],
  );

  const setCaptureDir = useCallback(
    (next: string) => {
      writeStoredField(
        storageKey,
        SETTINGS_FIELD.captureDir,
        EXPORT_DIR_CODEC,
        next,
      );
      setSettings((prev) => ({ ...prev, captureDir: next }));
    },
    [storageKey],
  );

  const setAudioDir = useCallback(
    (next: string) => {
      writeStoredField(
        storageKey,
        SETTINGS_FIELD.audioDir,
        EXPORT_DIR_CODEC,
        next,
      );
      setSettings((prev) => ({ ...prev, audioDir: next }));
    },
    [storageKey],
  );

  const setSeekStep = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) {
        return;
      }

      const value = Math.min(
        MAX_SEEK_STEP,
        Math.max(MIN_SEEK_STEP, Math.round(next)),
      );

      writeStoredField(
        storageKey,
        SETTINGS_FIELD.seekStep,
        SEEK_STEP_CODEC,
        value,
      );
      setSettings((prev) => ({ ...prev, seekStep: value }));
    },
    [storageKey],
  );

  const setSpaceMode = useCallback(
    (next: VideoSpaceMode) => {
      writeStoredField(
        storageKey,
        SETTINGS_FIELD.spaceMode,
        SPACE_MODE_CODEC,
        next,
      );
      setSettings((prev) => ({ ...prev, spaceMode: next }));
    },
    [storageKey],
  );

  return {
    setArrowMode,
    setAudioDir,
    setCaptureDir,
    setSeekStep,
    setSpaceMode,
    settings,
  };
};
