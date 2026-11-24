/**
 * 拖拽移动会话的类型：会话（被拖条目）、弹窗当前停的那一层、读盘 hook 与会话 hook 的入参。
 */

import type { Dispatch, RefObject, SetStateAction } from 'react';

import type { FolderEntry } from '../../types';

/** 一次拖拽移动会话：被拖条目、它的来源目录与类型 */
export type DragMoveSession = {
  /** 被拖条目的绝对路径，移动时作 source */
  path: string;
  /** 被拖条目的名字：手持卡片与弹窗标题用 */
  name: string;
  /** 条目类型：决定手持卡片上画文件夹还是文件图标 */
  kind: 'folder' | 'file';
  /** 条目原本所在的目录：松手在空白处时据此判断「就是原地」 */
  origin: string;
};

/** 弹窗当前停在哪一层：路径 + 这一层的子文件夹（null ＝ 还没读到） */
export type DragMoveView = {
  /** 这一层的绝对路径，面包屑与根判定都读它 */
  path: string;
  /** 这一层的子文件夹；读空结果是空数组，不是 null */
  folders: FolderEntry[] | null;
};

/** hook 的入参：起始目录由页面给（它已经有这份列表），移动动作仍归 `useEntryActions` */
export type UseDragMoveArgs = {
  /** 页面当前目录；还没打开目录时为 null */
  currentDir: string | null;
  /** 页面当前目录的子文件夹：起始那一层直接用它，不为弹窗多发一次请求 */
  currentFolders: FolderEntry[];
  /** 执行移动；成功返回 true（失败时调用方自己弹提示，弹窗不重复报） */
  moveEntry: (source: string, targetDir: string) => Promise<boolean>;
};

/** 读盘 hook 的入参：路径与结果由会话给，缓存与回填也还回到会话里 */
export type UseViewFoldersArgs = {
  /** 当前层路径；null 表示弹窗没开 */
  path: string | null;
  /** 当前层的子文件夹；null 表示还等着读 */
  folders: FolderEntry[] | null;
  /** 会话：被拖条目的路径要从它身上取（它自己不进落点列表） */
  sessionRef: RefObject<DragMoveSession | null>;
  /** 会话内的路径缓存，来回进出同一层复用 */
  cacheRef: RefObject<Map<string, FolderEntry[]>>;
  /** 把读到的结果写回当前层 */
  setView: Dispatch<SetStateAction<DragMoveView | null>>;
  /** 读失败的原因 */
  setError: Dispatch<SetStateAction<string | null>>;
};
