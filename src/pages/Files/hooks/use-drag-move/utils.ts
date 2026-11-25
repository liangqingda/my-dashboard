/**
 * 拖拽移动会话的纯函数：计时器句柄与落点过滤。
 */

import type { FolderEntry } from '../../types';

import type { DragMoveSession } from './types';

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
 * 被拖的条目自己不能当落点。它们本来就摆在自己所在那一层的列表里，
 * 不过滤掉的话会看到「移进自己 / 移进同行的兄弟」的瓦片——后端会拒，但提示文案像 bug。
 */
export const stripSelf = (
  folders: FolderEntry[],
  sources: string[],
): FolderEntry[] => folders.filter((folder) => !sources.includes(folder.path));

/**
 * 把会话收窄到手上这一条：其余条目记进 `rest`，这一趟没搬成时再还原回整批。
 * 找不到这一条（会话已换批）就返回 null，调用方按「没接住」处理。
 */
export const focusSession = (
  session: DragMoveSession,
  path: string,
): DragMoveSession | null => {
  const entry = session.entries.find((item) => item.path === path);

  if (entry === undefined) {
    return null;
  }

  const rest = session.entries.filter((item) => item.path !== path);

  return {
    entries: [entry],
    origin: session.origin,
    rest: rest.length > 0 ? rest : undefined,
  };
};

/** 单条没搬成：把 `rest` 里的条目还原回整批；没有 `rest` 就原样返回 */
export const restoreSession = (session: DragMoveSession): DragMoveSession =>
  session.rest === undefined
    ? session
    : { entries: [...session.entries, ...session.rest], origin: session.origin };
