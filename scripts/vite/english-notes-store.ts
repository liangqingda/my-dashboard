/**
 * learn-english 笔记目录的读写：只认 Markdown 文件，写操作必须留在笔记目录内。
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Dirent } from 'node:fs';

/** 笔记目录（相对记录仓库根目录） */
export const NOTES_DIR = 'learning-record-notes';

/** 只收集 Markdown 文件 */
export const NOTE_EXTENSION = '.md';

/** 目录级的说明文件不算笔记，也不允许写 */
const EXCLUDED_FILES = new Set(['readme.md']);

/**
 * 笔记文件名只能是这种形态，避免路径穿越。
 * 用 `\p{L}\p{N}` 而不是 `\w`：`\w` 只认 ASCII，带中文的文件名
 * （如 `usage-after-不宜直接当-later-连接后续动作.md`）会被判不合法，
 * 连读盘都读不出来，页面上就静默少一篇。这里仍不放行 `/`、`\` 与空白等字符。
 */
const NOTE_NAME_PATTERN = /^[\p{L}\p{N}_.-]+\.md$/u;

/** 一篇笔记 */
export type NoteSnapshot = {
  /** 文件名，如 errors-back-west-spacing.md */
  name: string;
  /** Markdown 原文 */
  content: string;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
};

/** 笔记目录的绝对路径 */
const notesDirOf = (repoDir: string): string =>
  path.resolve(repoDir, NOTES_DIR);

/** 校验文件名并返回安全的绝对路径；不合法直接抛错 */
const resolveNoteFile = (repoDir: string, name: string): string => {
  if (
    !NOTE_NAME_PATTERN.test(name) ||
    EXCLUDED_FILES.has(name.toLowerCase())
  ) {
    throw new Error('这个文件不允许写入');
  }

  const dir = notesDirOf(repoDir);
  const file = path.resolve(dir, name);

  if (!file.startsWith(`${dir}${path.sep}`)) {
    throw new Error('这个文件不允许写入');
  }

  return file;
};

/**
 * 读取一篇笔记；文件在收集过程中消失或不可读时返回 null，
 * 不让单篇失败影响整页。
 */
export const readNote = async (
  repoDir: string,
  name: string,
): Promise<NoteSnapshot | null> => {
  // 读也要过同一套校验：`?name=../../package.json` 这种必须当不存在
  let file: string;

  try {
    file = resolveNoteFile(repoDir, name);
  } catch {
    return null;
  }

  try {
    const [content, info] = await Promise.all([
      readFile(file, 'utf8'),
      stat(file),
    ]);

    return { content, name, updatedAt: info.mtime.toISOString() };
  } catch {
    return null;
  }
};

/** 目录下全部笔记文件名（已排除说明文件） */
const listNoteNames = async (repoDir: string): Promise<string[]> => {
  let entries: Dirent[] = [];

  try {
    entries = await readdir(notesDirOf(repoDir), { withFileTypes: true });
  } catch {
    // 目录不存在时按空笔记集处理，页面会给出空态。
    return [];
  }

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(NOTE_EXTENSION) &&
        !EXCLUDED_FILES.has(entry.name.toLowerCase()),
    )
    .map((entry) => entry.name);
};

/** 汇总笔记目录下的全部笔记，按最后修改时间倒序 */
export const collectNotes = async (
  repoDir: string,
): Promise<NoteSnapshot[]> => {
  const names = await listNoteNames(repoDir);
  const notes = await Promise.all(names.map((name) => readNote(repoDir, name)));

  return notes
    .filter((note): note is NoteSnapshot => note !== null)
    .toSorted(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name),
    );
};

/**
 * 分类清单文件名，与笔记同放一个目录。
 * 分类的键、中文标题、展示顺序与「是否在看板展示」只由记录仓库的这一份维护，
 * 本项目不再硬编码分类表：记录仓库加一个分类，这里自动跟着出现。
 */
export const CATEGORY_CONFIG_FILE = 'categories.json';

/** 分类清单里的一项 */
export type CategoryConfigEntry = {
  /** 分类键，与笔记正文里的记录 ID 前缀一致，如 `errors` */
  key: string;
  /** 看板列标题与表格「分类」单元格的中文文案 */
  label: string;
  /** 是否不在看板与表格里展示（如套题 `paper`）；缺省即展示 */
  hidden: boolean;
};

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 把清单里的单项归一化；键或标题缺失时丢弃，不让脏数据混进列标题 */
const normalizeCategoryEntry = (raw: unknown): CategoryConfigEntry | null => {
  if (!isObject(raw)) {
    return null;
  }

  const key = typeof raw.key === 'string' ? raw.key.trim() : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';

  if (!key || !label) {
    return null;
  }

  return { key, label, hidden: raw.hidden === true };
};

/**
 * 读取记录仓库的分类清单：`learning-record-notes/categories.json`。
 *
 * 文件缺失、不是合法 JSON 或结构不对时都按「没有清单」返回空数组，
 * 页面据此回落成「按笔记里出现的分类键自动分列、标题直接用键名」，不因此白屏。
 * 同一键出现两次时只认第一次。
 */
export const readCategoryConfig = async (
  repoDir: string,
): Promise<CategoryConfigEntry[]> => {
  let text: string;

  try {
    text = await readFile(
      path.resolve(notesDirOf(repoDir), CATEGORY_CONFIG_FILE),
      'utf8',
    );
  } catch {
    return [];
  }

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  const list = isObject(data) && Array.isArray(data.categories)
    ? data.categories
    : [];
  const seen = new Set<string>();
  const entries: CategoryConfigEntry[] = [];

  for (const raw of list) {
    const entry = normalizeCategoryEntry(raw);

    if (!entry || seen.has(entry.key)) {
      continue;
    }

    seen.add(entry.key);
    entries[entries.length] = entry;
  }

  return entries;
};

/**
 * 把正文写回笔记目录下的某个文件，返回写后的修改时间。
 * 只允许写 `learning-record-notes/` 内、文件名符合规则的 Markdown 文件。
 */
export const writeNote = async (
  repoDir: string,
  name: string,
  content: string,
): Promise<{ updatedAt: string }> => {
  const file = resolveNoteFile(repoDir, name);

  await writeFile(file, content, 'utf8');

  const info = await stat(file);

  return { updatedAt: info.mtime.toISOString() };
};
