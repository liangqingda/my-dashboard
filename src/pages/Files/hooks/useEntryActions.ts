import { useState, type DragEvent } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { DraggableEntry, FileEntry, FolderEntry } from '../types';
import { createFolder, moveEntry, renameEntry } from '../utils/files-api';

import { useDragMove } from './use-drag-move';

/** 等待弹窗改名的一条目：类型决定弹窗标题与说明文案 */
export type RenamingEntry = {
  /** 条目绝对路径，提交改名时回传 */
  path: string;
  /** 当前条目名，文本域初始值 */
  name: string;
  /** 条目类型：文件夹 / 文件 */
  kind: 'folder' | 'file';
};

/** 条目写操作的入参：当前目录的信息由页面给，写操作成功后由 `reload` 拉回最新列表 */
export type UseEntryActionsArgs = {
  /** 当前目录绝对路径；还没选目录时为 null */
  currentDir: string | null;
    /** 当前目录的子文件夹：拖拽移动弹窗最外层直接用，不再多发一次请求 */
  currentFolders: FolderEntry[];
  /** 静默刷新当前目录 */
  reload: () => Promise<void>;
  /** 整批都搬走、移动弹窗自动关掉：把最后落成的目录交回页面（页面据此切过去） */
  onAllMoved?: (targetDir: string) => void;
  /** 弹窗里把「本次搬进文件夹」的一条取回手卡：页面把它加回待拖拽区 */
  onRestored?: (entry: DraggableEntry) => void;
};

/**
 * 条目写操作编排：新建文件夹、弹窗改名、拖拽移动的临时状态与接口调用收口在这里。
 * 成功后静默刷新列表；失败弹红色通知，不改原位置。弹窗类的删除编排归 `useEntryDelete`。
 *
 * 拖拽移动本身是一次会话（逐层挑目标文件夹、取消区、落位音效），那套状态归 `useDragMove`；
 * 这里只把它接到拖动源的「开始拖」与「拖拽结束」两个事件上。
 */
export const useEntryActions = ({
  currentDir,
  currentFolders,
  reload,
  onAllMoved,
  onRestored,
}: UseEntryActionsArgs) => {
  /** 正在弹窗改名的条目；null 表示改名弹窗关闭 */
  const [renamingEntry, setRenamingEntry] = useState<RenamingEntry | null>(null);
  /** 改名请求进行中：弹窗按钮转圈并禁用 */
  const [renameLoading, setRenameLoading] = useState(false);
  /** 拖拽中的条目路径与悬停的放置目标文件夹路径 */
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  /** 清掉拖拽临时状态 */
  const clearDrag = () => {
    setDragSource(null);
    setDropTarget(null);
  };

  /** 拖拽移动：同名冲突 / 移入自身后代由后端拒绝，失败不改动原位置；成功返回 true */
  const moveEntryTo = async (
    source: string,
    targetDir: string,
  ): Promise<boolean> => {
    if (!source || source === targetDir) {
      clearDrag();

      return false;
    }

    try {
      await moveEntry(source, targetDir);
      await reload();

      /*
       * 这里不弹「已移动」通知：一批会调用好几次，逐条弹会糊一屏。
       * 搬完的总结（搬走几个、有几个本来就在目标里）由 `use-move-runner` 在关窗之后统一弹一条。
       */
      return true;
    } catch (err) {
      notifications.show({
        title: '移动失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });

      return false;
    } finally {
      clearDrag();
    }
  };

  /** 拖拽移动弹窗：逐层找目标文件夹、取消区与落位音效都在这个会话里 */
  const dragMove = useDragMove({
    currentDir,
    currentFolders,
    moveEntry: moveEntryTo,
    onAllMoved,
    onRestored,
  });

  /** 切目录前清掉改名与拖拽临时状态，不沿用到新目录 */
  const resetTransient = () => {
    setRenamingEntry(null);
    clearDrag();
    dragMove.reset();
  };

  /**
   * 在指定目录新建文件夹：后端落一个默认名条目，刷新后打开改名弹窗。
   * 目录页标题栏与拖拽移动弹窗的 header 共用这一条路径，交互完全一致。
   */
  const createEntryIn = async (dir: string) => {
    try {
      const created = await createFolder(dir);

      await reload();
      dragMove.refreshView();
      setRenamingEntry({ path: created.path, name: created.name, kind: 'folder' });
    } catch (err) {
      notifications.show({
        title: '新建文件夹失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    }
  };

  /** 新建文件夹：目录页标题栏那颗按钮，落在当前目录 */
  const createEntry = async () => {
    if (!currentDir) {
      return;
    }

    await createEntryIn(currentDir);
  };

  /** 提交改名：成功后刷新列表；失败弹提示并退出改名态，条目保留原名 */
  const renameCommit = async (path: string, name: string) => {
    setRenameLoading(true);

    try {
      await renameEntry(path, name);
      await reload();
      /* 新文件夹改名后就地反映到拖拽弹窗那一层，不用退出重进 */
      dragMove.refreshView();
      setRenamingEntry(null);
    } catch (err) {
      notifications.show({
        title: '重命名失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      setRenamingEntry(null);
      setRenameLoading(false);
    }
  };

  /** 打开某条目的改名弹窗（瓦片上的编辑按钮） */
  const editEntry = (entry: FolderEntry | FileEntry) =>
    setRenamingEntry({
      path: entry.path,
      name: entry.name,
      kind: 'category' in entry ? 'file' : 'folder',
    });

  /** 关掉改名弹窗，不提交 */
  const closeRename = () => setRenamingEntry(null);

  /**
   * 拖起一批条目：把移动弹窗打开在页面当前目录，条目本体一并交给会话。
   * 从瓦片 / 表格行拖起时只有一条；从待拖拽区整批拖起时是一整批。
   */
  const dragStartEntries = (entries: DraggableEntry[]) => {
    // 拖拽源高亮只认第一条：多个条目时弹窗已经盖住列表，没必要逐条画「正在拖」
    setDragSource(entries[0]?.path ?? null);
    dragMove.open(entries);
  };

  /** 拖起一条目：单条走的是同一个入口 */
  const dragStartEntry = (entry: DraggableEntry) => dragStartEntries([entry]);

  /** 拖拽结束：收起移动弹窗；没有落下的移动一律不执行 */
  const endDrag = () => {
    clearDrag();
    dragMove.endDrag();
  };

  const dragOverFolder = (path: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const { dataTransfer } = event;

    dataTransfer.dropEffect = 'move';
    setDropTarget(path);
  };

  const dropFolder = (path: string) => {
    if (dragSource) {
      void moveEntryTo(dragSource, path);
    }
  };

  return {
    clearDrag,
    closeRename,
    createEntry,
    createEntryIn,
    dragLeaveFolder: () => setDropTarget(null),
    dragMove,
    dragOverFolder,
    dragSource,
    dragStartEntries,
    dragStartEntry,
    dropFolder,
    dropTarget,
    editEntry,
    endDrag,
    moveEntryTo,
    renameCommit,
    renameLoading,
    renamingEntry,
    resetTransient,
  };
};
