/**
 * 拖拽移动会话的类型：会话（被拖条目）、目录栈的一层、hook 入参。
 */

import type { FolderEntry } from '../../types';

/** 一次拖拽移动会话：被拖条目与它的文件名 */
export type DragMoveSession = {
  /** 被拖条目的绝对路径，移动时作 source */
  path: string;
  /** 被拖条目的名字，弹窗标题用 */
  name: string;
};

/** 弹窗里的一层目录：从拖拽起点逐级进入 */
export type DragMoveLevel = {
  /** 这一层的绝对路径 */
  path: string;
  /** 这一层的目录名，面包屑用 */
  name: string;
  /** 这一层的子文件夹；还没读到时为 null（读空结果是空数组，不是 null） */
  folders: FolderEntry[] | null;
};

/** hook 的入参：起始目录由页面给（它已经有这份列表），移动动作仍归 `useEntryActions` */
export type UseDragMoveArgs = {
  /** 页面当前目录；还没打开目录时为 null */
  currentDir: string | null;
  /** 页面当前目录名 */
  currentName: string;
  /** 页面当前目录的子文件夹：最外层直接用它，不为弹窗多发一次请求 */
  currentFolders: FolderEntry[];
  /** 执行移动；成功返回 true（失败时调用方自己弹提示，弹窗不重复报） */
  moveEntry: (source: string, targetDir: string) => Promise<boolean>;
};
