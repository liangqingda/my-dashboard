/**
 * 图片裁剪的写盘侧：把前端 canvas 裁出来的图按两种方式落回本机。
 *
 * - `replace`：先写同目录的临时文件，再原子替换源文件——不是「先删源文件再写新的」，
 *   中间不留源文件不存在的空窗，替换失败时源文件仍是原样；
 * - `copy`：写进源文件同级的 `<文件名> - 裁剪/` 目录，文件名 `<文件名> - N.<扩展名>`，
 *   N 取目录里已有编号的最大值 +1（删过旧的也不复用编号），写入用 `wx` 不覆盖已有文件。
 *
 * 只收 PNG / JPEG / WebP——浏览器 canvas 能编码的这三种，也正好是扩展名可以原样保留的三种。
 * 其它图片格式换格式保存会让扩展名与内容对不上（GIF 还会丢掉动画），一律拒绝。
 */

import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层，不经过 Vite 的 `.js → .ts` 解析
import { openImageFile } from './files-images.ts';

/** 裁剪的保存方式：覆盖源文件 / 另存到新目录 */
export type CropMode = 'replace' | 'copy';

/** 一次裁剪落盘的结果 */
export type CropReceipt = {
  /** 保存方式 */
  mode: CropMode;
  /** 落盘后的绝对路径 */
  path: string;
  /** 文件名（含扩展名） */
  name: string;
  /** 所在目录；`copy` 模式是新建的「- 裁剪」目录 */
  dir: string;
};

/** 另存目录的后缀：`cat.png` → `cat - 裁剪/` */
export const CROP_DIR_SUFFIX = ' - 裁剪';

/** 源扩展名 → canvas 能编码的格式；不在这张表里的图片不收 */
const ENCODING_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.jpeg': 'jpeg',
  '.jpg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
};

/** 同一目录下最多尝试的连续编号：正常远近够用，撞满说明有人在并发灌文件 */
const COPY_ATTEMPT_LIMIT = 50;

/** 带 `code` 的错误：路由壳按它归类 HTTP 状态码 */
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

/** 正则里的普通字符串转义（文件名里可能有 `. + ( )` 这类字符） */
const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 解析裁剪数据：必须是 `data:image/<格式>;base64,…`，且格式与源文件扩展名一致。
 * 前端 canvas 按源扩展名编码，对不上就是请求拼错了，不该静默改名。
 */
const decodeCropDataUrl = (dataUrl: string, encoding: string): Buffer => {
  const match = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl.trim());

  if (match === null) {
    throw withCode('裁剪数据不是有效的图片', 'EINVAL');
  }

  if (match[1] !== encoding) {
    throw withCode('裁剪数据的格式与源文件不一致', 'EINVAL');
  }

  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length === 0) {
    throw withCode('裁剪数据为空', 'EINVAL');
  }

  return buffer;
};

/** 目录里已有的 `<文件名> - N.<扩展名>`，返回下一个可用编号（最大 +1） */
const nextCopyIndex = async (
  dir: string,
  stem: string,
  extension: string,
): Promise<number> => {
  const pattern = new RegExp(
    `^${escapeRegExp(stem)} - (\\d+)${escapeRegExp(extension)}$`,
  );
  const entries = await readdir(dir).catch(() => []);
  let max = 0;

  for (const entry of entries) {
    const match = pattern.exec(entry);

    if (match !== null) {
      max = Math.max(max, Number.parseInt(match[1], 10) || 0);
    }
  }

  return max + 1;
};

/**
 * 裁剪一张本机图片并落盘。
 *
 * @param sourceInput 源图片绝对路径；必须是已存在的图片文件
 * @param dataUrl 裁剪结果的 data URL（格式必须与源文件扩展名一致）
 * @param modeInput `replace` / `copy`
 */
export const cropImageFile = async (
  sourceInput: string,
  dataUrl: string,
  modeInput: string,
): Promise<CropReceipt> => {
  const image = await openImageFile(sourceInput);
  const extension = path.extname(image.path).toLowerCase();
  const encoding = ENCODING_BY_EXTENSION[extension];

  if (encoding === undefined) {
    throw withCode(
      '这种图片格式不支持裁剪保存（只支持 PNG / JPEG / WebP）',
      'EINVAL',
    );
  }

  if (modeInput !== 'replace' && modeInput !== 'copy') {
    throw withCode('不认识的裁剪保存方式', 'EINVAL');
  }

  const buffer = decodeCropDataUrl(dataUrl, encoding);
  const name = path.basename(image.path);
  const dir = path.dirname(image.path);

  if (modeInput === 'replace') {
    const temp = path.join(dir, `.${name}.crop-${randomUUID()}`);

    try {
      await writeFile(temp, buffer);
      await rename(temp, image.path);
    } catch (error) {
      await rm(temp, { force: true });

      throw error;
    }

    return { dir, mode: 'replace', name, path: image.path };
  }

  const stem = name.slice(0, -extension.length);
  const targetDir = path.join(dir, `${stem}${CROP_DIR_SUFFIX}`);

  await mkdir(targetDir, { recursive: true });

  const start = await nextCopyIndex(targetDir, stem, extension);

  for (let attempt = 0; attempt < COPY_ATTEMPT_LIMIT; attempt += 1) {
    const copyName = `${stem} - ${start + attempt}${extension}`;
    const copyPath = path.join(targetDir, copyName);

    try {
      await writeFile(copyPath, buffer, { flag: 'wx' });

      return { dir: targetDir, mode: 'copy', name: copyName, path: copyPath };
    } catch (error) {
      if (errorCode(error) === 'EEXIST') {
        continue;
      }

      throw error;
    }
  }

  throw withCode('同一目录里同名裁剪图片过多，稍后再试', 'EEXIST');
};
