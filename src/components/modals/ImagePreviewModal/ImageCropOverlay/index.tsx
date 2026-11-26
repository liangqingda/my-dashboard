/**
 * 裁剪层的交互壳：把选框叠在图片上，拖框平移、拖八个手柄改尺寸。
 *
 * 位置一律按**图片的布局尺寸**（`offsetLeft / offsetWidth`）算，不看 `getBoundingClientRect`：
 * 后者会把 `transform: scale()` 算进去，图片还带着上一档缩放时选框就对不上了。
 * 进入裁剪时 `ImageStage` 会把缩放复位到 1 倍，这里的测量才是所见即所得。
 *
 * 指针拖拽走 Pointer Events + 指针捕获：手指 / 三指拖拽 / 鼠标同一套，
 * 拖出舞台也不会断（松手在画面外仍能收尾）。
 */

import { useEffect, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';

import type { CropRect } from '../utils';

import {
  CROP_HANDLES,
  HANDLE_CURSOR,
  HANDLE_POSITION,
  moveCropRect,
  resizeCropRect,
  type CropHandle,
} from './utils';

import styles from './index.scss';

/** 选框在舞台坐标系里的位置与尺寸（px） */
type CropBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** 一次拖拽：按下那一刻的选框与指针位置；移动时按总位移现算 */
type CropDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  rect: CropRect;
} & ({ kind: 'move' } | { kind: 'resize'; handle: CropHandle });

/** 选框的最小边长（px）：再小就抓不住手柄了 */
const MIN_CROP_SIZE = 32;

/** 裁剪层的入参 */
export type ImageCropOverlayProps = {
  /** 图片节点：量它的布局位置与尺寸 */
  imageRef: RefObject<HTMLImageElement | null>;
  /** 图片舞台：窗口 / 全屏尺寸变化时重新量 */
  stageRef: RefObject<HTMLDivElement | null>;
  /** 当前选框（比例） */
  rect: CropRect;
  /** 拖动后回传新的选框 */
  onChange: (rect: CropRect) => void;
};

const ImageCropOverlay = ({
  imageRef,
  onChange,
  rect,
  stageRef,
}: ImageCropOverlayProps) => {
  const [box, setBox] = useState<CropBox | null>(null);
  const dragRef = useRef<CropDrag | null>(null);

  /** 量图片在舞台里的布局矩形；舞台或图片尺寸一变就重量（窗口缩放、进出全屏） */
  useEffect(() => {
    const stage = stageRef.current;
    const image = imageRef.current;

    if (stage === null || image === null) {
      return undefined;
    }

    const measure = () => {
      const next: CropBox = {
        height: image.offsetHeight,
        left: image.offsetLeft,
        top: image.offsetTop,
        width: image.offsetWidth,
      };

      setBox((prev) =>
        prev !== null &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(image);
    observer.observe(stage);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [imageRef, stageRef]);

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    drag: { kind: 'move' } | { kind: 'resize'; handle: CropHandle },
  ) => {
    if (box === null) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      ...drag,
      pointerId: event.pointerId,
      rect,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (drag === null || box === null || drag.pointerId !== event.pointerId) {
      return;
    }

    if (box.width <= 0 || box.height <= 0) {
      return;
    }

    const dx = (event.clientX - drag.startX) / box.width;
    const dy = (event.clientY - drag.startY) / box.height;

    if (drag.kind === 'move') {
      onChange(moveCropRect(drag.rect, dx, dy));

      return;
    }

    onChange(
      resizeCropRect(
        drag.rect,
        drag.handle,
        dx,
        dy,
        Math.min(1, MIN_CROP_SIZE / box.width),
        Math.min(1, MIN_CROP_SIZE / box.height),
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className={styles.layer}>
      {box === null ? null : (
        <>
          <div
            className={styles.selection}
            onLostPointerCapture={endDrag}
            onPointerCancel={endDrag}
            onPointerDown={(event) => beginDrag(event, { kind: 'move' })}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            style={{
              height: rect.height * box.height,
              left: box.left + rect.x * box.width,
              top: box.top + rect.y * box.height,
              width: rect.width * box.width,
            }}
          >
            {CROP_HANDLES.map((handle) => (
              <span
                aria-hidden="true"
                className={styles.handle}
                key={handle}
                onLostPointerCapture={endDrag}
                onPointerCancel={endDrag}
                onPointerDown={(event) =>
                  beginDrag(event, { handle, kind: 'resize' })
                }
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                style={{
                  cursor: HANDLE_CURSOR[handle],
                  left: HANDLE_POSITION[handle].left,
                  top: HANDLE_POSITION[handle].top,
                }}
              />
            ))}
          </div>
          <span className={styles.hint}>拖动选框调整裁剪范围</span>
        </>
      )}
    </div>
  );
};

export default ImageCropOverlay;
