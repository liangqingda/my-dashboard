/**
 * 图片文件的读取侧能力：把本机图片整份读给浏览器做预览。
 *
 * 与 `files-media.ts` 同一层定位：只做路径校验、MIME 判定与错误归类，路由壳只拼响应。
 * 这里只放图片——内容接口不接受任意文件，免得把目录里其它文件也变成可下载的 URL。
 * 图片不需要 Range（不是流式播放），整份返回即可。
 */

import { stat } from 'node:fs/promises';
import path from 'node:path';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层，不经过 Vite 的 `.js → .ts` 解析
import { isImageFileName } from './files-store.ts';

/** 图片扩展名 → MIME；认不出的一律 `application/octet-stream`，让浏览器按嗅探处理 */
const IMAGE_MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
};

/** 打开一张图片的结果：路径、体积、MIME */
export type ImageFile = {
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
 * 校验一个图片文件入参：必须是绝对路径、必须存在、必须是常规文件、扩展名必须属于图片分类。
 * 相对路径不收——拼到进程 cwd 上读到的文件不是用户点的那一个。
 */
export const openImageFile = async (input: string): Promise<ImageFile> => {
  const trimmed = input.trim();

  if (!trimmed) {
    throw withCode('缺少图片路径', 'ENOENT');
  }

  if (!path.isAbsolute(trimmed)) {
    throw withCode('图片路径必须是绝对路径', 'EINVAL');
  }

  const filePath = path.resolve(trimmed);

  if (!isImageFileName(path.basename(filePath))) {
    throw withCode('只提供图片文件，其它类型不走图片接口', 'EINVAL');
  }

  let info;

  try {
    info = await stat(filePath);
  } catch (error) {
    const code = errorCode(error) || 'ENOENT';

    throw withCode(
      code === 'ENOENT' ? `图片不存在：${filePath}` : '读取图片失败',
      code,
    );
  }

  if (!info.isFile()) {
    throw withCode('图片路径不是常规文件', 'EINVAL');
  }

  return {
    mime:
      IMAGE_MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ??
      'application/octet-stream',
    path: filePath,
    size: info.size,
  };
};
