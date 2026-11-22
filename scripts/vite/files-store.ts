/**
 * 本机任意目录的只读扫描：列出指定目录下的子文件夹与常规文件，不限文件类型。
 *
 * 这一层只做读盘与归类，不假设固定仓库位置——目录路径由页面在查询参数里给出，
 * 校验与错误归类都收在这里，路由壳只负责拼响应。
 */

import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { Dirent } from 'node:fs';

const execFileAsync = promisify(execFile);

/** 文件归类：前端按这一档换图标、做类型筛选；认不出扩展名的落 `other` */
export type FileCategory = 'video' | 'pdf' | 'markdown' | 'other';

/** 各分类识别的扩展名（小写、带点）；归类只看扩展名，不读文件内容 */
const CATEGORY_EXTENSIONS: Readonly<Record<Exclude<FileCategory, 'other'>, readonly string[]>> = {
  video: [
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
  ],
  pdf: ['.pdf'],
  markdown: ['.md', '.markdown'],
};

/** 目录里的一条子文件夹 */
export type FolderEntry = {
  /** 文件夹名（不含路径） */
  name: string;
  /** 文件夹的绝对路径，点开时原样回传给中间件 */
  path: string;
  /** 该文件夹直属的条目数（文件夹 + 文件，不递归子目录） */
  itemCount: number;
};

/** 目录里的一条文件 */
export type FileEntry = {
  /** 文件名（含扩展名） */
  name: string;
  /** 文件的绝对路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
  /** 文件归类，用于区分图标与类型筛选 */
  category: FileCategory;
};

/** 一次目录扫描的结果 */
export type DirListing = {
  /** 当前目录的绝对路径 */
  path: string;
  /** 当前目录名 */
  name: string;
  /** 父目录绝对路径；已经是文件系统根时为 null */
  parent: string | null;
  /** 子文件夹（按名称排序） */
  folders: FolderEntry[];
  /** 直属文件（按名称排序） */
  files: FileEntry[];
};

/** 以点开头的隐藏条目不进列表，避免把系统文件铺到页面上 */
const isHiddenName = (name: string): boolean => name.startsWith('.');

/** 按扩展名归类文件名：大小写不敏感；扩展名不在任何白名单内落 `other` */
const categoryForName = (name: string): FileCategory => {
  const lower = name.toLowerCase();

  for (const [category, extensions] of Object.entries(CATEGORY_EXTENSIONS)) {
    if (extensions.some((ext) => lower.endsWith(ext))) {
      return category as FileCategory;
    }
  }

  return 'other';
};

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

/** 把读盘错误归成页面能直接读懂的原因；原始错误码随错误一起保留，供状态码归类 */
const toReadError = (error: unknown, dir: string): Error => {
  const code = errorCode(error);
  const message = (() => {
    switch (code) {
      case 'ENOENT':
        return `目录不存在：${dir}`;
      case 'ENOTDIR':
        return `路径不是目录：${dir}`;
      case 'EACCES':
      case 'EPERM':
        return `没有权限读取目录：${dir}`;
      default:
        return error instanceof Error ? error.message : '读取目录失败';
    }
  })();

  const wrapped = new Error(message) as Error & { code?: string };

  if (code) {
    wrapped.code = code;
  }

  return wrapped;
};

/** 数一个文件夹直属的条目数（文件夹 + 文件，不含隐藏项与符号链接）；读不到就按 0 计 */
const countItems = async (dir: string): Promise<number> => {
  let entries: Dirent[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  return entries.reduce(
    (count, entry) =>
      !entry.isSymbolicLink() && !isHiddenName(entry.name) &&
      (entry.isDirectory() || entry.isFile())
        ? count + 1
        : count,
    0,
  );
};

/**
 * 扫描一个目录：子文件夹直属条目数 + 直属文件的大小与修改时间。
 * 单个条目读不到就跳过，不影响同级其它条目；目录本身读不到时抛错给路由壳归类。
 */
export const listDirectory = async (input: string): Promise<DirListing> => {
  const dir = resolveDir(input);

  let entries: Dirent[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw toReadError(error, dir);
  }

  const folders: FolderEntry[] = [];
  const files: FileEntry[] = [];

  for (const entry of entries) {
    if (isHiddenName(entry.name) || entry.isSymbolicLink()) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      folders.push({
        name: entry.name,
        path: entryPath,
        itemCount: await countItems(entryPath),
      });
      continue;
    }

    if (entry.isFile()) {
      try {
        const info = await stat(entryPath);

        files.push({
          name: entry.name,
          path: entryPath,
          size: info.size,
          updatedAt: info.mtime.toISOString(),
          category: categoryForName(entry.name),
        });
      } catch {
        // 单文件 stat 失败就跳过这一条，目录里其它条目照常展示。
      }
    }
  }

  folders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  const parent = path.dirname(dir) === dir ? null : path.dirname(dir);

  return { folders, name: path.basename(dir), parent, path: dir, files };
};

/** 未指定目录时的默认起点：当前用户主目录 */
export const homeDirectory = (): string => homedir();

/** 系统目录选择器返回值：选中给绝对路径，用户取消给 cancelled */
export type PickedDir = { path: string } | { cancelled: true };

/** 判断 osascript 报错是不是用户在选择框里点了取消（Apple 错误码 -128） */
const isCancelError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const record = error as { message?: string; stderr?: string };
  const text = `${record.message ?? ''} ${record.stderr ?? ''}`;

  return text.includes('-128') || /cancel/i.test(text);
};

/** AppleScript 字符串转义：反斜杠与双引号先转义，避免路径里的特殊字符打断脚本 */
const appleScriptString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * 拼选择器 AppleScript：`defaultDir` 传入时先把它设为默认位置，选择框打开即停在该目录；
 * 传空则不带默认位置，从用户主目录开始。路径里的反斜杠与双引号先转义。
 */
export const buildPickerScript = (defaultDir?: string): string =>
  defaultDir
    ? [
        `set defaultDir to POSIX file "${appleScriptString(defaultDir)}"`,
        'set picked to (choose folder with prompt "选择要浏览的目录" default location defaultDir)',
        'POSIX path of picked',
      ].join('\n')
    : 'POSIX path of (choose folder with prompt "选择要浏览的目录")';

/**
 * 调起 macOS 系统目录选择框，返回选中目录的 POSIX 绝对路径；
 * 用户取消选择时返回 cancelled，不按失败处理。
 * `defaultDir` 传入时选择框默认定位到该目录；传空则从用户主目录开始。
 */
export const pickDirectory = async (defaultDir?: string): Promise<PickedDir> => {
  const script = buildPickerScript(defaultDir);

  try {
    const { stdout } = await execFileAsync('osascript', ['-e', script]);
    const picked = stdout.trim();

    return picked ? { path: picked } : { cancelled: true };
  } catch (error) {
    if (isCancelError(error)) {
      return { cancelled: true };
    }

    throw error;
  }
};
