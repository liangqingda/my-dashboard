/**
 * 「松手了就去搬」那一程：逐条提交、至少演一秒、搬完一批后再判要不要关窗。
 *
 * 单独成 hook 是为了不让会话状态机（`index.ts`）被一串异步撑爆：
 * 这里只拿会话的几个入口（读当前会话、累计已搬、写回会话 / 进度），判定口径仍写在同目录 `README.md`。
 */

import type { Dispatch, RefObject, SetStateAction } from 'react';

import type { DraggableEntry } from '../../types';
import { playMoveSound, primeMoveSound } from '../../utils/move-sound';

import { MIN_MOVE_MS } from './constants';
import { notifyMoveDone } from './notify';
import { runSequentialMove } from './run-move';
import { sessionLayout } from './utils';
import type { DragMoveSession, MoveProgress } from './types';

/** 入参：会话的读写口与「搬一条」那一层 */
export type MoveRunnerArgs = {
  /** 当前会话；搬的过程中会话不会换批，读它判「整批还剩谁」 */
  sessionRef: RefObject<DragMoveSession | null>;
  /** 本会话已搬成功的路径（跨多次「拖一条搬一条」累计） */
  movedRef: RefObject<string[]>;
  /** 移动请求在飞：挡住重复松手带来的第二次提交 */
  movingRef: RefObject<boolean>;
  /** 执行移动；成功返回 true */
  moveEntry: (source: string, targetDir: string) => Promise<boolean>;
  /** 整批都搬走了：把最后落成的目录回给页面 */
  onAllMoved?: (targetDir: string) => void;
  /** 关窗（条目都搬走了） */
  close: () => void;
  /** 放回手里（有失败，或还有没搬的） */
  endDrag: () => void;
  /** 清掉悬停态（搬完换手时别留倒计时条） */
  resetHover: () => void;
  setSession: (session: DragMoveSession | null) => void;
  setDragActive: Dispatch<SetStateAction<boolean>>;
  setHanded: Dispatch<SetStateAction<boolean>>;
  setMovedPaths: Dispatch<SetStateAction<string[]>>;
  setProgress: Dispatch<SetStateAction<MoveProgress | null>>;
};

/** 搬完以后的界面语义：全搬走才关窗并跟到目标目录，否则把剩下的留在弹窗里 */
const settle = (args: MoveRunnerArgs, active: DragMoveSession, targetDir: string): void => {
  const { movedRef, sessionRef } = args;
  const remaining = sessionLayout(active).filter(
    (entry: DraggableEntry) => !movedRef.current.includes(entry.path),
  );

  if (remaining.length === 0) {
    args.close();
    playMoveSound();
    args.onAllMoved?.(targetDir);

    return;
  }

  const rest: DragMoveSession = { entries: remaining, origin: active.origin };

  // 会话镜像跟着换：下一次松手判的就是这剩下的一批
  sessionRef.current = rest;

  args.setSession(rest);
  args.resetHover();
  args.setDragActive(false);
  args.setHanded(true);
};

/** 至少演够 `MIN_MOVE_MS` 再往下走：本机搬一条是毫秒级的事，进度窗不能一闪而过 */
const waitForMinimum = async (startedAt: number): Promise<void> => {
  const left = MIN_MOVE_MS - (Date.now() - startedAt);

  if (left > 0) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, left);
    });
  }
};

export const useMoveRunner = (args: MoveRunnerArgs) => {
  const { moveEntry, movedRef, movingRef, sessionRef, setProgress } = args;

  /** `skipped`：这一批里本来就在目标目录、被剔出来没搬的条数（只用于提示文案） */
  return async (sources: string[], targetDir: string, skipped = 0): Promise<void> => {
    const active = sessionRef.current;

    if (active === null) {
      return;
    }

    // 这一步还在 drop 事件的任务里：先把音频解锁，移动成功后再出声
    primeMoveSound();
    movingRef.current = true;
    const startedAt = Date.now();

    try {
      const succeeded = await runSequentialMove({
        moveOne: (source, dir) => moveEntry(source, dir),
        onProgress: setProgress,
        sources,
        targetDir,
      });

      await waitForMinimum(startedAt);

      if (succeeded.length > 0) {
        movedRef.current = [...movedRef.current, ...succeeded];
        args.setMovedPaths(movedRef.current);
      }

      setProgress(null);

      // 有一条没搬成：停在手持态，失败原因由 `moveEntry` 自己弹通知
      if (succeeded.length !== sources.length) {
        args.endDrag();
        notifyMoveDone(succeeded.length, skipped, targetDir);

        return;
      }

      settle(args, active, targetDir);
      notifyMoveDone(succeeded.length, skipped, targetDir);
    } finally {
      movingRef.current = false;
    }
  };
};
