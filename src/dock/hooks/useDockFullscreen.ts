/**
 * 程序坞的全屏感知：弹窗上报的 CSS / 浏览器全屏，以及浏览器原生全屏事件。
 * 程序坞条据此把已展开的条减淡；原生全屏时连右下角控件一起让开。
 */

import { useCallback, useEffect, useState } from 'react';

/** 全屏态与上报动作 */
export type UseDockFullscreenResult = {
  /** 当前打开的全屏弹窗数量 */
  fullscreenCount: number;
  /** 浏览器是否处于原生全屏 */
  nativeFullscreen: boolean;
  /** 弹窗登记 / 注销自己的全屏态 */
  reportFullscreen: (id: string, active: boolean) => void;
};

export const useDockFullscreen = (): UseDockFullscreenResult => {
  const [ids, setIds] = useState<readonly string[]>([]);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setNativeFullscreen(document.fullscreenElement !== null);

    sync();
    document.addEventListener('fullscreenchange', sync);

    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const reportFullscreen = useCallback((id: string, active: boolean) => {
    setIds((current) => {
      const present = current.includes(id);

      if (active === present) {
        return current;
      }

      return active ? [...current, id] : current.filter((item) => item !== id);
    });
  }, []);

  return {
    fullscreenCount: ids.length,
    nativeFullscreen,
    reportFullscreen,
  };
};
