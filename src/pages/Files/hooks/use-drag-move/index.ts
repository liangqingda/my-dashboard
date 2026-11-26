import { useEffect, useRef, useState } from 'react';

import type { DraggableEntry, FolderEntry } from '../../types';

import { useHoverTargets } from './use-hover-targets';
import { focusSession, restoreSession, stripSelf } from './utils';
import { useDrops } from './use-drops';
import type {
  DragMoveSession,
  DragMoveView,
  MoveProgress,
  UseDragMoveArgs,
} from './types';
import { useMoveRunner } from './use-move-runner';
import { useViewFolders } from './use-view-folders';

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
  onAllMoved,
}: UseDragMoveArgs) => {
  /** 当前会话；null 表示弹窗关闭 */
  const [session, setSession] = useState<DragMoveSession | null>(null);
  /** 弹窗停在哪一层 */
  const [view, setView] = useState<DragMoveView | null>(null);
  /** 读取当前层失败的原因 */
  const [error, setError] = useState<string | null>(null);
  /** 拖拽在飞（页面瓦片或弹窗里的待拖拽区拖起来的都算） */
  const [dragActive, setDragActive] = useState(false);
  /** 手持态：拖拽已经结束，条目放回手里等人再拖 */
  const [handed, setHanded] = useState(false);
  /** 本会话已经移动成功的路径：页面据此把它们从待拖拽区摘掉 */
  const [movedPaths, setMovedPaths] = useState<string[]>([]);
  /** 正在搬的进度：逐条提交时给界面看（搬到外接盘这类慢盘尤其需要） */
  const [progress, setProgress] = useState<MoveProgress | null>(null);

  /** 状态镜像：事件回调里要读到「此刻」的值，不能依赖某一次渲染的闭包 */
  const sessionRef = useRef<DragMoveSession | null>(null);
  const viewRef = useRef<DragMoveView | null>(null);
  /** 本会话读过盘的目录：来回进出同一层不必再扫一遍 */
  const cacheRef = useRef<Map<string, FolderEntry[]>>(new Map());
  /** 移动请求在飞：挡住重复松手带来的第二次提交 */
  const movingRef = useRef(false);
  /** 本会话已搬成功的路径（跨多次「拖一条搬一条」累计；状态那份给界面用，这份给判定用） */
  const movedRef = useRef<string[]>([]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /** 关掉弹窗并清空会话：条目留在原位，什么都没写 */
  const close = () => {
    resetHover();
    setProgress(null);
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
   * 拖起一批条目：弹窗从页面当前目录这一层打开，被拖的文件夹都不进落点列表。
   * 会话记下条目本体：弹窗里的待拖拽区按它们的类型换图标、平铺成一行一条。
   */
  const open = (entries: DraggableEntry[]) => {
    if (currentDir === null || entries.length === 0) {
      return;
    }

    resetHover();
    cacheRef.current = new Map();
    setError(null);
    setHanded(false);
    setMovedPaths([]);
    movedRef.current = [];
    setProgress(null);
    setDragActive(true);

    const active: DragMoveSession = { entries, origin: currentDir };

    sessionRef.current = active;
    setSession(active);
    setView({
      folders: stripSelf(
        currentFolders,
        entries.map((entry) => entry.path),
      ),
      path: currentDir,
    });
  };

  /**
   * 只搬手里的一条：弹窗里的待拖拽区平铺着一批，拖其中某一条时把会话收窄到它。
   * 其余条目记在 `rest` 里——这一趟没搬成就还原回整批，别让它们从弹窗里消失。
   */
  const focusEntry = (path: string) => {
    const active = sessionRef.current;
    const focused = active === null ? null : focusSession(active, path);

    if (focused === null) {
      return false;
    }

    sessionRef.current = focused;
    setSession(focused);

    return true;
  };

  /** 从弹窗里的待拖拽区再次拖起：会话还在，只把拖拽状态重新点亮 */
  const beginDrag = () => {
    resetHover();
    setHanded(false);
    setDragActive(true);
  };

  /** 拖拽结束（松手 / Esc / 落在非落点区域）：条目回到手里，弹窗留着 */
  const endDrag = () => {
    const active = sessionRef.current;

    if (active === null) {
      return;
    }

    /*
     * 松手先把悬停计时清掉：指针还压在某一行 / 某个文件夹上时，
     * 500ms 的「停留＝进入」和之后的弹起还会接着跑，看起来像「松手了还要等一下才回去」。
     */
    resetHover();

    // 只拖了其中一条又没搬成：把其余条目还原回来，整批仍在弹窗里等着
    if (active.rest !== undefined) {
      const restored = restoreSession(active);

      sessionRef.current = restored;
      setSession(restored);
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

  const { hoverFolder, hoverPath, leaveFolder, resetHover, springPath } = useHoverTargets({
    goTo,
  });

  /** 松手搬这一批：逐条提交、最低一秒、搬完再判要不要关窗（都在 `use-move-runner`） */
  const runMove = useMoveRunner({
    close,
    endDrag,
    moveEntry,
    movedRef,
    movingRef,
    onAllMoved,
    resetHover,
    sessionRef,
    setDragActive,
    setHanded,
    setMovedPaths,
    setProgress,
    setSession,
  });

  const { dropOnBlank, dropOnFolder } = useDrops({
    endDrag,
    movingRef,
    resetHover,
    runMove,
    sessionRef,
    viewRef,
  });

  return {
    beginDrag,
    close,
    dragActive,
    dropOnBlank,
    dropOnFolder,
    endDrag,
    error,
    focusEntry,
    goTo,
    handed,
    hoverFolder,
    hoverPath,
    leaveFolder,
    loading,
    movedPaths,
    open,
    progress,
    refreshView,
    reset,
    session,
    springPath,
    view,
  };
};
