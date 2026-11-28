/**
 * 视频预览的网页全屏与程序坞尺寸口径：
 * - 页面窗沿用设置里记住的网页全屏；
 * - 程序坞恢复窗固定普通尺寸，窗内可临时铺满，收起前复位。
 * 同时给出设置 / 选集弹层的 portal 层级（程序坞窗口 1000，弹层要压在它上面）。
 */

import { useState } from 'react';

import { DOCK_POPOVER_Z_INDEX } from '@/dock/constants';

import type { VideoPreviewSettings } from './useVideoSettings';

type UseVideoViewportParams = {
  /** 这一窗来自页面还是程序坞 */
  dockOrigin: 'page' | 'dock';
  /** 退出浏览器整屏 */
  exit: () => Promise<void>;
  /** 当前是否处于浏览器整屏 */
  fullscreen: boolean;
  /** 页面设置（含记住的网页全屏） */
  settings: VideoPreviewSettings;
  /** 改页面设置里的网页全屏 */
  setViewportFullscreen: (active: boolean) => void;
};

/** 返回网页全屏状态、切换动作、收起前动作与弹层层级 */
export const useVideoViewport = ({
  dockOrigin,
  exit,
  fullscreen,
  settings,
  setViewportFullscreen,
}: UseVideoViewportParams) => {
  const [dockViewportFullscreen, setDockViewportFullscreen] = useState(false);
  const viewportFullscreen =
    dockOrigin === 'dock' ? dockViewportFullscreen : settings.viewportFullscreen;

  const toggleViewportFullscreen = () => {
    if (dockOrigin === 'dock') {
      setDockViewportFullscreen((current) => !current);

      return;
    }

    setViewportFullscreen(!settings.viewportFullscreen);
  };

  /** 收起前把浏览器整屏与网页全屏都退掉，程序坞窗口恢复出来必须是普通尺寸 */
  const beforeMinimize = async () => {
    if (fullscreen) {
      await exit();
    }

    if (dockOrigin === 'dock') {
      setDockViewportFullscreen(false);
    } else if (settings.viewportFullscreen) {
      setViewportFullscreen(false);
    }
  };

  /** 就近弹层压过程序坞窗口 / 程序坞条，页面窗与程序坞窗共用一档 */
  const popoverZIndex = DOCK_POPOVER_Z_INDEX;

  return {
    beforeMinimize,
    popoverZIndex,
    toggleViewportFullscreen,
    viewportFullscreen,
  };
};
