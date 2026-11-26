/**
 * 拖拽移动会话的纯函数：计时器句柄与落点过滤。
 */

import type { DraggableEntry, FolderEntry } from '../../types';
import { baseNameOfPath, joinDirOf, parentDirOf } from '../../utils/files';

import type { DragMoveSession, LandedItem } from './types';

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

/** 目标目录的规范写法（末尾斜杠抹掉）：与 `parentDirOf` 出来的父目录同口径比较 */
const normalizeDir = (dir: string): string =>
  dir.length > 1 ? dir.replace(/\/+$/, '') : dir;

/** 这一批里谁已经在目标目录里：移进去也等于没动，要剔出来不算「要搬的」 */
export const splitByParent = (
  entries: DraggableEntry[],
  targetDir: string,
): { movable: DraggableEntry[]; skipped: number } => {
  const dir = normalizeDir(targetDir);
  const movable = entries.filter((entry) => parentDirOf(entry.path) !== dir);

  return { movable, skipped: entries.length - movable.length };
};

/** 这一批是不是**全部**都住在 `dir` 里：落点瓦片据此显示成禁用态 */
export const allInsideDir = (entries: DraggableEntry[], dir: string): boolean =>
  entries.length > 0 &&
  entries.every((entry) => parentDirOf(entry.path) === normalizeDir(dir));

/**
 * 把会话收窄到手上这一条：其余条目记进 `rest`，这一趟没搬成时再还原回整批。
 * 找不到这一条（会话已换批）就返回 null，调用方按「没接住」处理。
 */
export const focusSession = (
  session: DragMoveSession,
  path: string,
): DragMoveSession | null => {
  const restAt = session.entries.findIndex((item) => item.path === path);

  if (restAt === -1) {
    return null;
  }

  const entry = session.entries[restAt];
  const rest = session.entries.filter((item) => item.path !== path);

  return {
    entries: [entry],
    origin: session.origin,
    rest: rest.length > 0 ? rest : undefined,
    restAt,
  };
};

/**
 * 单条没搬成：把 `rest` 里的条目按原位插回去，还原成整批；没有 `rest` 就原样返回。
 * 按原位还原（而不是接在最后）——弹窗里的待拖拽区要看到「它从哪儿来、回哪儿去」。
 */
export const restoreSession = (session: DragMoveSession): DragMoveSession => {
  if (session.rest === undefined) {
    return session;
  }

  const restAt = session.restAt ?? session.rest.length;

  return {
    entries: [
      ...session.rest.slice(0, restAt),
      ...session.entries.slice(0, 1),
      ...session.rest.slice(restAt),
    ],
    origin: session.origin,
  };
};

/**
 * 这一批条目按原顺序排好的完整列表（单独拖起某一条时，它自己站在原位、其余在 `rest`）：
 * 弹窗里的待拖拽区按原位平铺，正在被拖的那一条也留下它的槽位。
 */
export const sessionLayout = (session: DragMoveSession): DraggableEntry[] => {
  if (session.rest === undefined) {
    return session.entries;
  }

  const restAt = session.restAt ?? session.rest.length;

  return [
    ...session.rest.slice(0, restAt),
    ...session.entries.slice(0, 1),
    ...session.rest.slice(restAt),
  ];
};

/**
 * 把「这一趟搬成功的」记成弹窗里可回流的一条条：条目沿用搬前那份（名字、类型都在），
 * 只把路径换成新目录下的同名路径。
 */
export const buildLanded = (
  entries: DraggableEntry[],
  movedPaths: string[],
  targetDir: string,
  origin: string,
): LandedItem[] =>
  entries
    .filter((entry) => movedPaths.includes(entry.path))
    .map((entry) => {
      const name = entry.name || baseNameOfPath(entry.path);

      return {
        entry: { ...entry, path: joinDirOf(targetDir, name) },
        id: `${targetDir}#${entry.path}`,
        origin,
        retracted: false,
        targetDir,
      };
    });
