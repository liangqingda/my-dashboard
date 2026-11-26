/**
 * 两个落点动作：松手在文件夹上 / 松手在落点区空白处。
 *
 * 两者的共同规矩都收在这里：**本来就在目标目录里的那几条剔出来不搬**（移了等于没动），
 * 全都在里面时干脆不搬、只给一句提示并把条目放回手里。
 */

import type { RefObject } from 'react';

import type { DraggableEntry } from '../../types';

import { notifyNoMove } from './notify';
import { splitByParent } from './utils';
import type { DragMoveSession, DragMoveView } from './types';

/** 入参：会话镜像、当前层镜像，以及「搬」「放回手里」两个入口 */
export type DropsArgs = {
  /** 当前会话（搬的过程中不会换批） */
  sessionRef: RefObject<DragMoveSession | null>;
  /** 弹窗当前停在哪一层 */
  viewRef: RefObject<DragMoveView | null>;
  /** 移动在飞：挡住重复松手 */
  movingRef: RefObject<boolean>;
  /** 这一批里不在目标目录的那些路径 + 被剔出来的条数 */
  runMove: (sources: string[], targetDir: string, skipped: number) => Promise<void>;
  /** 放回手里（这一步不关窗） */
  endDrag: () => void;
};

export const useDrops = ({ endDrag, movingRef, runMove, sessionRef, viewRef }: DropsArgs) => {
  /** 这一批里谁要搬：已经在目标目录里的剔出来，剩下的按原顺序给路径 */
  const plan = (entries: DraggableEntry[], targetDir: string) => {
    const { movable, skipped } = splitByParent(entries, targetDir);

    return { skipped, sources: movable.map((entry) => entry.path) };
  };

  /**
   * 松手 / 点在某文件夹上：立刻移进去（停留到一秒那条路径是「进入」，不是「移入」）。
   * 把条目拖进它自己所在的文件夹那种「落进自己」照样挡掉（后端也会拒，但提示像 bug）。
   */
  const dropOnFolder = (targetDir: string) => {
    const active = sessionRef.current;

    if (
      active === null ||
      movingRef.current ||
      active.entries.some((entry) => entry.path === targetDir)
    ) {
      return;
    }

    const { skipped, sources } = plan(active.entries, targetDir);

    if (sources.length === 0) {
      notifyNoMove(targetDir);
      endDrag();

      return;
    }

    void runMove(sources, targetDir, skipped);
  };

  /** 松手在落点区空白处：等于放进当前这一层；全都在这一层时只把条目放回手里、弹窗别关 */
  const dropOnBlank = () => {
    const active = sessionRef.current;
    const { current } = viewRef;

    if (active === null || current === null || movingRef.current) {
      return;
    }

    const { skipped, sources } = plan(active.entries, current.path);

    if (sources.length === 0) {
      endDrag();

      return;
    }

    void runMove(sources, current.path, skipped);
  };

  return { dropOnBlank, dropOnFolder };
};
