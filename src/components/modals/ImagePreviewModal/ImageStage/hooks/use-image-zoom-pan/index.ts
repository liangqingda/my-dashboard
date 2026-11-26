import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DRAG_CLICK_SLOP,
  MAX_IMAGE_SCALE,
  MIN_IMAGE_SCALE,
  WHEEL_ZOOM_SPEED,
  WHEEL_ZOOM_STEP_MAX,
  WHEEL_ZOOM_STEP_MIN,
} from './constants';
import type {
  StageClickEvent,
  StagePointerEvent,
  StageView,
  UseImageZoomPanOptions,
  UseImageZoomPanResult,
} from './types';
import { anchorView, clamp, limitView } from './utils';

/** 一次拖拽：按下那一刻的位置与位移；`moved` 一旦置真，这一次的 `click` 就不再算「点了一下」 */
type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

/** Safari 的捏合事件（非标准，TS 没有对应类型）：`scale` 是相对本次手势起点的倍率 */
type SafariGestureEvent = Event & { scale: number; clientX: number; clientY: number };

const INITIAL_VIEW: StageView = { scale: MIN_IMAGE_SCALE, x: 0, y: 0 };

/**
 * 图片舞台的放大 / 缩小与拖拽移动。
 *
 * 三种输入各走各的通道，最终落到同一份「倍率 + 位移」：
 *
 * - **捏合**：Chromium / Firefox 报带 `ctrlKey` 的 `wheel`，Safari 报 `gesturestart` /
 *   `gesturechange`，两条都接并 `preventDefault`，否则浏览器放大的是整页而不是画面；
 * - **拖拽移动**：走 Pointer Events。macOS「三指拖拽」被系统翻译成普通鼠标拖拽，浏览器拿不到
 *   原始触点数；没开那个设置时三指滑动不产生任何事件；
 * - **触屏**：同一套 Pointer Events，`touch-action` 只在放大后关掉，避免整页被当成滚动。
 *
 * 缩放以指针位置为锚点，位移夹在「放大后多出来的区域」里（公式见同目录 `utils.ts`）。
 * 换图时由弹窗用 `key` 换实例重置倍率；裁剪前由舞台调 `reset` 回 1 倍。
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

  const [dragging, setDragging] = useState(false);
  /** 正在拖的那一手；`null` = 没在拖 */
  const dragRef = useRef<DragSession | null>(null);
  /** 这一手是不是拖拽：松手后浏览器补的 `click` 要吞掉，否则拖完会顺手把 header 开合一次 */
  const suppressClickRef = useRef(false);
  /**
   * 「能不能真缩放」的镜像：捏合监听常驻（图片还在加载时也得拦掉浏览器的整页缩放），
   * 原生监听读不到渲染闭包，只能读它。
   */
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  });

  /** 量当下的一对尺寸并夹位移：图片用未缩放的布局尺寸，舞台用内框尺寸 */
  const fitView = useCallback((next: StageView): StageView => {
    const stage = stageRef.current;
    const image = imageRef.current;

    if (stage === null || image === null) {
      return next;
    }

    return limitView(
      next,
      { width: image.offsetWidth, height: image.offsetHeight },
      { width: stage.clientWidth, height: stage.clientHeight },
    );
  }, [imageRef]);

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

  const onPointerDown = (event: StagePointerEvent) => {
    suppressClickRef.current = false;

    // 没放大就没有可移动的余地：这一下仍按「点了一下画面」（开合 header）处理
    if (!enabled || viewRef.current.scale <= MIN_IMAGE_SCALE) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      moved: false,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const onPointerMove = (event: StagePointerEvent) => {
    const drag = dragRef.current;

    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved) {
      // 手抖一两个像素仍然算「点了一下」：过了阈值才真正进入拖拽态
      if (Math.hypot(dx, dy) < DRAG_CLICK_SLOP) {
        return;
      }

      drag.moved = true;
      setDragging(true);
    }

    applyView(
      fitView({
        scale: viewRef.current.scale,
        x: drag.originX + dx,
        y: drag.originY + dy,
      }),
    );
  };

  const endDrag = (event: StagePointerEvent) => {
    const drag = dragRef.current;

    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setDragging(false);
    suppressClickRef.current = drag.moved;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** 拖拽后的 `click` 在捕获阶段就吞掉：它不再冒到外层那颗「点画面开合 header」的按钮上 */
  const onClickCapture = (event: StageClickEvent) => {
    if (!suppressClickRef.current) {
      return;
    }

    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  /**
   * 滚轮与 Safari 捏合只能挂原生监听：`preventDefault` 要生效，`wheel` 必须是
   * `passive: false`（React 的 `onWheel` 挂的是被动监听，拦不住整页缩放）。
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
      // 不带 ctrlKey 的两指滚动是页面滚动，不是捏合
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();

      if (!enabledRef.current) {
        return;
      }

      const step = clamp(
        Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED),
        WHEEL_ZOOM_STEP_MIN,
        WHEEL_ZOOM_STEP_MAX,
      );

      zoomTo(viewRef.current.scale * step, event.clientX, event.clientY);
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
  }, [zoomTo]);

  const reset = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    applyView(INITIAL_VIEW);
  }, [applyView]);

  return {
    dragging,
    imageRef,
    imageStyle: {
      transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
    },
    reset,
    stageProps: {
      onClickCapture,
      // 指针被系统 / 浏览器收走（切窗口、触控板手势被打断）也要结束这一手，别让光标卡在「抓着」
      onLostPointerCapture: endDrag,
      onPointerCancel: endDrag,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
    },
    stageRef,
    zoomed: view.scale > MIN_IMAGE_SCALE,
  };
};
