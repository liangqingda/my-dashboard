/**
 * 视频页的数据访问层。
 * 开发态走 Vite 插件的 `/api/videos`（实时扫描本机目录）；静态构建不带这个中间件，
 * 页面直接回落提示态，不假设某个目录在产物里有快照。
 *
 * 列表只给摘要（名称 / 路径 / 大小 / 修改时间），视频内容与预览是单独任务，这里不下发文件。
 */

import { readHttpErrorMessage } from '@/utils/error';

import type {
  VideoDirListing,
  VideoFileEntry,
  VideoFolderEntry,
} from '../types';

const LIST_ENDPOINT = '/api/videos';

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
const normalizeFolder = (raw: unknown): VideoFolderEntry | null => {
  if (!isObject(raw)) {
    return null;
  }

  const name = asString(raw.name);
  const path = asString(raw.path);

  if (!name || !path) {
    return null;
  }

  return { name, path, videoCount: asNumber(raw.videoCount) };
};

/** 归一化一条视频文件；路径或名字缺失时丢弃 */
const normalizeVideo = (raw: unknown): VideoFileEntry | null => {
  if (!isObject(raw)) {
    return null;
  }

  const name = asString(raw.name);
  const path = asString(raw.path);

  if (!name || !path) {
    return null;
  }

  return {
    name,
    path,
    size: asNumber(raw.size),
    updatedAt: asString(raw.updatedAt),
  };
};

/** 归一化整份目录清单；核心字段不合格返回 null，调用方按错误态处理 */
const normalizeListing = (raw: unknown): VideoDirListing | null => {
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
    videos: Array.isArray(raw.videos)
      ? raw.videos.flatMap((item) => {
          const video = normalizeVideo(item);

          return video ? [video] : [];
        })
      : [],
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
 * 读取指定目录的子文件夹与视频列表；`dir` 为 null 时回落主目录。
 * 每次调用都重新读盘，目录变化后刷新即可看到最新内容。
 */
export const fetchVideoDir = async (
  dir: string | null,
  signal?: AbortSignal,
): Promise<VideoDirListing> => {
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
