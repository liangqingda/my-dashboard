import { useEffect, useState } from 'react';

import { entryIcon } from '../utils/entry-icon';

import type { DragGhostProps } from './types';

import styles from './index.scss';

/** 最多画三层图标：再多也只是叠得更糊，数量由左上角的红点说明 */
const MAX_LAYERS = 3;

/**
 * 拖拽影像：跟着指针走的一叠图标 + 左上角红色数量。
 *
 * 浏览器自带的那张半透明快照已经在 `dragstart` 里换成了透明像素
 * （见 `utils/drag-image.ts`），所以拖拽期间屏幕上只由这里画：
 * 图标比瓦片小一圈、进场时缩放一下，拖动时能一眼看出「拖的是哪几项、几项」。
 * 位置只认 `dragover` 的坐标——拖拽事件每秒几十次，这里只存一份坐标、不碰其它状态。
 */
const DragGhost = ({ entries }: DragGhostProps) => {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleOver = (event: DragEvent) => {
      setPoint({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('dragover', handleOver);

    return () => window.removeEventListener('dragover', handleOver);
  }, []);

  const layers = entries.slice(0, MAX_LAYERS);

  return (
    <div
      aria-hidden="true"
      className={styles.ghost}
      data-placed={point !== null}
      style={point === null ? undefined : { left: point.x, top: point.y }}
    >
      <div className={styles.stack}>
        {layers.map((entry, index) => {
          const Icon = entryIcon(entry);

          return (
            <span
              className={styles.layer}
              key={entry.path}
              style={{
                transform: `translate(${index * -5}px, ${index * -5}px) scale(${1 - index * 0.12})`,
                zIndex: layers.length - index,
              }}
            >
              <Icon aria-hidden="true" className={styles.icon} size={34} stroke={1.2} />
            </span>
          );
        })}
      </div>
      {entries.length > 1 ? (
        <span className={styles.count}>{entries.length}</span>
      ) : null}
    </div>
  );
};

export default DragGhost;
