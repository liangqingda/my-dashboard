/**
 * 直接拖拽移动：设置里把「拖拽移动」切到「直接拖到文件夹」后，列表里拖起条目不再开全屏弹窗，
 * 目标就是列表里那些文件夹瓦片——hover 上去亮成放置目标，松手就搬进去。
 *
 * 与弹窗那套只共用判定（`splitByParent` / `allInsideDir`）与搬家那几件工具：
 * 这里自己拿一份「正在拖的条目 / 悬停在哪一格 / 正在搬的进度」，因为弹窗的整套会话状态对它没意义。
 *
 * 待拖拽区里的文件夹不能当落点（它自己也要被搬走），hover 时按禁用态处理并给提示。
 */

import { useRef, useState } from 'react';
import type { DragEvent } from 'react';

import type { DirectMoveArgs, DraggableEntry } from '../types';

import type { MoveProgress } from './use-drag-move/types';
import { MIN_MOVE_MS } from './use-drag-move/constants';
import { notifyMoveDone } from './use-drag-move/notify';
import { runSequentialMove } from './use-drag-move/run-move';
import { splitByParent } from './use-drag-move/utils';

/** 最少演够 `MIN_MOVE_MS` 再收进度窗：本机搬一条是毫秒级的事 */
const waitAtLeast = async (startedAt: number): Promise<void> => {
  const left = MIN_MOVE_MS - (Date.now() - startedAt);

  if (left > 0) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, left);
    });
  }
};

/** 直接拖拽移动的状态与动作 */
export const useDirectMove = ({ moveEntry, onMoved }: DirectMoveArgs) => {
  /** 正在被拖的条目；null 表示没在拖 */
  const [dragging, setDragging] = useState<DraggableEntry[] | null>(null);
  /** 指针正压在哪一格文件夹（亮成放置目标）；null 表示没有 */
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  /** 指针正压在一个不能落进去的文件夹（它在待拖拽区里）；null 表示没有 */
  const [blockedPath, setBlockedPath] = useState<string | null>(null);
  /** 正在搬的进度；null 表示没在搬 */
  const [progress, setProgress] = useState<MoveProgress | null>(null);
  /** 移动请求在飞：挡住重复松手带来的第二次提交 */
  const busyRef = useRef(false);

  /** 拖起这一批：不清进度窗，搬家过程中也不该再有拖拽 */
  const begin = (entries: DraggableEntry[]) => {
    setDragging(entries);
    setHoverPath(null);
    setBlockedPath(null);
  };

  /** 拖拽结束（松手 / Esc / 落在别处）：把高亮与禁用提示一起收掉 */
  const end = () => {
    setDragging(null);
    setHoverPath(null);
    setBlockedPath(null);
  };

  /**
   * 指针经过某一格：`blocked` 由页面算（这一格是不是在待拖拽区里）。
   * 禁用时把悬停挪走、只记禁用那一格，让人看出「不是没放准，是不能放」。
   */
  const dragOver = (
    path: string,
    event: DragEvent<HTMLElement>,
    blocked: boolean,
  ) => {
    event.preventDefault();

    const { dataTransfer } = event;

    dataTransfer.dropEffect = blocked ? 'none' : 'move';
    setBlockedPath(blocked ? path : null);
    setHoverPath(blocked ? null : path);
  };

  /** 指针离开某一格 */
  const leave = () => {
    setHoverPath(null);
    setBlockedPath(null);
  };

  /** 松手放进这一格：剔掉本来就在里面的与拖到自身的，逐条搬完再弹提示 */
  const drop = async (targetDir: string): Promise<void> => {
    const entries = dragging;

    end();

    if (entries === null || entries.length === 0 || busyRef.current) {
      return;
    }

    // 拖文件夹到它自己身上：不算移动
    const candidates = entries.filter((entry) => entry.path !== targetDir);
    const { movable, skipped } = splitByParent(candidates, targetDir);

    if (movable.length === 0) {
      notifyMoveDone(0, skipped, targetDir);

      return;
    }

    busyRef.current = true;
    const startedAt = Date.now();

    try {
      const succeeded = await runSequentialMove({
        moveOne: (source, dir) => moveEntry(source, dir),
        onProgress: setProgress,
        sources: movable.map((entry) => entry.path),
        targetDir,
      });

      await waitAtLeast(startedAt);
      setProgress(null);
      notifyMoveDone(succeeded.length, skipped, targetDir);
      onMoved(movable.filter((entry) => succeeded.includes(entry.path)), targetDir);
    } finally {
      busyRef.current = false;
    }
  };

  return {
    begin,
    blockedPath,
    dragging,
    dragOver,
    drop,
    end,
    hoverPath,
    leave,
    progress,
  };
};
