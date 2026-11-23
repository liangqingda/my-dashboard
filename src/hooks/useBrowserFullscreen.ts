/**
 * 整屏全屏：走浏览器 Fullscreen API，把整个页面铺到屏幕上（不是把某个框体放大到视口）。
 *
 * 视频预览与图片预览共用这一份：两者的差别只在「全屏里固定什么」，状态与失败处理相同。
 * 状态不存 localStorage：进入全屏需要用户手势，刷新后自动恢复全屏会被浏览器拒绝，
 * 记下来只会得到一个「明明记着却进不去」的偏好。退出（Esc / 再点一次）都由
 * `fullscreenchange` 同步，调用方不自己猜状态。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

/** 整屏全屏 hook 的返回 */
export type UseBrowserFullscreenResult = {
  /** 当前是否处于整屏全屏 */
  active: boolean;
  /** 切换全屏；浏览器拒绝时给一条红色通知 */
  toggle: () => void;
  /** 主动退出全屏（关弹窗时用），已经不在全屏时直接返回 */
  exit: () => Promise<void>;
};

/** 浏览器全屏状态同步 + 主动退出全屏；失败不抛给调用方，只提示一次 */
export const useBrowserFullscreen = (): UseBrowserFullscreenResult => {
  const [active, setActive] = useState(false);
  /** 是不是这一次由本组件进入的全屏：卸载时只退出自己开的，不去动别的全屏 */
  const enteredRef = useRef(false);

  useEffect(() => {
    const sync = () => {
      const inFullscreen = document.fullscreenElement !== null;

      if (!inFullscreen) {
        enteredRef.current = false;
      }

      setActive(inFullscreen);
    };

    document.addEventListener('fullscreenchange', sync);

    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  /** 关窗 / 卸载时兜底退出：浏览器还在全屏就把它退掉，失败说明本来就不在全屏 */
  useEffect(
    () => () => {
      if (enteredRef.current && document.fullscreenElement !== null) {
        enteredRef.current = false;
        void document.exitFullscreen().catch(() => undefined);
      }
    },
    [],
  );

  const exit = useCallback(async (): Promise<void> => {
    if (document.fullscreenElement === null) {
      return;
    }

    try {
      await document.exitFullscreen();
      enteredRef.current = false;
    } catch {
      // 退出失败说明浏览器已经不在全屏，没有需要补救的状态
    }
  }, []);

  const toggle = useCallback(() => {
    const enter = async () => {
      try {
        if (document.fullscreenElement !== null) {
          await exit();

          return;
        }

        await document.documentElement.requestFullscreen();
        enteredRef.current = true;
      } catch (error) {
        notifications.show({
          autoClose: false,
          color: 'red',
          message: getErrorMessage(error, '浏览器拒绝了这次全屏请求'),
          title: '全屏失败',
        });
      }
    };

    void enter();
  }, [exit]);

  return { active, exit, toggle };
};
