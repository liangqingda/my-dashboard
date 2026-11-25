/**
 * 中间件响应的归一化：把 `/api/files` 回来的 JSON 收成页面类型，脏字段就地丢掉或降级。
 * 纯函数，不依赖 React，也不发请求（请求与错误文案在 `files-api.ts`）。
 * 结构不合格到无法凑出核心字段时返回 null，调用方按「数据格式不符合预期」收口。
 */

import { FILE_CATEGORY_OPTIONS } from '../constants';
import type {
  AppEntry,
  DirListing,
  DirSpace,
  EjectVolumeResult,
  FileCategory,
  FileEntry,
  FolderEntry,
  VolumeHolder,
  VolumeSpace,
} from '../types';

import { asNumber, asString, isObject } from './normalize-primitives';

/** 系统目录选择器返回值：选中给绝对路径，取消给 cancelled */
export type PickedDir = { path: string } | { cancelled: true };

/** 分类键的合法取值，用于归一化服务端回来的分类字段 */
const CATEGORY_VALUES = FILE_CATEGORY_OPTIONS.map((option) => option.value) as string[];

/** 归一化分类数组：只留认识的档位并按出现顺序去重；缺字段 / 不是数组时按空 */
const normalizeCategories = (raw: unknown): FileCategory[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<FileCategory>();

  for (const item of raw) {
    if (typeof item === 'string' && CATEGORY_VALUES.includes(item)) {
      seen.add(item as FileCategory);
    }
  }

  return [...seen];
};

/** 归一化一条子文件夹；路径或名字缺失时丢弃 */
const normalizeFolder = (raw: unknown): FolderEntry | null => {
  if (!isObject(raw)) {
    return null;
  }

  const name = asString(raw.name);
  const path = asString(raw.path);

  if (!name || !path) {
    return null;
  }

  return {
    categories: normalizeCategories(raw.categories),
    hasApps: raw.hasApps === true,
    updatedMs: asNumber(raw.updatedMs),
    itemCount: asNumber(raw.itemCount),
    name,
    path,
  };
};

/** 归一化一条应用包；路径或名字缺失时丢弃，`system` 只认布尔真值 */
const normalizeApp = (raw: unknown): AppEntry | null => {
  if (!isObject(raw)) {
    return null;
  }

  const name = asString(raw.name);
  const path = asString(raw.path);

  if (!name || !path) {
    return null;
  }

  return {
    updatedMs: asNumber(raw.updatedMs),
    name,
    path,
    system: raw.system === true,
    updatedAt: asString(raw.updatedAt),
  };
};

/** 归一化一条文件；路径或名字缺失时丢弃 */
const normalizeFile = (raw: unknown): FileEntry | null => {
  if (!isObject(raw)) {
    return null;
  }

  const name = asString(raw.name);
  const path = asString(raw.path);

  if (!name || !path) {
    return null;
  }

  const category =
    typeof raw.category === 'string' && CATEGORY_VALUES.includes(raw.category)
      ? (raw.category as FileCategory)
      : 'other';

  return {
    category,
    updatedMs: asNumber(raw.updatedMs),
    name,
    path,
    size: asNumber(raw.size),
    updatedAt: asString(raw.updatedAt),
  };
};

/** 归一化一个卷的剩余空间；挂载点或可用字节缺失时按「读不到」返回 null */
const normalizeVolume = (raw: unknown): VolumeSpace | null => {
  if (!isObject(raw)) {
    return null;
  }

  const mountPoint = asString(raw.mountPoint);
  const { freeBytes } = raw;

  if (
    !mountPoint ||
    typeof freeBytes !== 'number' ||
    !Number.isFinite(freeBytes)
  ) {
    return null;
  }

  return { freeBytes, mountPoint, name: asString(raw.name) || null };
};

/** 归一化卷空间：启动卷读不到就整份当作没有，外接卷读不到只丢那一卷 */
const normalizeSpace = (raw: unknown): DirSpace | null => {
  if (!isObject(raw)) {
    return null;
  }

  const system = normalizeVolume(raw.system);

  return system === null
    ? null
    : { external: normalizeVolume(raw.external), system };
};

/** 归一化整份目录清单；核心字段不合格返回 null，调用方按错误态处理 */
const normalizeListing = (raw: unknown): DirListing | null => {
  if (!isObject(raw)) {
    return null;
  }

  const path = asString(raw.path);

  if (!path) {
    return null;
  }

  const parent = asString(raw.parent);

  return {
    apps: Array.isArray(raw.apps)
      ? raw.apps.flatMap((item) => {
          const app = normalizeApp(item);

          return app ? [app] : [];
        })
      : [],
    folders: Array.isArray(raw.folders)
      ? raw.folders.flatMap((item) => {
          const folder = normalizeFolder(item);

          return folder ? [folder] : [];
        })
      : [],
    name: asString(raw.name) || path,
    parent: parent || null,
    path,
    files: Array.isArray(raw.files)
      ? raw.files.flatMap((item) => {
          const file = normalizeFile(item);

          return file ? [file] : [];
        })
      : [],
    space: normalizeSpace(raw.space),
  };
};

/** 归一化 `{ listing }` 响应体；取不到清单返回 null */
export const normalizeListingResponse = (payload: unknown): DirListing | null =>
  isObject(payload) ? normalizeListing(payload.listing) : null;

/** 归一化 `{ entry }` 新建响应体；取不到条目返回 null */
export const normalizeEntryResponse = (payload: unknown): FolderEntry | null =>
  isObject(payload) ? normalizeFolder(payload.entry) : null;

/** 归一化 `{ entry }` 重命名响应体：只认带名字与路径的条目，其余返回 null */
export const normalizeRenamedEntry = (
  payload: unknown,
): { name: string; path: string } | null => {
  const entry = isObject(payload) ? payload.entry : null;

  return isObject(entry) &&
    typeof entry.name === 'string' &&
    typeof entry.path === 'string'
    ? { name: entry.name, path: entry.path }
    : null;
};

/** 归一化选择器返回值；格式不对返回 null，调用方按错误态处理 */
const normalizePicked = (raw: unknown): PickedDir | null => {
  if (!isObject(raw)) {
    return null;
  }

  if ('cancelled' in raw) {
    return { cancelled: true };
  }

  const path = asString(raw.path);

  return path ? { path } : null;
};

/** 归一化 `{ picked }` 响应体；取不到选择结果返回 null */
export const normalizePickedResponse = (payload: unknown): PickedDir | null =>
  isObject(payload) ? normalizePicked(payload.picked) : null;

/** 归一化 `{ capture }` 截图响应体：只认带文件名的回执，其余返回 null */
export const normalizeCaptureResponse = (payload: unknown): string | null => {
  const capture = isObject(payload) ? payload.capture : null;

  return isObject(capture) && typeof capture.name === 'string' && capture.name
    ? capture.name
    : null;
};

/** 进程号数组：只留正整数，其余丢掉 */
const normalizePids = (raw: unknown): number[] =>
  Array.isArray(raw)
    ? raw.filter(
        (item): item is number => typeof item === 'number' && Number.isInteger(item) && item > 1,
      )
    : [];

/** 归一化一条占用进程；PID 或名字缺失就丢弃（列不出来的进程不假装知道） */
const normalizeVolumeHolder = (raw: unknown): VolumeHolder | null => {
  if (!isObject(raw)) {
    return null;
  }

  const pid = asNumber(raw.pid);

  if (!Number.isInteger(pid) || pid <= 1) {
    return null;
  }

  return {
    canKill: raw.canKill === true,
    name: asString(raw.name) || `进程 ${pid}`,
    pid,
    reason: typeof raw.reason === 'string' && raw.reason ? raw.reason : null,
    user: asString(raw.user),
  };
};

/** 归一化推出结果；认不出 `status` 或没有挂载点时返回 null，由调用方按格式错误处理 */
export const normalizeEjectResponse = (raw: unknown): EjectVolumeResult | null => {
  if (!isObject(raw)) {
    return null;
  }

  const mountPoint = asString(raw.mountPoint);

  if (!mountPoint) {
    return null;
  }

  const released = asNumber(raw.released);
  const killed = normalizePids(raw.killed);

  if (raw.status === 'ejected') {
    return { killed, mountPoint, released, status: 'ejected' };
  }

  if (raw.status !== 'busy') {
    return null;
  }

  const holders = Array.isArray(raw.holders)
    ? raw.holders
        .map(normalizeVolumeHolder)
        .filter((holder): holder is VolumeHolder => holder !== null)
    : [];

  return {
    holders,
    holdersKnown: raw.holdersKnown === true,
    killed,
    message: asString(raw.message),
    mountPoint,
    released,
    status: 'busy',
  };
};

/** 归一化 `{ result }` 推出回执；取不到结果返回 null */
export const normalizeEjectPayload = (
  payload: unknown,
): EjectVolumeResult | null =>
  isObject(payload) ? normalizeEjectResponse(payload.result) : null;
