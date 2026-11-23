/**
 * 文件浏览页的数据访问层。
 * 开发态走 Vite 插件的 `/api/files`（实时扫描本机目录）；静态构建不带这个中间件，
 * 页面直接回落提示态，不假设某个目录在产物里有快照。
 *
 * 列表只给摘要（名称 / 路径 / 大小 / 修改时间），文件内容与预览是单独任务，这里不下发文件。
 * 响应归一化是纯函数，住在 `normalize.ts`，这里只管请求与错误文案。
 */

import { readHttpErrorMessage } from '@/utils/error';

import type { AppResidueReport, AppUninstallResult, DirListing, FolderEntry } from '../types';

import {
  normalizeAppResidueResponse,
  normalizeAppUninstallResponse,
  normalizeCaptureResponse,
  normalizeEntryResponse,
  normalizeListingResponse,
  normalizePickedResponse,
  normalizeRenamedEntry,
} from './normalize';
import type { PickedDir } from './normalize';

const LIST_ENDPOINT = '/api/files';
const PICK_ENDPOINT = '/api/files/pick-dir';
const NEW_FOLDER_ENDPOINT = '/api/files/new-folder';
const RENAME_ENDPOINT = '/api/files/rename';
const MOVE_ENDPOINT = '/api/files/move';
const DELETE_ENDPOINT = '/api/files/delete';
const CONTENT_ENDPOINT = '/api/files/content';
const CAPTURE_ENDPOINT = '/api/files/capture';
const APP_ICON_ENDPOINT = '/api/files/app-icon';
const APP_RESIDUE_ENDPOINT = '/api/files/app-residue';
const UNINSTALL_APP_ENDPOINT = '/api/files/uninstall-app';

/** 取数请求的缓存策略：开发态必须实时，静态产物不读这个接口 */
const REQUEST_INIT: RequestInit = import.meta.env.DEV
  ? { cache: 'no-store' }
  : {};

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
  const listing = normalizeListingResponse(payload);

  if (listing === null) {
    throw new Error('目录数据格式不符合预期');
  }

  return listing;
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
  const picked = normalizePickedResponse(payload);

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
  const entry = normalizeEntryResponse(payload);

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
  const entry = normalizeRenamedEntry(payload);

  if (entry === null) {
    throw new Error('目录数据格式不符合预期');
  }

  return entry;
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

/**
 * 视频的播放地址：中间件按 Range 流式读文件，浏览器可以直接把它塞进 `<video src>`。
 * 地址由前端拼、路径做整段编码（路径里的 `#`、`?` 不改写就会截断查询串）。
 */
export const videoContentUrl = (pathValue: string): string =>
  `${CONTENT_ENDPOINT}?path=${encodeURIComponent(pathValue)}`;

/** 把一帧 PNG 截图写进桌面；返回实际文件名（同秒重名后端会追加序号） */
export const captureVideoFrame = async (dataUrl: string): Promise<string> => {
  const payload = await postJson(CAPTURE_ENDPOINT, { dataUrl });
  const name = normalizeCaptureResponse(payload);

  if (name === null) {
    throw new Error('截图回执格式不符合预期');
  }

  return name;
};

/**
 * 应用图标的地址：中间件按需把 `.app` 里的 `.icns` 转成 PNG；
 * 取不到时接口回 404，瓦片自己回落通用图标，不把地址当文件路径用。
 */
export const appIconUrl = (pathValue: string): string =>
  `${APP_ICON_ENDPOINT}?path=${encodeURIComponent(pathValue)}`;

/**
 * 读取卸载前的残留清单：应用本体摘要 + 将一并删除的用户 / 系统级残留。
 * 只用于确认弹窗展示，真正的删除目标由中间件重新算，前端不回传路径。
 */
export const fetchAppResidues = async (
  pathValue: string,
  signal?: AbortSignal,
): Promise<AppResidueReport> => {
  if (!import.meta.env.DEV) {
    throw new Error('静态构建不支持读取本地目录，请在开发模式下打开');
  }

  const response = await fetch(
    `${APP_RESIDUE_ENDPOINT}?path=${encodeURIComponent(pathValue)}`,
    { ...REQUEST_INIT, signal },
  );

  if (!response.ok) {
    throw new Error(
      await readHttpErrorMessage(response, `读取应用残留失败（HTTP ${response.status}）`),
    );
  }

  const report = normalizeAppResidueResponse(await readJson(response));

  if (report === null) {
    throw new Error('应用残留数据格式不符合预期');
  }

  return report;
};

/**
 * 卸载一个应用包：中间件删整包并清理残留，权限不足时会弹一次 macOS 授权窗。
 * 返回逐项结果，由调用方决定提示「已卸载」还是「部分残留未删掉」。
 */
export const uninstallApp = async (
  pathValue: string,
): Promise<AppUninstallResult> => {
  const payload = await postJson(UNINSTALL_APP_ENDPOINT, { path: pathValue });
  const result = normalizeAppUninstallResponse(payload);

  if (result === null) {
    throw new Error('卸载回执格式不符合预期');
  }

  return result;
};
