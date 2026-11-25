/**
 * 视频文件的媒体侧能力：把本机视频按 HTTP Range 读给浏览器播放，以及把浏览器产出的
 * 截图（PNG）与导出音频（WebM）写进指定目录。
 *
 * 与 `files-store.ts` 同一层定位：只做路径校验、读 / 写收口与纯函数，路由壳只拼响应。
 * 这里只放视频——内容接口不接受任意文件，免得把目录里的其它文件也变成可下载的 URL。
 */

import { mkdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import type { ReadStream } from 'node:fs';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层，不经过 Vite 的 `.js → .ts` 解析
import { openTrackedStream } from './files-handles.ts';
import { isVideoFileName } from './files-store.ts';

/** 视频扩展名 → MIME；认不出的一律 `application/octet-stream`，让浏览器按嗅探处理 */
const VIDEO_MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.flv': 'video/x-flv',
  '.wmv': 'video/x-ms-wmv',
  '.3gp': 'video/3gpp',
};

/** 一次 Range 请求解析出的字节区间（含两端） */
export type ByteRange = {
  /** 起始字节（含） */
  start: number;
  /** 结束字节（含） */
  end: number;
};

/** 打开一个可播放视频的结果：路径、体积、MIME、修改时间 */
export type VideoFile = {
  /** 校验后的文件绝对路径 */
  path: string;
  /** 文件字节数 */
  size: number;
  /** 修改时间（毫秒）：缓存校验用，文件一改就让旧缓存失效 */
  mtimeMs: number;
  /** 给响应头的 Content-Type */
  mime: string;
};

/** 带 `code` 的错误：路由壳据此归类成 HTTP 状态码 */
const withCode = (message: string, code: string): Error => {
  const error = new Error(message) as Error & { code?: string };

  error.code = code;

  return error;
};

/** 取 Node 错误上的 `code`；不是错误对象时返回空串 */
const errorCode = (error: unknown): string =>
  error && typeof error === 'object' && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';

/**
 * 校验一个视频文件入参：必须是绝对路径、必须存在、必须是常规文件、扩展名必须属于视频分类。
 * 相对路径不收——拼到进程 cwd 上读到的文件不是用户点的那一个。
 */
export const openVideoFile = async (input: string): Promise<VideoFile> => {
  const trimmed = input.trim();

  if (!trimmed) {
    throw withCode('缺少视频路径', 'ENOENT');
  }

  if (!path.isAbsolute(trimmed)) {
    throw withCode('视频路径必须是绝对路径', 'EINVAL');
  }

  const filePath = path.resolve(trimmed);

  if (!isVideoFileName(path.basename(filePath))) {
    throw withCode('只提供视频文件，其它类型不走媒体接口', 'EINVAL');
  }

  let info;

  try {
    info = await stat(filePath);
  } catch (error) {
    const code = errorCode(error) || 'ENOENT';

    throw withCode(
      code === 'ENOENT' ? `视频不存在：${filePath}` : '读取视频失败',
      code,
    );
  }

  if (!info.isFile()) {
    throw withCode('视频路径不是常规文件', 'EINVAL');
  }

  return {
    mime:
      VIDEO_MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ??
      'application/octet-stream',
    mtimeMs: info.mtimeMs,
    path: filePath,
    size: info.size,
  };
};

/**
 * 视频响应的 `ETag`：体积 + 修改时间（毫秒）足够区分同一路径的不同版本，
 * 文件挪动 / 改动后旧缓存自然失效，不必把整份内容算成摘要。
 */
export const videoEtag = (video: VideoFile): string =>
  `W/"${video.size}-${Math.round(video.mtimeMs)}"`;

/**
 * 解析 `Range: bytes=…` 请求头。支持 `start-end` / `start-` / `-suffix` 三种写法，
 * 越界、反向、非数字与 `size` 为 0 时返回 `null`（按整份响应返回），不抛错。
 */
export const parseByteRange = (
  header: string | undefined,
  size: number,
): ByteRange | null => {
  if (!header || size <= 0) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());

  if (!match) {
    return null;
  }

  const startText = match[1];
  const endText = match[2];

  if (!startText && !endText) {
    return null;
  }

  let start = 0;
  let end = size - 1;

  if (startText) {
    start = Number(startText);

    if (!Number.isInteger(start) || start >= size) {
      return null;
    }

    if (endText) {
      end = Math.min(Number(endText), size - 1);

      if (!Number.isInteger(end) || end < start) {
        return null;
      }
    }
  } else {
    const suffix = Number(endText);

    if (!Number.isInteger(suffix) || suffix <= 0) {
      return null;
    }

    start = Math.max(size - suffix, 0);
  }

  return { end, start };
};

/** 打开读流（登记进本进程的句柄表）；调用方负责在响应结束时销毁 */
export const openVideoStream = (
  video: VideoFile,
  range: ByteRange | null,
): ReadStream =>
  openTrackedStream(
    video.path,
    range ? { end: range.end, start: range.start } : undefined,
  );

/** 一次落盘的结果（截图与导出音频共用） */
export type SavedFile = {
  /** 文件名（含扩展名） */
  name: string;
  /** 文件绝对路径 */
  path: string;
};

/** 两位数补零 */
const pad2 = (value: number): string => String(value).padStart(2, '0');

/** 截图文件名：本地时间的 `YYYY-MM-DD HH:mm:ss`，例 `2026-11-23 10:29:30` */
export const captureBaseName = (date: Date): string =>
  [
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ].join(' ');

/** 截图正文必须是 PNG 的 data URL；解析失败抛出可读原因 */
export const decodePngDataUrl = (dataUrl: string): Buffer => {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl.trim());

  if (!match) {
    throw new Error('截图数据不是有效的 PNG');
  }

  const buffer = Buffer.from(match[1], 'base64');

  if (buffer.length === 0) {
    throw new Error('截图数据为空');
  }

  return buffer;
};

/**
 * 导出文件落在哪个目录：传了 `dir` 就用它（`~` 开头的按用户主目录展开），
 * 没传（或空串）时回落当前用户桌面（截图不传目录时的默认）。
 */
export const exportDirectory = (dir?: string): string => {
  const trimmed = dir?.trim() ?? '';

  if (trimmed.length === 0) {
    return path.join(homedir(), 'Desktop');
  }

  if (trimmed === '~') {
    return homedir();
  }

  if (trimmed.startsWith('~/')) {
    return path.join(homedir(), trimmed.slice(2));
  }

  return path.resolve(trimmed);
};

/**
 * 把一帧 PNG 截图写进目标目录（默认用户桌面），文件名取写入时刻的本地时间；
 * 同一秒内重名依次追加 ` (2)`、` (3)`，不覆盖已有截图。返回实际文件名与绝对路径。
 */
export const saveCapture = async (
  dataUrl: string,
  dir?: string,
  now: Date = new Date(),
): Promise<SavedFile> => {
  const buffer = decodePngDataUrl(dataUrl);
  const targetDir = exportDirectory(dir);

  await mkdir(targetDir, { recursive: true });

  const base = captureBaseName(now);

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const name = attempt === 1 ? `${base}.png` : `${base} (${attempt}).png`;
    const filePath = path.join(targetDir, name);

    try {
      await writeFile(filePath, buffer, { flag: 'wx' });

      return { name, path: filePath };
    } catch (error) {
      if (errorCode(error) === 'EEXIST') {
        continue;
      }

      throw error;
    }
  }

  throw new Error('同一秒内截图过多，稍后再试');
};
