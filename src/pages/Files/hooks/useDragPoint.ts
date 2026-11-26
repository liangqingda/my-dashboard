/**
 * 拖拽期间指针落在哪（`dragover` 的坐标）：拖拽影像 `DragGhost` / `DragTiles` 都靠它跟手。
 *
 * 拖拽事件每秒几十次，这里只存一份坐标、不碰其它状态；还没收到第一次 `dragover` 时返回 null，
 * 调用方据此先不画（浏览器给拖拽影像的入场需要一帧真正的位置）。
 */

import { useEffect, useState } from 'react';

/** 指针坐标；null 表示这一程还没开始挪动 */
export type DragPoint = { x: number; y: number } | null;

export const useDragPoint = (): DragPoint => {
  const [point, setPoint] = useState<DragPoint>(null);

  useEffect(() => {
    const handleOver = (event: DragEvent) => {
      setPoint({ x: event.clientX, y: event.clientY });
    };

    /*
     * 必须走捕获阶段：落点组件常常 `stopPropagation()`（不让外层去点亮空白热区），
     * 冒泡收不到事件的话影像就会在指针进入那一格的一刻冻住，看起来像被拦在落点外面。
     */
    window.addEventListener('dragover', handleOver, true);

    return () => window.removeEventListener('dragover', handleOver, true);
  }, []);

  return point;
};
