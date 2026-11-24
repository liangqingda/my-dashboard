import { useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/utils/error';

import type { FolderEntry } from '../../types';
import { fetchFileDir } from '../../utils/files-api';
import { playMoveSound, primeMoveSound } from '../../utils/move-sound';

import { SPRING_ENTER_MS, SPRING_HOVER_MS } from './constants';
import type { DragMoveLevel, DragMoveSession, UseDragMoveArgs } from './types';
import { fillLevelFolders } from './utils';

/**
 * 拖拽移动会话的状态与动作（会话的调用方式与判定见同目录 `README.md`）：
 * 弹窗只负责呈现，页面只负责把它接到拖动源与拖动结束事件上。
 * 进入子文件夹时按需读一次盘（同一会话内按路径缓存），取消区在多层时回最外层、
 * 在起点层则直接取消；移动成功才播落位音效。
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

  /** 状态镜像：事件回调里要读到「此刻」的值，不能依赖某一次渲染的闭包 */
  const sessionRef = useRef<DragMoveSession | null>(null);
  const levelsRef = useRef<DragMoveLevel[]>([]);
  const hoverRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  /** 本会话读过盘的目录：来回进出同一层不必再扫一遍 */
  const cacheRef = useRef<Map<string, FolderEntry[]>>(new Map());
  /** 移动请求在飞：挡住重复松手带来的第二次提交 */
  const movingRef = useRef(false);

  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  /** 清掉两级计时器；不清的话松手后它还会把用户带进某个文件夹 */
  const clearHoverTimers = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  };

  /** 悬停态归零：计时器、目标、弹起动画一起清 */
  const resetHover = () => {
    clearHoverTimers();
    hoverRef.current = null;
    setHoverPath(null);
    setSpringPath(null);
  };

  /** 关掉弹窗并清空会话；已经在飞的移动不受影响 */
  const close = () => {
    resetHover();
    sessionRef.current = null;
    setSession(null);
    setLevels([]);
    setError(null);
  };

  /** 拖起一条目：弹窗从页面当前目录这一层打开 */
  const open = (path: string, name: string) => {
    if (currentDir === null) {
      return;
    }

    clearHoverTimers();
    hoverRef.current = null;
    cacheRef.current = new Map();
    setHoverPath(null);
    setSpringPath(null);
    setError(null);

    const active = { name, path };

    sessionRef.current = active;
    setSession(active);
    setLevels([{ folders: currentFolders, name: currentName, path: currentDir }]);
  };

  /** 拖动结束（松手 / 按 Esc）：弹窗收起，没落下的移动一律不执行 */
  const endDrag = () => close();

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

    fetchFileDir(activePath, controller.signal)
      .then((listing) => {
        cacheRef.current.set(activePath, listing.folders);
        setLevels((prev) => fillLevelFolders(prev, activePath, listing.folders));
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
    setLevels((prev) => {
      const level = prev.at(-1);

      if (level === undefined || level.path === path) {
        return prev;
      }

      const target = level.folders?.find((folder) => folder.path === path);

      return [
        ...prev,
        {
          folders: cacheRef.current.get(path) ?? null,
          name: target?.name ?? path.split('/').at(-1) ?? path,
          path,
        },
      ];
    });
  };

  /** 指针停到某个文件夹上：同一个目标不重启计时，换目标才从头数 1.5 秒 */
  const hoverFolder = (path: string) => {
    if (hoverRef.current === path) {
      return;
    }

    clearHoverTimers();
    hoverRef.current = path;
    setHoverPath(path);
    setSpringPath(null);

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

  /** 松手在某文件夹上：立刻移进去（停留到 1.5 秒的那条路径是「进入」，不是「移入」） */
  const dropOnFolder = (targetDir: string) => {
    const active = sessionRef.current;

    if (active === null || movingRef.current) {
      return;
    }

    resetHover();
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

    resetHover();
    close();

    if (level.path !== outer.path) {
      void runMove(active.path, level.path);
    }
  };

  /** 松手在底部取消区：多层时退回最外层（弹窗不关），已在起点层则取消整次移动 */
  const dropOnCancelZone = () => {
    resetHover();

    if (levelsRef.current.length > 1) {
      setLevels((prev) => prev.slice(0, 1));
      setError(null);

      return;
    }

    close();
  };

  useEffect(
    () => () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }

      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
      }
    },
    [],
  );

  return {
    close,
    dropOnBlank,
    dropOnCancelZone,
    dropOnFolder,
    endDrag,
    error,
    hoverFolder,
    hoverPath,
    leaveFolder,
    levels,
    loading,
    open,
    reset,
    session,
    springPath,
  };
};
