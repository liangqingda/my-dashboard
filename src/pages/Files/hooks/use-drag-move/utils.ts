/**
 * 拖拽移动会话的纯函数：计时器、目录栈的过滤、填充、进入与退回。
 */

import type { FolderEntry } from '../../types';

import type { DragMoveLevel } from './types';

/**
 * 清掉一个计时器句柄：`reset` 负责把持有它的 ref 置回 null——
 * null 是「这一级没有计时在跑」的判据，只 clearTimeout 不置 null 会挡住下一次计时。
 */
export const clearTimer = (id: number | null, reset: () => void): void => {
  if (id !== null) {
    window.clearTimeout(id);
  }

  reset();
};

/**
 * 被拖条目自己不能当落点。它本来就摆在自己所在那一层的列表里，
 * 不过滤掉的话会看到一个「移进自己」的瓦片——后端会拒，但提示文案像 bug。
 */
export const stripSelf = (
  folders: FolderEntry[],
  source: string,
): FolderEntry[] => folders.filter((folder) => folder.path !== source);

/** 只认还没结果的那一层：迟到的响应不会盖住别的层 */
export const fillLevelFolders = (
  levels: DragMoveLevel[],
  path: string,
  folders: FolderEntry[],
): DragMoveLevel[] =>
  levels.map((level) =>
    level.path === path && level.folders === null ? { ...level, folders } : level,
  );

/** 进入一层：目录名从上一层的列表里取，取不到就用路径末段兜住；已经是这一层就原样返回 */
export const enterLevel = (
  levels: DragMoveLevel[],
  path: string,
  folders: FolderEntry[] | null,
): DragMoveLevel[] => {
  const active = levels.at(-1);

  if (active === undefined || active.path === path) {
    return levels;
  }

  const name =
    active.folders?.find((folder) => folder.path === path)?.name ??
    path.split('/').at(-1) ??
    path;

  return [...levels, { folders, name, path }];
};

/** 退回上层：至少留住第一层（拖拽起点），`steps` 超过已有层数就当回到起点 */
export const backLevels = (
  levels: DragMoveLevel[],
  steps: number,
): DragMoveLevel[] =>
  steps <= 0 ? levels : levels.slice(0, Math.max(levels.length - steps, 1));
