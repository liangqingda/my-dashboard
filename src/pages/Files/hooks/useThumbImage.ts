/**
 * 瓦片图源的限流挂载：拿到槽位才把 `src` 交出去，图一落地就还回去。
 *
 * 缩略图请求会占住浏览器到本机的连接（后端现转一个要近一秒），网格里十几片瓦片一起发，
 * 6 条连接能被占满，这时点开视频，媒体请求只能排队。闸门在 `utils/thumb-slots.ts`：
 * 这里只负责「什么时候给 `src`、什么时候还槽位」。
 *
 * 卸载时也要还：瓦片滑出屏幕、换目录、切筛选都会卸载，槽位不能跟着漏。
 */

import { useEffect, useRef, useState } from 'react';

import { takeThumbSlot } from '../utils/thumb-slots';

/** 入参 */
export type UseThumbImageOptions = {
  /**
   * 是否允许现在去排队要槽位，调用方给「瓦片是否进了视口」。
   * 网格不虚拟滚动，几百片一次挂载：不让离屏瓦片先占住槽位，否则槽位被它们攥着、
   * 屏幕上那几片反而排在后面。离屏时干脆不申请，滚到了再申请。
   */
  enabled?: boolean;
  /** 图源地址；`null` 表示这一类不摆缩略图（视频摆播放器图标、取不到图回落分类图标） */
  url: string | null;
  /** 图源加载失败：调用方据此回落分类图标 */
  onFail?: () => void;
};

/** 出参：交给 `<img>` 的三个属性 */
export type UseThumbImageResult = {
  /** 可用的图源；还没拿到槽位时是 `undefined`，调用方按「空图」渲染，不闪图标 */
  src: string | undefined;
  onError: () => void;
  onLoad: () => void;
};

export const useThumbImage = ({
  enabled = true,
  onFail,
  url,
}: UseThumbImageOptions): UseThumbImageResult => {
  /** 已经拿到槽位的那条地址：地址一变就自然失效，不用额外清 */
  const [granted, setGranted] = useState<string | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    /** 不摆图源（分类图标）就不必占槽位；离屏瓦片同理，滚到了再申请 */
    if (url === null || !enabled) {
      return;
    }

    let cancelled = false;

    void takeThumbSlot().then((release) => {
      if (cancelled) {
        release();

        return;
      }

      releaseRef.current = release;
      setGranted(url);
    });

    return () => {
      cancelled = true;
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, [enabled, url]);

  /** 图一落地就还槽位：后面的瓦片才能接着排 */
  const settle = (): void => {
    releaseRef.current?.();
    releaseRef.current = null;
  };

  return {
    onError: () => {
      settle();
      onFail?.();
    },
    onLoad: settle,
    src: url !== null && granted === url ? url : undefined,
  };
};
