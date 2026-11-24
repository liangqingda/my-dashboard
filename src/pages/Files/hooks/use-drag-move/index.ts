import { useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/utils/error';

import type { FolderEntry } from '../../types';
import { fetchFileDir } from '../../utils/files-api';
import { playMoveSound, primeMoveSound } from '../../utils/move-sound';

import { PARENT_HOVER_MS, SPRING_ENTER_MS, SPRING_HOVER_MS } from './constants';
import type { DragMoveLevel, DragMoveSession, UseDragMoveArgs } from './types';
import { backLevels, clearTimer, enterLevel, fillLevelFolders, stripSelf } from './utils';

/**
 * 拖拽移动会话的状态与动作（调用方式与判定见同目录 `README.md`）：
 * 弹窗只负责呈现，页面只把它接到拖动源的开始 / 结束事件上。
 *
 * 三条判定都在这里：
 * - 停够时间＝进入（文件夹 `SPRING_HOVER_MS`，底部「上一层」`PARENT_HOVER_MS`）；
 * - 松手＝移动或放弃（文件夹 / 空白 / 取消区 / 上一层各一种落点）；
 * - 目录栈往后退时弹窗留在原地。浏览器在松手那一刻就结束了整次拖拽，
 *   所以留窗之后只能靠点选继续——这个状态叫 `dragEnded`，`endDrag` 认它才不关窗。
 */
export const useDragMove = ({
  currentDir,
  currentName,
  currentFolders,
  moveEntry,
}: UseDragMoveArgs) => {
  /** 当前会话；null 表示弹窗关闭 */
  const [session, setSession] = useState<DragMoveSession | null>(null);
  /** 弹窗里的目录栈：第 0 层是拖拽起点，之后每深入一层追加一条 */
  const [levels, setLevels] = useState<DragMoveLevel[]>([]);
  /** 读取当前层失败的原因 */
  const [error, setError] = useState<string | null>(null);
  /** 指针正停在哪个文件夹上（决定倒计时条与进入计时） */
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  /** 正在播弹起动画的文件夹路径 */
  const [springPath, setSpringPath] = useState<string | null>(null);
  /** 「上一层」停靠区正在计时：弹窗据此点亮它 */
  const [parentHovering, setParentHovering] = useState(false);
  /** 拖拽已在松手时结束、弹窗按规则留着：不能再拖，改用点选继续 */
  const [dragEnded, setDragEnded] = useState(false);

  /** 状态镜像：事件回调里要读到「此刻」的值，不能依赖某一次渲染的闭包 */
  const sessionRef = useRef<DragMoveSession | null>(null);
  const levelsRef = useRef<DragMoveLevel[]>([]);
  const hoverRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const parentTimerRef = useRef<number | null>(null);
  /** 这一次停靠在「上一层」上是否还能再退：同一次停留不连续后退，离开再进来才重新计时 */
  const parentArmedRef = useRef(true);
  /** 本会话读过盘的目录：来回进出同一层不必再扫一遍 */
  const cacheRef = useRef<Map<string, FolderEntry[]>>(new Map());
  /** 移动请求在飞：挡住重复松手带来的第二次提交 */
  const movingRef = useRef(false);
  /** 这次 `dragend` 不该关窗（留窗给人点选），用一次就复位 */
  const keepOpenRef = useRef(false);

  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  /** 文件夹悬停态归零：两级计时、目标、弹起动画一起清（不清计时器，松手后还会被带进文件夹） */
  const resetHover = () => {
    clearTimer(hoverTimerRef.current, () => {
      hoverTimerRef.current = null;
    });
    clearTimer(enterTimerRef.current, () => {
      enterTimerRef.current = null;
    });
    hoverRef.current = null;
    setHoverPath(null);
    setSpringPath(null);
  };

  /** 「上一层」停靠区归零：计时、点亮、可再退的标记一起清 */
  const resetParentZone = () => {
    clearTimer(parentTimerRef.current, () => {
      parentTimerRef.current = null;
    });
    parentArmedRef.current = true;
    setParentHovering(false);
  };

  /** 开场与收场共用的清场：悬停、停靠区、留窗标记、读盘错误都在这里归零 */
  const resetTransient = () => {
    resetHover();
    resetParentZone();
    keepOpenRef.current = false;
    setError(null);
    setDragEnded(false);
  };

  /** 关掉弹窗并清空会话；已经在飞的移动不受影响 */
  const close = () => {
    resetTransient();
    sessionRef.current = null;
    setSession(null);
    setLevels([]);
  };

  /** 拖起一条目：弹窗从页面当前目录这一层打开，被拖的那个文件夹不进列表 */
  const open = (path: string, name: string) => {
    if (currentDir === null) {
      return;
    }

    resetTransient();
    cacheRef.current = new Map();

    const active = { name, path };

    sessionRef.current = active;
    setSession(active);
    setLevels([
      { folders: stripSelf(currentFolders, path), name: currentName, path: currentDir },
    ]);
  };

  /** 拖拽结束（松手 / 按 Esc）：弹窗收起，没落下的移动一律不执行 */
  const endDrag = () => {
    if (keepOpenRef.current) {
      keepOpenRef.current = false;

      return;
    }

    close();
  };

  /** 重置（切目录这类页面级清场），连同缓存一起丢掉 */
  const reset = () => {
    close();
    cacheRef.current = new Map();
  };

  const activeLevel = levels.at(-1) ?? null;
  const activePath = activeLevel?.path ?? null;
  const activeFolders = activeLevel?.folders ?? null;
  /** 当前层还没有子文件夹结果、也没报错：就是在读盘（不用单独存一份 loading 状态） */
  const loading = activePath !== null && activeFolders === null && error === null;

  /** 进到新的一层才需要读盘；缓存命中在 `enterFolder` 换层时就已经填进去了 */
  useEffect(() => {
    if (activePath === null || activeFolders !== null) {
      return undefined;
    }

    const controller = new AbortController();
    const source = sessionRef.current?.path ?? '';

    fetchFileDir(activePath, controller.signal)
      .then((listing) => {
        const folders = stripSelf(listing.folders, source);

        cacheRef.current.set(activePath, folders);
        setLevels((prev) => fillLevelFolders(prev, activePath, folders));
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(err, '读取不到这个文件夹的子文件夹'));
        }
      });

    return () => controller.abort();
  }, [activePath, activeFolders]);

  /** 真正进入一层：换层前先把弹起动画留出一点时间 */
  const enterFolder = (path: string) => {
    resetHover();
    setError(null);
    setLevels((prev) => enterLevel(prev, path, cacheRef.current.get(path) ?? null));
  };

  /** 指针停到某个文件夹上：同一个目标不重启计时，换目标才从头数 1.5 秒 */
  const hoverFolder = (path: string) => {
    if (hoverRef.current === path) {
      return;
    }

    resetHover();
    hoverRef.current = path;
    setHoverPath(path);

    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;
      setSpringPath(path);
      enterTimerRef.current = window.setTimeout(() => {
        enterTimerRef.current = null;
        enterFolder(path);
      }, SPRING_ENTER_MS);
    }, SPRING_HOVER_MS);
  };

  /** 指针离开某个文件夹：只清它自己的计时，别误清刚停上去的新目标 */
  const leaveFolder = (path: string) => {
    if (hoverRef.current !== path) {
      return;
    }

    resetHover();
  };

  /** 目录栈退回 `steps` 层：清掉悬停态与读盘错误，至少留住拖拽起点那一层 */
  const goOuter = (steps: number) => {
    resetHover();
    resetParentZone();
    setError(null);
    setLevels((prev) => backLevels(prev, steps));
  };

  /**
   * 把弹窗留给用户点选：松手时拖拽已经结束，`dragend` 随后就到，
   * 先立个标记让 `endDrag` 别关窗。
   */
  const keepOpen = () => {
    keepOpenRef.current = true;
    setDragEnded(true);
  };

  /** 指针停在「上一层」停靠区：满 0.5 秒退一层，同一次停留只退一层 */
  const hoverParentZone = () => {
    if (levelsRef.current.length <= 1) {
      return;
    }

    if (!parentArmedRef.current || parentTimerRef.current !== null) {
      return;
    }

    setParentHovering(true);
    parentTimerRef.current = window.setTimeout(() => {
      parentTimerRef.current = null;
      /*
       * 先退层、再收回「可再退」的标记：`goOuter` 会清场并重新武装，
       * 顺序反了就白清——指针停在原地，连续 dragover 会一路把目录栈退到顶。
       */
      goOuter(1);
      parentArmedRef.current = false;
    }, PARENT_HOVER_MS);
  };

  /** 指针离开「上一层」停靠区：清计时；再进来才能继续退 */
  const leaveParentZone = () => resetParentZone();

  /** 提交移动；成功才播落位音效（失败文案由 `moveEntry` 自己给） */
  const runMove = async (source: string, targetDir: string) => {
    // 这一步还在 drop 事件的任务里：先把音频解锁，移动成功后再出声
    primeMoveSound();
    movingRef.current = true;

    try {
      const moved = await moveEntry(source, targetDir);

      if (moved) {
        playMoveSound();
      }
    } finally {
      movingRef.current = false;
    }
  };

  /** 松手 / 点在某文件夹上：立刻移进去（停留到 1.5 秒那条路径是「进入」，不是「移入」） */
  const dropOnFolder = (targetDir: string) => {
    const active = sessionRef.current;

    if (active === null || movingRef.current || active.path === targetDir) {
      return;
    }

    close();
    void runMove(active.path, targetDir);
  };

  /** 松手在文件夹列表的空白处：等于放进当前这一层；已经在起点层就是原地，直接取消 */
  const dropOnBlank = () => {
    const active = sessionRef.current;
    const outer = levelsRef.current.at(0);
    const level = levelsRef.current.at(-1);

    if (active === null || outer === undefined || level === undefined || movingRef.current) {
      return;
    }

    close();

    if (level.path !== outer.path) {
      void runMove(active.path, level.path);
    }
  };

  /**
   * 底部两个停靠区的共同处理：有过上层就往回退 `steps` 层并留着弹窗（`dragEnded`），
   * 已在起点层没有更上层，等同放弃本次移动。
   */
  const stepBack = (steps: number) => {
    if (levelsRef.current.length > 1) {
      keepOpen();
      goOuter(steps);

      return;
    }

    close();
  };

  /** 松手在右下角取消区：一次退回最外层，弹窗不关 */
  const dropOnCancelZone = () => stepBack(levelsRef.current.length);

  /** 松手 / 点在左下角「上一层」：退一层 */
  const dropOnParentZone = () => stepBack(1);

  useEffect(
    () => () => {
      clearTimer(hoverTimerRef.current, () => {
        hoverTimerRef.current = null;
      });
      clearTimer(enterTimerRef.current, () => {
        enterTimerRef.current = null;
      });
      clearTimer(parentTimerRef.current, () => {
        parentTimerRef.current = null;
      });
    },
    [],
  );

  return {
    close,
    dragEnded,
    dropOnBlank,
    dropOnCancelZone,
    dropOnFolder,
    dropOnParentZone,
    endDrag,
    error,
    hoverFolder,
    hoverParentZone,
    hoverPath,
    leaveFolder,
    leaveParentZone,
    levels,
    loading,
    open,
    parentHovering,
    reset,
    session,
    springPath,
  };
};
