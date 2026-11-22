/**
 * 视频文件的媒体侧能力：把本机视频按 HTTP Range 读给浏览器播放，以及把浏览器截下来的
 * 视频帧写进桌面。
 *
 * 与 `files-store.ts` 同一层定位：只做路径校验、读 / 写收口与纯函数，路由壳只拼响应。
 * 这里只放视频——内容接口不接受任意文件，免得把目录里的其它文件也变成可下载的 URL。
 */

import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import type { ReadStream } from 'node:fs';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层，不经过 Vite 的 `.js → .ts` 解析
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

/** 打开一个可播放视频的结果：路径、体积、MIME */
export type VideoFile = {
  /** 校验后的文件绝对路径 */
  path: string;
  /** 文件字节数 */
  size: number;
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
    path: filePath,
    size: info.size,
  };
};

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

/** 打开读流；调用方负责在响应结束时销毁 */
export const openVideoStream = (
  video: VideoFile,
  range: ByteRange | null,
): ReadStream =>
  createReadStream(
    video.path,
    range ? { end: range.end, start: range.start } : undefined,
  );

/** 一帧截图的落地结果 */
export type SavedCapture = {
  /** 文件名（含 `.png`） */
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

/** 截图落在哪个目录：当前用户桌面的绝对路径 */
export const captureDirectory = (): string => path.join(homedir(), 'Desktop');

/**
 * 把一帧 PNG 截图写进桌面，文件名取写入时刻的本地时间；同一秒内重名依次追加 ` (2)`、` (3)`，
 * 不覆盖已有截图。返回实际文件名与绝对路径。
 */
export const saveCapture = async (
  dataUrl: string,
  now: Date = new Date(),
): Promise<SavedCapture> => {
  const buffer = decodePngDataUrl(dataUrl);
  const dir = captureDirectory();

  await mkdir(dir, { recursive: true });

  const base = captureBaseName(now);

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const name = attempt === 1 ? `${base}.png` : `${base} (${attempt}).png`;
    const filePath = path.join(dir, name);

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
