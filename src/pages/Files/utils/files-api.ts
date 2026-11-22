/**
 * 文件浏览页的数据访问层。
 * 开发态走 Vite 插件的 `/api/files`（实时扫描本机目录）；静态构建不带这个中间件，
 * 页面直接回落提示态，不假设某个目录在产物里有快照。
 *
 * 列表只给摘要（名称 / 路径 / 大小 / 修改时间），文件内容与预览是单独任务，这里不下发文件。
 */

import { readHttpErrorMessage } from '@/utils/error';

import { FILE_CATEGORY_OPTIONS } from '../constants';
import type {
  DirListing,
  DirSpace,
  FileCategory,
  FileEntry,
  FolderEntry,
  VolumeSpace,
} from '../types';

const LIST_ENDPOINT = '/api/files';
const PICK_ENDPOINT = '/api/files/pick-dir';
const NEW_FOLDER_ENDPOINT = '/api/files/new-folder';
const RENAME_ENDPOINT = '/api/files/rename';
const MOVE_ENDPOINT = '/api/files/move';
const DELETE_ENDPOINT = '/api/files/delete';

/** 系统目录选择器返回值：选中给绝对路径，取消给 cancelled */
export type PickedDir = { path: string } | { cancelled: true };

/** 取数请求的缓存策略：开发态必须实时，静态产物不读这个接口 */
const REQUEST_INIT: RequestInit = import.meta.env.DEV
  ? { cache: 'no-store' }
  : {};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

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

  return { name, path, itemCount: asNumber(raw.itemCount) };
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

  const knownCategories = FILE_CATEGORY_OPTIONS.map((option) => option.value) as string[];
  const category =
    typeof raw.category === 'string' && knownCategories.includes(raw.category)
      ? (raw.category as FileCategory)
      : 'other';

  return {
    name,
    path,
    size: asNumber(raw.size),
    updatedAt: asString(raw.updatedAt),
    category,
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

/** 解析响应里的 JSON；格式不对时抛错，调用方给统一文案 */
const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new Error('目录数据不是有效的 JSON');
  }
};

/**
 * 读取指定目录的子文件夹与文件列表；`dir` 为 null 时回落主目录。
 * 每次调用都重新读盘，目录变化后刷新即可看到最新内容。
 */
export const fetchFileDir = async (
  dir: string | null,
  signal?: AbortSignal,
): Promise<DirListing> => {
  if (!import.meta.env.DEV) {
    throw new Error('静态构建不支持读取本地目录，请在开发模式下打开');
  }

  const query = dir ? `?dir=${encodeURIComponent(dir)}` : '';
  const response = await fetch(`${LIST_ENDPOINT}${query}`, {
    ...REQUEST_INIT,
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readHttpErrorMessage(response, `读取目录失败（HTTP ${response.status}）`),
    );
  }

  const payload = await readJson(response);
  const listing = isObject(payload) ? normalizeListing(payload.listing) : null;

  if (listing === null) {
    throw new Error('目录数据格式不符合预期');
  }

  return listing;
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

/**
 * 调起系统目录选择框；`defaultDir` 作为选择框默认定位目录；用户取消时返回 `cancelled`，
 * 不按失败处理。仅开发模式可用，与列表接口同一套中间件。
 */
export const pickPickedDir = async (
  defaultDir: string | null,
  signal?: AbortSignal,
): Promise<PickedDir> => {
  if (!import.meta.env.DEV) {
    throw new Error('静态构建不支持读取本地目录，请在开发模式下打开');
  }

  const response = await fetch(PICK_ENDPOINT, {
    ...REQUEST_INIT,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(defaultDir ? { dir: defaultDir } : {}),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readHttpErrorMessage(response, `选择目录失败（HTTP ${response.status}）`),
    );
  }

  const payload = await readJson(response);
  const picked = isObject(payload) ? normalizePicked(payload.picked) : null;

  if (picked === null) {
    throw new Error('目录数据格式不符合预期');
  }

  return picked;
};

/** POST JSON 写请求：统一开发态守卫与错误文案收口 */
const postJson = async (
  endpoint: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> => {
  if (!import.meta.env.DEV) {
    throw new Error('静态构建不支持操作本地目录，请在开发模式下打开');
  }

  const response = await fetch(endpoint, {
    ...REQUEST_INIT,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readHttpErrorMessage(response, `操作失败（HTTP ${response.status}）`),
    );
  }

  return readJson(response);
};

/** 在当前目录下新建文件夹；返回新建条目，默认名重名由后端追加序号 */
export const createFolder = async (
  dir: string,
  signal?: AbortSignal,
): Promise<FolderEntry> => {
  const payload = await postJson(NEW_FOLDER_ENDPOINT, { dir }, signal);
  const entry = isObject(payload) ? normalizeFolder(payload.entry) : null;

  if (entry === null) {
    throw new Error('目录数据格式不符合预期');
  }

  return entry;
};

/** 重命名一条条目；返回重命名后的路径与名字。同名冲突由后端拒绝 */
export const renameEntry = async (
  pathValue: string,
  name: string,
): Promise<{ name: string; path: string }> => {
  const payload = await postJson(RENAME_ENDPOINT, { path: pathValue, name });
  const entry = isObject(payload) ? payload.entry : null;

  if (
    !isObject(entry) ||
    typeof entry.path !== 'string' ||
    typeof entry.name !== 'string'
  ) {
    throw new Error('目录数据格式不符合预期');
  }

  return { name: entry.name, path: entry.path };
};

/** 把一条条目移入目标文件夹；同名冲突 / 移入自身后代由后端拒绝 */
export const moveEntry = async (
  source: string,
  targetDir: string,
): Promise<void> => {
  await postJson(MOVE_ENDPOINT, { source, targetDir });
};

/** 删除一条条目；文件夹连同内部内容递归删除，不可恢复 */
export const deleteEntry = async (pathValue: string): Promise<void> => {
  await postJson(DELETE_ENDPOINT, { path: pathValue });
};
