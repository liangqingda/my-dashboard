/**
 * 拖拽移动会话的纯函数：计时器句柄与落点过滤。
 */

import type { FolderEntry } from '../../types';

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
