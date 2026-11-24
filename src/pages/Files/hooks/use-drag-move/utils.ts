/**
 * 拖拽移动会话的纯函数：把某一层的读盘结果填回目录栈。
 */

import type { FolderEntry } from '../../types';

import type { DragMoveLevel } from './types';

/** 只认还没结果的那一层：迟到的响应不会盖住别的层 */
export const fillLevelFolders = (
  levels: DragMoveLevel[],
  path: string,
  folders: FolderEntry[],
): DragMoveLevel[] =>
  levels.map((level) =>
    level.path === path && level.folders === null ? { ...level, folders } : level,
  );
