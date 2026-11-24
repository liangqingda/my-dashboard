/**
 * 拖拽移动会话的纯函数：计时器、路径的根 / 上一层、落点过滤。
 */

import type { FolderEntry } from '../../types';
import { describePathRoot } from '../../utils/files';

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
 * 路径的根：与目录页的同一条口径（家目录 / 外接卷 / 本机 `/`）。
 * 弹窗把它当「最外层」——再往上就不属于这个应用逛的范围了。
 */
export const rootPath = (dir: string): string => describePathRoot(dir).path;

/**
 * 上一层目录：已经到根就返回 null。
 * 用根判定而不是直接截末段，否则家目录再往上会爬到别人的家目录里去。
 */
export const parentPath = (dir: string): string | null => {
  if (dir === rootPath(dir)) {
    return null;
  }

  const trimmed = dir.replace(/\/+$/, '');
  const cut = trimmed.lastIndexOf('/');

  return cut <= 0 ? '/' : trimmed.slice(0, cut);
};

/**
 * 被拖条目自己不能当落点。它本来就摆在自己所在那一层的列表里，
 * 不过滤掉的话会看到一个「移进自己」的瓦片——后端会拒，但提示文案像 bug。
 */
export const stripSelf = (
  folders: FolderEntry[],
  source: string,
): FolderEntry[] => folders.filter((folder) => folder.path !== source);
