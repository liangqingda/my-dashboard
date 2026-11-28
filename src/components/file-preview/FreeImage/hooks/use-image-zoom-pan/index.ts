import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_IMAGE_SCALE,
  MIN_IMAGE_SCALE,
  WHEEL_LINE_HEIGHT,
  WHEEL_ZOOM_SPEED,
  WHEEL_ZOOM_STEP_MAX,
  WHEEL_ZOOM_STEP_MIN,
} from './constants';
import type {
  StageView,
  UseImageZoomPanOptions,
  UseImageZoomPanResult,
} from './types';
import { anchorView, clamp, drawnImageSize, limitView } from './utils';

/** Safari 的捏合事件（非标准，TS 没有对应类型）：`scale` 是相对本次手势起点的倍率 */
type SafariGestureEvent = Event & {
  scale: number;
  clientX: number;
  clientY: number;
};

const INITIAL_VIEW: StageView = { scale: MIN_IMAGE_SCALE, x: 0, y: 0 };

/**
 * 图片舞台的放大 / 缩小与平移，两件事都走 `wheel` 这一族事件：
 *
 * - **捏合**：Chromium / Firefox 把触控板捏合报成带 `ctrlKey` 的 `wheel`（Ctrl + 滚轮同一条路径），
 *   Safari 报的是非标准的 `gesturestart` / `gesturechange`；两条都得 `preventDefault`，
 *   否则浏览器放大的是整页而不是画面；
 * - **平移**：触控板两指滑动报成**不带** `ctrlKey` 的 `wheel`（`deltaX` / `deltaY` 两个轴都有），
 *   鼠标滚轮同一条路径。放大后拦掉默认行为、按滚动方向挪画面；没放大就让事件照常走。
 *
 * 不做指针拖拽：macOS 的三指拖拽要先在系统辅助功能里打开，浏览器又拿不到触控板的原始触点数；
 * 而两指滑动本来就是浏览器稳定给到的 `wheel`——同一套事件里既分得出捏合（`ctrlKey`），
 * 也分得出滑动，不需要第二套手势通道，也不必再为「拖完那一下 click」写抑制逻辑。
 *
 * 缩放以指针位置为锚点，位移夹在「放大后多出来的区域」里（公式见同目录 `utils.ts`）。
 *
 * 换图时由调用方用 `key` 换实例重置倍率；`interactive` 关掉（进裁剪这类要按布局尺寸量的状态）时
 * 由舞台调 `reset` 回 1 倍。
 */
export const useImageZoomPan = ({
  enabled,
  imageRef: externalImageRef,
}: UseImageZoomPanOptions): UseImageZoomPanResult => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const ownImageRef = useRef<HTMLImageElement | null>(null);
  /** 裁剪要拿同一张图去编码：调用方给了节点就用它，两个 ref 指向同一元素 */
  const imageRef = externalImageRef ?? ownImageRef;

  const [view, setView] = useState<StageView>(INITIAL_VIEW);
  /** 倍率与位移的镜像：事件回调里要读到「此刻」的值，不能依赖某一次渲染的闭包 */
  const viewRef = useRef<StageView>(INITIAL_VIEW);
  /**
   * 「能不能真改画面」的镜像：滚轮监听常驻（图片还在加载时也得拦掉浏览器的整页缩放），
   * 原生监听读不到渲染闭包，只能读它。
   */
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  });

  /** 量当下的一对尺寸并夹位移：图片用画出来的尺寸，舞台用内框尺寸 */
  const fitView = useCallback(
    (next: StageView): StageView => {
      const stage = stageRef.current;
      const image = imageRef.current;

      if (stage === null || image === null) {
        return next;
      }

      return limitView(next, drawnImageSize(image), {
        height: stage.clientHeight,
        width: stage.clientWidth,
      });
    },
    [imageRef],
  );

  /** 落到状态与镜像：同一手势里连着触发时以镜像为准 */
  const applyView = useCallback((next: StageView) => {
    const { current } = viewRef;

    if (
      next.scale === current.scale &&
      next.x === current.x &&
      next.y === current.y
    ) {
      return;
    }

    viewRef.current = next;
    setView(next);
  }, []);

  /** 改倍率：锚点取指针相对舞台中心的坐标；夹完倍率再夹位移 */
  const zoomTo = useCallback(
    (nextScale: number, clientX: number, clientY: number) => {
      const stage = stageRef.current;

      if (stage === null) {
        return;
      }

      const { current } = viewRef;
      const scale = clamp(nextScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);

      if (scale === current.scale) {
        return;
      }

      const rect = stage.getBoundingClientRect();

      applyView(
        fitView(
          anchorView(
            current,
            scale,
            clientX - rect.left - rect.width / 2,
            clientY - rect.top - rect.height / 2,
          ),
        ),
      );
    },
    [applyView, fitView],
  );

  /** 平移：按滚动方向反着挪（往下滚动看图片下半部分，与滚一块大图的直觉一致） */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      const { current } = viewRef;

      applyView(
        fitView({ scale: current.scale, x: current.x + dx, y: current.y + dy }),
      );
    },
    [applyView, fitView],
  );

  /**
   * 滚轮与 Safari 捏合只能挂原生监听：`preventDefault` 要生效，`wheel` 必须是
   * `passive: false`（React 的 `onWheel` 挂的是被动监听，拦不住整页缩放 / 滚动）。
   *
   * 监听不随 `enabled` 装卸：图片还在加载时，捏合照样要把浏览器的整页缩放拦下来，
   * 只是不改倍率。
   */
  useEffect(() => {
    const stage = stageRef.current;

    if (stage === null) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      /**
       * 行模式的滚动量不能直接当像素用：Firefox 的鼠标滚轮报的是行数（一格 3 行），
       * 不换算的话平移和缩放都几乎不动
       */
      const unit = event.deltaMode === 1 ? WHEEL_LINE_HEIGHT : 1;
      const deltaX = event.deltaX * unit;
      const deltaY = event.deltaY * unit;

      // 带 ctrlKey 的是捏合（Safari / Ctrl + 滚轮）：改倍率
      if (event.ctrlKey) {
        event.preventDefault();

        if (!enabledRef.current) {
          return;
        }

        const step = clamp(
          Math.exp(-deltaY * WHEEL_ZOOM_SPEED),
          WHEEL_ZOOM_STEP_MIN,
          WHEEL_ZOOM_STEP_MAX,
        );

        zoomTo(viewRef.current.scale * step, event.clientX, event.clientY);

        return;
      }

      // 其余是两指滑动 / 滚轮：没放大就没有可移的余地，事件照常走
      if (!enabledRef.current || viewRef.current.scale <= MIN_IMAGE_SCALE) {
        return;
      }

      event.preventDefault();
      panBy(-deltaX, -deltaY);
    };

    /** `scale` 是相对手势起点的倍率：起点那一下记下来，后续都乘在它上面 */
    let gestureStartScale = MIN_IMAGE_SCALE;

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartScale = viewRef.current.scale;
    };

    const handleGestureChange = (event: Event) => {
      event.preventDefault();

      if (!enabledRef.current) {
        return;
      }

      const gesture = event as SafariGestureEvent;

      zoomTo(
        gestureStartScale * gesture.scale,
        gesture.clientX,
        gesture.clientY,
      );
    };

    stage.addEventListener('gesturechange', handleGestureChange, {
      passive: false,
    });
    stage.addEventListener('gesturestart', handleGestureStart, {
      passive: false,
    });
    stage.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      stage.removeEventListener('gesturechange', handleGestureChange);
      stage.removeEventListener('gesturestart', handleGestureStart);
      stage.removeEventListener('wheel', handleWheel);
    };
  }, [panBy, zoomTo]);

  /** 回到 1 倍、位移清零（进裁剪前复位，免得选框压在缩放后的画面上） */
  const reset = useCallback(() => {
    applyView(INITIAL_VIEW);
  }, [applyView]);

  return {
    imageRef,
    imageStyle: {
      transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
    },
    reset,
    stageRef,
  };
};
