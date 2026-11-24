import { useEffect, useRef, useState } from 'react';

import type { FileEntry, FolderEntry } from '../../types';
import { playMoveSound, primeMoveSound } from '../../utils/move-sound';

import { SPRING_ENTER_MS, SPRING_HOVER_MS } from './constants';
import type { DragMoveSession, DragMoveView, UseDragMoveArgs } from './types';
import { useViewFolders } from './use-view-folders';
import { clearTimer, stripSelf } from './utils';

/**
 * 拖拽移动会话的状态与动作（调用方式与判定见同目录 `README.md`）：
 * 弹窗只负责呈现，页面只把它接到拖动源的开始 / 结束事件上。
 *
 * 三层状态：
 * - `session`：被拖的是谁、从哪来，弹窗开着就有它；
 * - `view`：弹窗现在停在哪一层目录，可以凭面包屑 / 点击 / 停止计时自由上下走，一直到根；
 * - `dragActive` / `handed`：条目是「正在被拖」还是「已经放回手里」。
 *
 * 只有成功移动会关窗；其余任何松手都只是把条目放回手里（`handed`），
 * 因为浏览器在松手那一刻就结束了整次拖拽，必须留着弹窗让人重新拖起。
 */
export const useDragMove = ({
  currentDir,
  currentFolders,
  moveEntry,
}: UseDragMoveArgs) => {
  /** 当前会话；null 表示弹窗关闭 */
  const [session, setSession] = useState<DragMoveSession | null>(null);
  /** 弹窗停在哪一层 */
  const [view, setView] = useState<DragMoveView | null>(null);
  /** 读取当前层失败的原因 */
  const [error, setError] = useState<string | null>(null);
  /** 指针正停在哪个文件夹上（决定倒计时条与进入计时） */
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  /** 正在播弹起动画的文件夹路径 */
  const [springPath, setSpringPath] = useState<string | null>(null);
  /** 拖拽在飞（页面瓦片或弹窗里的手持卡片拖起来的都算） */
  const [dragActive, setDragActive] = useState(false);
  /** 手持态：拖拽已经结束，条目放回手里等人再拖 */
  const [handed, setHanded] = useState(false);

  /** 状态镜像：事件回调里要读到「此刻」的值，不能依赖某一次渲染的闭包 */
  const sessionRef = useRef<DragMoveSession | null>(null);
  const viewRef = useRef<DragMoveView | null>(null);
  const hoverRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  /** 本会话读过盘的目录：来回进出同一层不必再扫一遍 */
  const cacheRef = useRef<Map<string, FolderEntry[]>>(new Map());
  /** 移动请求在飞：挡住重复松手带来的第二次提交 */
  const movingRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

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

  /** 关掉弹窗并清空会话：条目留在原位，什么都没写 */
  const close = () => {
    resetHover();
    sessionRef.current = null;
    setSession(null);
    setView(null);
    setError(null);
    setDragActive(false);
    setHanded(false);
  };

  /** 重置（切目录这类页面级清场），连同缓存一起丢掉 */
  const reset = () => {
    close();
    cacheRef.current = new Map();
  };

  /**
   * 拖起一条目：弹窗从页面当前目录这一层打开，被拖的那个文件夹不进列表。
   * 会话记下条目本体：手持卡片按它换图标，图片 / 视频还能点开预览。
   */
  const open = (entry: FolderEntry | FileEntry) => {
    if (currentDir === null) {
      return;
    }

    resetHover();
    cacheRef.current = new Map();
    setError(null);
    setHanded(false);
    setDragActive(true);

    const active: DragMoveSession = {
      file: 'category' in entry ? entry : null,
      name: entry.name,
      origin: currentDir,
      path: entry.path,
    };

    sessionRef.current = active;
    setSession(active);
    setView({ folders: stripSelf(currentFolders, entry.path), path: currentDir });
  };

  /** 从弹窗里的手持卡片再次拖起：会话还在，只把拖拽状态重新点亮 */
  const beginDrag = () => {
    resetHover();
    setHanded(false);
    setDragActive(true);
  };

  /** 拖拽结束（松手 / Esc / 落在非落点区域）：条目回到手里，弹窗留着 */
  const endDrag = () => {
    if (sessionRef.current === null) {
      return;
    }

    setDragActive(false);
    setHanded(true);
  };

  /** 换一层：命中缓存就不再读盘，没缓存的那一趟由 effect 发起 */
  const goTo = (path: string) => {
    resetHover();
    setError(null);
    setView({ folders: cacheRef.current.get(path) ?? null, path });
  };

  /** 当前层被外部改过（新建文件夹、改名）：丢掉缓存、让读盘 effect 再走一趟 */
  const refreshView = () => {
    const dir = viewRef.current?.path;

    if (dir === undefined) {
      return;
    }

    cacheRef.current.delete(dir);
    setError(null);
    setView({ folders: null, path: dir });
  };

  const activePath = view?.path ?? null;
  const activeFolders = view?.folders ?? null;
  /** 当前层还没有子文件夹结果、也没报错：就是在读盘（不用单独存一份 loading 状态） */
  const loading = activePath !== null && activeFolders === null && error === null;

  // 当前层没有结果时才读一次盘；切层即中止，迟到的响应按路径挡掉
  useViewFolders({
    cacheRef,
    folders: activeFolders,
    path: activePath,
    sessionRef,
    setError,
    setView,
  });

  /** 指针停到某个文件夹上：同一个目标不重启计时，换目标才从头数半秒 */
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
        goTo(path);
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

  /** 松手 / 点在某文件夹上：立刻移进去（停留到半秒那条路径是「进入」，不是「移入」） */
  const dropOnFolder = (targetDir: string) => {
    const active = sessionRef.current;

    if (active === null || movingRef.current || active.path === targetDir) {
      return;
    }

    close();
    void runMove(active.path, targetDir);
  };

  /**
   * 松手在文件夹列表的空白处：等于放进当前这一层。
   * 当前层就是条目原本所在的目录时，移了也没变化，只把条目放回手里、弹窗别关。
   */
  const dropOnBlank = () => {
    const active = sessionRef.current;
    const { current } = viewRef;

    if (active === null || current === null || movingRef.current) {
      return;
    }

    if (current.path === active.origin) {
      endDrag();

      return;
    }

    close();
    void runMove(active.path, current.path);
  };

  useEffect(
    () => () => {
      clearTimer(hoverTimerRef.current, () => {
        hoverTimerRef.current = null;
      });
      clearTimer(enterTimerRef.current, () => {
        enterTimerRef.current = null;
      });
    },
    [],
  );

  return {
    beginDrag,
    close,
    dragActive,
    dropOnBlank,
    dropOnFolder,
    endDrag,
    error,
    goTo,
    handed,
    hoverFolder,
    hoverPath,
    leaveFolder,
    loading,
    open,
    refreshView,
    reset,
    session,
    springPath,
    view,
  };
};
