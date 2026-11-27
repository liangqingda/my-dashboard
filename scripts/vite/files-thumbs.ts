/**
 * 列表缩略图：网格里图片直接摆缩小后的图、视频摆中间一帧（与 Finder 同观感）。
 *
 * 图片走 `sips` 缩放并转 JPEG；视频走 `qlmanage` 的 QuickLook 缩略图（系统自带，
 * 用什么编码由 AVFoundation 决定，比在前端起 `video + canvas` 稳）。两者都按
 * 「真实路径 + 体积 + 修改时间」缓存在临时目录，只有列表第一次需要时才生成。
 *
 * 与 `files-images.ts` 同一层定位：只做路径校验与转码，路由壳只拼响应；
 * 转不出来（格式不支持、`qlmanage` 被系统挡住）返回 null，前端回落分类图标。
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层，不经过 Vite 的 `.js → .ts` 解析
import { isImageFileName, isVideoFileName } from './files-store.ts';

const execFileAsync = promisify(execFile);

/** 缩略图缓存目录：临时目录下的固定子目录，按路径 + 体积 + 修改时间作键 */
const THUMB_CACHE_DIR = path.join(tmpdir(), 'my-dashboard-thumbs');

/** 输出边长：瓦片最宽 248px、按 2 倍图取需要 496，512 正好覆盖；显示时再缩 */
const THUMB_SIZE = 512;

/** 转码超时：`qlmanage` 起 QuickLook 比 `sips` 慢，给到 30s 免得大视频卡死请求 */
const IMAGE_TIMEOUT_MS = 15_000;
const VIDEO_TIMEOUT_MS = 30_000;

/** 同时跑的转码进程上限：`qlmanage` 起 QuickLook 不便宜，一口气几十个会把 CPU 打满 */
const MAX_CONCURRENT = 2;

let running = 0;
const waiting: Array<() => void> = [];

/** 排队执行：超过上限就等着，前一个结束再放一个进来 */
const withSlot = async <T>(run: () => Promise<T>): Promise<T> => {
  if (running >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      waiting.push(resolve);
    });
  }

  running += 1;

  try {
    return await run();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
};

/** 一张缩略图：缓存在临时目录里的文件与 MIME */
export type FileThumb = {
  path: string;
  mime: string;
};

/** 拿一次文件信息，不存在或读不到按 null（后续统一走「转不出来」） */
const statOrNull = async (target: string): Promise<Stats | null> => {
  try {
    return await stat(target);
  } catch {
    return null;
  }
};

/** 图片：`sips` 等比缩到长边 256 并转 JPEG，带 alpha 的图会铺白底 */
const thumbForImage = async (source: string, out: string): Promise<FileThumb | null> => {
  try {
    await execFileAsync(
      'sips',
      ['-s', 'format', 'jpeg', '-Z', String(THUMB_SIZE), source, '--out', out],
      { timeout: IMAGE_TIMEOUT_MS },
    );
  } catch {
    return null;
  }

  const info = await statOrNull(out);

  return info !== null && info.size > 0 ? { mime: 'image/jpeg', path: out } : null;
};

/**
 * 视频：让 `qlmanage` 把 QuickLook 缩略图写进一个临时目录，再用 `sips` 转成 JPEG 搬到缓存位置。
 * QuickLook 只出 PNG，同尺寸下比 JPEG 大几倍；帧图要按 2 倍图取，不转一道缓存盘会很快堆起来。
 */
const thumbForVideo = async (source: string, out: string): Promise<FileThumb | null> => {
  const staging = path.join(THUMB_CACHE_DIR, `src-${path.basename(out, '.jpg')}`);

  try {
    await mkdir(staging, { recursive: true });
    await execFileAsync(
      'qlmanage',
      ['-t', '-s', String(THUMB_SIZE), '-o', staging, source],
      { timeout: VIDEO_TIMEOUT_MS },
    );

    const produced = (await readdir(staging)).find((name) =>
      name.toLowerCase().endsWith('.png'),
    );

    if (produced === undefined) {
      return null;
    }

    await execFileAsync(
      'sips',
      ['-s', 'format', 'jpeg', '-Z', String(THUMB_SIZE), path.join(staging, produced), '--out', out],
      { timeout: IMAGE_TIMEOUT_MS },
    );

    const info = await statOrNull(out);

    return info !== null && info.size > 0 ? { mime: 'image/jpeg', path: out } : null;
  } catch {
    return null;
  } finally {
    await rm(staging, { force: true, recursive: true });
  }
};

/**
 * 取一张文件的缩略图；只认图片 / 视频分类里的扩展名，其它文件与不存在的路径一律 null。
 * 同一份文件只转一次，之后直接复用缓存。
 */
export const fileThumb = async (input: string): Promise<FileThumb | null> => {
  if (!path.isAbsolute(input)) {
    return null;
  }

  const info = await statOrNull(input);

  if (info === null || !info.isFile()) {
    return null;
  }

  const name = path.basename(input);
  const kind = isImageFileName(name) ? 'image' : isVideoFileName(name) ? 'video' : null;

  if (kind === null) {
    return null;
  }

  const key = createHash('sha1')
    .update(`${input}:${info.size}:${Math.round(info.mtimeMs)}:${THUMB_SIZE}:${kind}`)
    .digest('hex')
    .slice(0, 16);
  /* 两种分类都出 JPEG：视频帧也先转一道，尺寸与体积都按缩略图口径 */
  const mime = 'image/jpeg';
  const out = path.join(THUMB_CACHE_DIR, `${key}.jpg`);
  const cached = await statOrNull(out);

  if (cached !== null && cached.size > 0) {
    return { mime, path: out };
  }

  await mkdir(THUMB_CACHE_DIR, { recursive: true });

  return withSlot(() =>
    kind === 'image' ? thumbForImage(input, out) : thumbForVideo(input, out),
  );
};
