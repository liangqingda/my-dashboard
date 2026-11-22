/**
 * 本地视频目录的只读扫描：列出指定目录下的子文件夹与视频文件。
 *
 * 这一层只做读盘与归类，不假设固定仓库位置——目录路径由页面在查询参数里给出，
 * 校验与错误归类都收在这里，路由壳只负责拼响应。
 */

import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import type { Dirent } from 'node:fs';

/** 识别为视频文件的扩展名（小写、带点）；认不出的扩展名不进视频列表 */
export const VIDEO_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.mkv',
  '.avi',
  '.webm',
  '.m4v',
  '.ts',
  '.flv',
  '.wmv',
  '.mpeg',
  '.mpg',
  '.m2ts',
  '.3gp',
] as const;

/** 目录里的一条子文件夹 */
export type VideoFolderEntry = {
  /** 文件夹名（不含路径） */
  name: string;
  /** 文件夹的绝对路径，点开时原样回传给中间件 */
  path: string;
  /** 该文件夹直属的视频文件数（不递归子目录） */
  videoCount: number;
};

/** 目录里的一条视频文件 */
export type VideoFileEntry = {
  /** 文件名（含扩展名） */
  name: string;
  /** 文件的绝对路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
};

/** 一次目录扫描的结果 */
export type VideoDirListing = {
  /** 当前目录的绝对路径 */
  path: string;
  /** 当前目录名 */
  name: string;
  /** 父目录绝对路径；已经是文件系统根时为 null */
  parent: string | null;
  /** 子文件夹（按名称排序） */
  folders: VideoFolderEntry[];
  /** 直属视频文件（按名称排序） */
  videos: VideoFileEntry[];
};

/** 视频文件名判定：扩展名在白名单内即算；大小写不敏感 */
const isVideoName = (name: string): boolean => {
  const lower = name.toLowerCase();

  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

/** 以点开头的隐藏条目不进列表，避免把系统文件铺到页面上 */
const isHiddenName = (name: string): boolean => name.startsWith('.');

/**
 * 解析并校验入参目录：展开 `~` 为用户主目录，其余必须是绝对路径。
 * 相对路径不收——拼到进程 cwd 上得到的目录不是用户意图里的那个位置。
 */
const resolveDir = (input: string): string => {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('请输入要打开的目录路径');
  }

  if (trimmed.startsWith('~')) {
    return path.resolve(path.join(homedir(), trimmed.slice(1)));
  }

  if (!path.isAbsolute(trimmed)) {
    throw new Error('目录路径必须是绝对路径');
  }

  return path.resolve(trimmed);
};

/** 取 Node 错误上的 `code` 字段；不是错误对象时返回空串 */
const errorCode = (error: unknown): string =>
  error && typeof error === 'object' && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';

/** 读盘错误 → HTTP 状态码；认不出的按 500 处理 */
export const statusForReadError = (error: unknown): number => {
  const code = errorCode(error);

  if (code === 'ENOENT' || code === 'ENOTDIR') {
    return 404;
  }

  if (code === 'EACCES' || code === 'EPERM') {
    return 403;
  }

  return 500;
};

/** 把读盘错误归成页面能直接读懂的原因；认不出的保留原始信息 */
const toReadError = (error: unknown, dir: string): Error => {
  switch (errorCode(error)) {
    case 'ENOENT':
      return new Error(`目录不存在：${dir}`);
    case 'ENOTDIR':
      return new Error(`路径不是目录：${dir}`);
    case 'EACCES':
    case 'EPERM':
      return new Error(`没有权限读取目录：${dir}`);
    default:
      return error instanceof Error ? error : new Error('读取目录失败');
  }
};

/** 数一个文件夹直属的视频文件数；读不到就按 0 计，不让单个坏目录拖垮整页 */
const countVideos = async (dir: string): Promise<number> => {
  let entries: Dirent[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  return entries.reduce(
    (count, entry) =>
      entry.isFile() && !entry.isSymbolicLink() && !isHiddenName(entry.name)
        ? count + (isVideoName(entry.name) ? 1 : 0)
        : count,
    0,
  );
};

/**
 * 扫描一个目录：子文件夹直属视频数 + 直属视频文件的大小与修改时间。
 * 单个条目读不到就跳过，不影响同级其它条目；目录本身读不到时抛错给路由壳归类。
 */
export const listDirectory = async (input: string): Promise<VideoDirListing> => {
  const dir = resolveDir(input);

  let entries: Dirent[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw toReadError(error, dir);
  }

  const folders: VideoFolderEntry[] = [];
  const videos: VideoFileEntry[] = [];

  for (const entry of entries) {
    if (isHiddenName(entry.name) || entry.isSymbolicLink()) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      folders.push({
        name: entry.name,
        path: entryPath,
        videoCount: await countVideos(entryPath),
      });
      continue;
    }

    if (entry.isFile() && isVideoName(entry.name)) {
      try {
        const info = await stat(entryPath);

        videos.push({
          name: entry.name,
          path: entryPath,
          size: info.size,
          updatedAt: info.mtime.toISOString(),
        });
      } catch {
        // 单文件 stat 失败就跳过这一条，目录里其它视频照常展示。
      }
    }
  }

  folders.sort((a, b) => a.name.localeCompare(b.name));
  videos.sort((a, b) => a.name.localeCompare(b.name));

  const parent = path.dirname(dir) === dir ? null : path.dirname(dir);

  return { folders, name: path.basename(dir), parent, path: dir, videos };
};

/** 未指定目录时的默认起点：当前用户主目录 */
export const homeDirectory = (): string => homedir();
