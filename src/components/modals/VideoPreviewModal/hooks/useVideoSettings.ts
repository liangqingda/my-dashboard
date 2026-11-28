/**
 * 视频预览的界面偏好：方向键去向、快进 / 后退步长、空格键去向、截图存放目录、
 * 进度条悬停预览帧图的大小。
 *
 * 各项同属一个 localStorage 命名空间（`<页面标识>:video-preview`），各写各的字段：
 * 改步长不会把已选的截图目录冲掉。页面标识由调用方给（`storageScope`），
 * 同一个组件挂到第二页时不该共用第一页的偏好。
 */

import { useCallback, useState } from 'react';

import {
  FLAG_FIELD_CODEC,
  readStoredField,
  writeStoredField,
} from '@/utils/local-storage';
import { scopedStorageKey } from '@/utils/page-storage';

import {
  ARROW_MODE_CODEC,
  EXPORT_DIR_CODEC,
  MAX_PREVIEW_SCALE,
  MAX_SEEK_STEP,
  MIN_PREVIEW_SCALE,
  MIN_SEEK_STEP,
  PREVIEW_SCALE_CODEC,
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
  /** 进度条悬停预览帧图的大小（占视频画面宽度的百分比，30–90） */
  previewScale: number;
  /** 快进 / 后退步长（秒） */
  seekStep: number;
  /** 空格键是播放 / 暂停还是收进程序坞（内部值仍叫 close） */
  spaceMode: VideoSpaceMode;
  /** 网页全屏（框体铺满视口）是否保持开启：当作「怎么看」的偏好记住 */
  viewportFullscreen: boolean;
};

/** 设置 hook 的返回 */
export type UseVideoSettingsResult = {
  /** 当前设置 */
  settings: VideoPreviewSettings;
  /** 改方向键去向 */
  setArrowMode: (next: VideoArrowMode) => void;
  /** 改截图目录；传空串表示恢复默认（桌面） */
  setCaptureDir: (next: string) => void;
  /** 改预览帧大小（%）；越界值夹回合法区间 */
  setPreviewScale: (next: number) => void;
  /** 改步长；越界值夹回合法区间 */
  setSeekStep: (next: number) => void;
  /** 改空格键去向 */
  setSpaceMode: (next: VideoSpaceMode) => void;
  /** 改网页全屏（框体铺满视口）偏好 */
  setViewportFullscreen: (next: boolean) => void;
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
    captureDir: readStoredField(
      storageKey,
      SETTINGS_FIELD.captureDir,
      EXPORT_DIR_CODEC,
    ),
    previewScale: readStoredField(
      storageKey,
      SETTINGS_FIELD.previewScale,
      PREVIEW_SCALE_CODEC,
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
    viewportFullscreen: readStoredField(
      storageKey,
      SETTINGS_FIELD.viewportFullscreen,
      FLAG_FIELD_CODEC,
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

  const setPreviewScale = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) {
        return;
      }

      const value = Math.min(
        MAX_PREVIEW_SCALE,
        Math.max(MIN_PREVIEW_SCALE, Math.round(next)),
      );

      writeStoredField(
        storageKey,
        SETTINGS_FIELD.previewScale,
        PREVIEW_SCALE_CODEC,
        value,
      );
      setSettings((prev) => ({ ...prev, previewScale: value }));
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

  const setViewportFullscreen = useCallback(
    (next: boolean) => {
      writeStoredField(
        storageKey,
        SETTINGS_FIELD.viewportFullscreen,
        FLAG_FIELD_CODEC,
        next,
      );
      setSettings((prev) => ({ ...prev, viewportFullscreen: next }));
    },
    [storageKey],
  );

  return {
    setArrowMode,
    setCaptureDir,
    setPreviewScale,
    setSeekStep,
    setSpaceMode,
    setViewportFullscreen,
    settings,
  };
};
