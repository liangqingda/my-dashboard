/**
 * 本机任意目录的扫描与写盘：列出指定目录下的子文件夹与常规文件，不限文件类型；
 * 另提供新建 / 重命名 / 移动 / 删除的写盘收口。
 *
 * 这一层不假设固定仓库位置——目录路径由页面在查询参数里给出，
 * 校验与错误归类都收在这里，路由壳只负责拼响应。
 */

import { execFile } from 'node:child_process';
import { mkdir, readdir, rename as renamePath, rm, stat } from 'node:fs/promises';
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

/** 分类的固定顺序，拼文件夹分类摘要时按它排，与前端筛选项一致 */
const CATEGORY_ORDER: readonly FileCategory[] = [
  'video',
  'pdf',
  'markdown',
  'other',
];

/**
 * 文件夹分类摘要的扫描预算：只用来判断「里面有没有这类文件」，
 * 逐层往下找，累计看够这么多个条目或走够这么多层就收工，不保证数尽整棵树。
 */
const FOLDER_CATEGORY_BUDGET = 2000;
const FOLDER_CATEGORY_DEPTH = 6;

/** 目录里的一条子文件夹 */
export type FolderEntry = {
  /** 文件夹名（不含路径） */
  name: string;
  /** 文件夹的绝对路径，点开时原样回传给中间件 */
  path: string;
  /** 该文件夹直属的条目数（文件夹 + 文件，不递归子目录） */
  itemCount: number;
  /** 文件夹内出现过的文件分类（含深层，按扫描预算收口）；按类型筛选时用它决定要不要露出这个文件夹 */
  categories: FileCategory[];
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

/** 同名冲突：目标位置已有同名条目，调用方按 409 收口，不覆盖 */
export class EntryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntryConflictError';
    this.code = 'EEXIST';
  }

  code: string;
}

/** 读盘 / 写盘错误 → HTTP 状态码；认不出的按 500 处理 */
export const statusForReadError = (error: unknown): number => {
  const code = errorCode(error);

  if (code === 'ENOENT' || code === 'ENOTDIR') {
    return 404;
  }

  if (code === 'EACCES' || code === 'EPERM') {
    return 403;
  }

  if (code === 'EEXIST') {
    return 409;
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

/** 可进列表的条目：既不是隐藏项，也不是符号链接 */
const isListedEntry = (entry: Dirent): boolean =>
  !entry.isSymbolicLink() && !isHiddenName(entry.name);

/** 读一层目录的条目；读不到按空目录处理 */
const readEntries = async (dir: string): Promise<Dirent[]> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

/**
 * 扫描一个文件夹：直属条目数（文件夹 + 文件，不含隐藏项与符号链接），
 * 以及内部出现过的文件分类。分类按层往下找，找到四类就提前结束，
 * 累计到预算上限或走完层数上限时按已发现的算——只服务于类型筛选的「露不露出这个文件夹」。
 * 读不到按空文件夹处理。
 */
const scanFolder = async (
  dir: string,
): Promise<{ itemCount: number; categories: FileCategory[] }> => {
  const entries = (await readEntries(dir)).filter(isListedEntry);
  const found = new Set<FileCategory>();
  const folders: string[] = [];
  let itemCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory()) {
      itemCount += 1;
      folders.push(path.join(dir, entry.name));
      continue;
    }

    if (entry.isFile()) {
      itemCount += 1;
      found.add(categoryForName(entry.name));
    }
  }

  let frontier = folders;
  let budget = FOLDER_CATEGORY_BUDGET;

  for (
    let depth = 1;
    depth <= FOLDER_CATEGORY_DEPTH &&
    budget > 0 &&
    frontier.length > 0 &&
    found.size < CATEGORY_ORDER.length;
    depth += 1
  ) {
    const next: string[] = [];

    for (const current of frontier) {
      for (const entry of await readEntries(current)) {
        if (!isListedEntry(entry)) {
          continue;
        }

        if (budget <= 0) {
          break;
        }

        budget -= 1;

        if (entry.isFile()) {
          found.add(categoryForName(entry.name));
        } else if (entry.isDirectory()) {
          next.push(path.join(current, entry.name));
        }
      }

      if (budget <= 0) {
        break;
      }
    }

    frontier = next;
  }

  return {
    categories: CATEGORY_ORDER.filter((category) => found.has(category)),
    itemCount,
  };
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
        ...(await scanFolder(entryPath)),
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

/** 新建文件夹的默认名；重名时依次追加 2、3… */
const DEFAULT_FOLDER_NAME = '未命名文件夹';

/** 校验条目名：去首尾空白；拒收空名、路径分隔符、单双点与点开头的隐藏名 */
const resolveEntryName = (raw: string): string => {
  const name = raw.trim();

  if (!name) {
    throw new Error('名称不能为空');
  }

  if (name.includes('/') || name.includes('\\')) {
    throw new Error('名称不能包含路径分隔符');
  }

  if (name === '.' || name === '..') {
    throw new Error('名称不能是 . 或 ..');
  }

  if (name.startsWith('.')) {
    throw new Error('名称不能以点开头');
  }

  if (name.length > 255) {
    throw new Error('名称过长');
  }

  return name;
};

/** 路径是否已存在；读不到按不存在处理 */
const pathExists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);

    return true;
  } catch {
    return false;
  }
};

/** 在目录里找一个不重名的文件夹名：基础名被占用就依次追加 2、3… */
const uniqueFolderName = async (
  dir: string,
  base: string,
): Promise<string> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const taken = new Set(entries.map((entry) => entry.name));

  if (!taken.has(base)) {
    return base;
  }

  let index = 2;

  while (taken.has(`${base} ${index}`)) {
    index += 1;
  }

  return `${base} ${index}`;
};

/**
 * 在指定目录下新建文件夹；目录由 `resolveDir` 校验。返回新建条目的摘要，
 * 初始直属条目数为 0。默认名重名时自动追加序号，不覆盖已有文件夹。
 */
export const createFolder = async (dirInput: string): Promise<FolderEntry> => {
  const dir = resolveDir(dirInput);
  const name = await uniqueFolderName(dir, DEFAULT_FOLDER_NAME);
  const target = path.join(dir, name);

  if (await pathExists(target)) {
    throw new EntryConflictError(`已存在同名文件夹：${name}`);
  }

  await mkdir(target);

  return { categories: [], itemCount: 0, name, path: target };
};

/**
 * 重命名一条文件夹或文件；新名校验通过后，目标位置已有同名条目则按冲突拒绝，不覆盖。
 * 返回重命名后的路径与名字。
 */
export const renameEntry = async (
  entryPath: string,
  rawName: string,
): Promise<{ name: string; path: string }> => {
  const source = path.resolve(entryPath);
  const name = resolveEntryName(rawName);

  let sourceInfo;

  try {
    sourceInfo = await stat(source);
  } catch (error) {
    throw toReadError(error, source);
  }

  if (!sourceInfo.isDirectory() && !sourceInfo.isFile()) {
    throw new Error('只能重命名文件夹或常规文件');
  }

  const target = path.join(path.dirname(source), name);

  if (await pathExists(target)) {
    throw new EntryConflictError(`已存在同名条目：${name}`);
  }

  await renamePath(source, target);

  return { name, path: target };
};

/**
 * 把一条文件夹或文件移动到目标目录；目标位置已有同名条目则按冲突拒绝，不覆盖。
 * 文件夹不能移动到它自身或其子文件夹内。
 */
export const moveEntry = async (
  sourceInput: string,
  targetDirInput: string,
): Promise<void> => {
  const source = path.resolve(sourceInput);
  const targetDir = resolveDir(targetDirInput);

  let sourceInfo;

  try {
    sourceInfo = await stat(source);
  } catch (error) {
    throw toReadError(error, source);
  }

  const target = path.join(targetDir, path.basename(source));

  if (await pathExists(target)) {
    throw new EntryConflictError(`目标文件夹已有同名条目：${path.basename(source)}`);
  }

  if (
    sourceInfo.isDirectory() &&
    (target === source || target.startsWith(`${source}${path.sep}`))
  ) {
    throw new Error('不能把文件夹移动到它自身或其子文件夹内');
  }

  await renamePath(source, target);
};

/**
 * 删除一条条目：文件夹连同内部全部内容递归删除，文件直接删除；不可恢复。
 * 只允许删文件夹或常规文件，不存在的路径按 404 收口。
 */
export const deleteEntry = async (entryPath: string): Promise<void> => {
  const source = path.resolve(entryPath);

  let sourceInfo;

  try {
    sourceInfo = await stat(source);
  } catch (error) {
    throw toReadError(error, source);
  }

  if (!sourceInfo.isDirectory() && !sourceInfo.isFile()) {
    throw new Error('只能删除文件夹或常规文件');
  }

  await rm(source, { recursive: true });
};

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
