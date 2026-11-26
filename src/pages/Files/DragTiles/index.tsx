/**
 * 直接拖模式的拖拽影像：跟着指针走的是**整条瓦片**，不是一枚小图标。
 *
 * 瓦片本体在起拖那一刻由 `utils/drag-tile-image` 拷成 HTML（见那里为什么拷、为什么在那一刻拷），
 * 所以这里画出来的视频帧、文件名、体积、文件夹图标与版式都和列表里一模一样，
 * 只是被「拎起来」了：略缩到 94%、加投影、半透明。
 *
 * 位置只认 `dragover` 的坐标（共用的 `hooks/useDragPoint`），瓦片中心压着指针。
 */

import { useDragPoint } from '../hooks/useDragPoint';

import type { DragTilesProps } from './types';

import styles from './index.scss';

const DragTiles = ({ image, many }: DragTilesProps) => {
  const point = useDragPoint();

  return (
    <div
      aria-hidden="true"
      className={styles.ghost}
      data-placed={point !== null}
      style={
        point === null
          ? undefined
          : { height: image.height, left: point.x, top: point.y, width: image.width }
      }
    >
      {/* 拷来的那一条：本身不可交互，只在指针下面当影子 */}
      <div
        className={styles.tile}

        dangerouslySetInnerHTML={{ __html: image.html }}
        style={{ height: image.height, width: image.width }}
      />
      {many === null ? null : <span className={styles.count}>{many}</span>}
    </div>
  );
};

export default DragTiles;
