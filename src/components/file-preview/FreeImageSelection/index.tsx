/**
 * 图片选框：叠在图片盒子上的一层可拖矩形，拖框平移、拖八个手柄改尺寸，只回传归一化矩形。
 *
 * 它不裁剪、不编码、不写盘，也不自己量 DOM——图片盒子由 `FreeImage` 的 `overlay` 回调给出，
 * 与画面同一个坐标系，所以窗口缩放、进出全屏时选框跟着画面走，不必各自量一遍再对时间。
 * 比例一律按盒子的布局尺寸算（`box.width / box.height`），不看 `getBoundingClientRect`：
 * 后者会把 `transform: scale()` 算进去，图片还带着上一档缩放时选框就错位了
 * （进裁剪时 `FreeImage` 会先复位到 1 倍，见 `../FreeImage/README.md`）。
 *
 * 拖拽走 Pointer Events + 指针捕获：手指 / 鼠标同一套，拖出画面也不会断（松手在画面外仍能收尾）。
 */

import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import type { ImageBox } from '../FreeImage/types';

import type { SelectionRect } from './types';
import {
  HANDLE_CURSOR,
  HANDLE_POSITION,
  moveSelectionRect,
  resizeSelectionRect,
  SELECTION_HANDLES,
  type SelectionHandle,
} from './utils';

import styles from './index.scss';

/** 选框的最小边长（px）：再小就抓不住手柄了 */
const MIN_SELECTION_SIZE = 32;

/** 默认提示：调用方不传时说明怎么拖 */
const DEFAULT_HINT = '拖动选框调整裁剪范围';

/** 一次拖拽：按下那一刻的选框与指针位置；移动时按总位移现算 */
type SelectionDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  rect: SelectionRect;
} & ({ kind: 'move' } | { kind: 'resize'; handle: SelectionHandle });

/** 图片选框的入参 */
export type FreeImageSelectionProps = {
  /** 图片在舞台里的布局矩形，由 `FreeImage` 的 `overlay` 回调给出 */
  box: ImageBox;
  /** 当前选框（相对图片的比例 0–1） */
  rect: SelectionRect;
  /** 拖动后回传新的选框 */
  onChange: (rect: SelectionRect) => void;
  /** 选框下方的提示文案；不传用「拖动选框调整裁剪范围」 */
  hint?: string;
};

const FreeImageSelection = ({
  box,
  hint = DEFAULT_HINT,
  onChange,
  rect,
}: FreeImageSelectionProps) => {
  const dragRef = useRef<SelectionDrag | null>(null);

  if (box.width <= 0 || box.height <= 0) {
    return null;
  }

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    drag: { kind: 'move' } | { kind: 'resize'; handle: SelectionHandle },
  ) => {
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

    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = (event.clientX - drag.startX) / box.width;
    const dy = (event.clientY - drag.startY) / box.height;

    if (drag.kind === 'move') {
      onChange(moveSelectionRect(drag.rect, dx, dy));

      return;
    }

    onChange(
      resizeSelectionRect(
        drag.rect,
        drag.handle,
        dx,
        dy,
        Math.min(1, MIN_SELECTION_SIZE / box.width),
        Math.min(1, MIN_SELECTION_SIZE / box.height),
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
        {SELECTION_HANDLES.map((handle) => (
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
      <span className={styles.hint}>{hint}</span>
    </div>
  );
};

export default FreeImageSelection;
