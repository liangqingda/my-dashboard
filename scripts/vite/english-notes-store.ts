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
 * 笔记文件名只能是 `<category>-<slug>.md`，与记录仓库 `check_note.py` 同一口径：
 * 分类键是小写字母，slug 只用小写 ASCII 字母、数字与连字符。
 *
 * 不再放行中文：中文 slug 会落成非 ASCII 文件名，源仓库的写入器与校验器都已拒收，
 * 这里单方面宽容只会把源仓库的数据缺陷藏起来。顺带挡住 `/`、`\`、空白与 `..`
 * 这类路径穿越写法。
 */
const NOTE_NAME_PATTERN = /^([a-z]+)-([a-z0-9][a-z0-9-]*)\.md$/;

/** 文件名是否是合法笔记：只认 ASCII 的 `<category>-<slug>.md`，不含目录说明文件 */
export const isNoteName = (name: string): boolean =>
  NOTE_NAME_PATTERN.test(name) && !EXCLUDED_FILES.has(name.toLowerCase());

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
  if (!isNoteName(name)) {
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

/** 正文「基础信息」表里的记录 ID 行：`<tr><td>记录 ID / 试卷 ID</td><td>errors:xxx</td></tr>` */
const RECORD_ID_PATTERN = /记录 ID[^<]{0,40}<\/td>\s*<td>([^<]*)<\/td>/u;

/** 正文「基础信息」表里的更新时间行：`<tr><td>笔记更新时间</td><td>2026-11-08 14:39</td></tr>` */
const NOTE_UPDATED_AT_PATTERN = /笔记更新时间[\s\S]{0,40}?<td>([^<]+)/u;

/** 正文「基础信息」表里的目标知识点行：`<tr><td>目标知识点</td><td>out west 不是 outwest</td></tr>` */
const NOTE_TOPIC_PATTERN = /目标知识点[\s\S]{0,40}?<td>([^<]*)</u;

/** 取出第一个捕获组并去空白；没匹配到返回空串 */
const readCell = (pattern: RegExp, content: string): string =>
  (pattern.exec(content)?.[1] ?? '').trim();

/** 从正文的记录 ID 取分类键：`errors:xxx` → `errors`；取不到返回空串 */
export const categoryKeyFromContent = (content: string): string => {
  const recordId = readCell(RECORD_ID_PATTERN, content);
  const separator = recordId.indexOf(':');

  return separator > 0 ? recordId.slice(0, separator).trim() : '';
};

/**
 * 从文件名取分类键：`errors-back-west-spacing.md` → `errors`。
 * 只在正文没有记录 ID 时兜底，正常笔记以正文为准。
 */
export const categoryKeyFromName = (name: string): string => {
  const separator = name.indexOf('-');

  return separator > 0 ? name.slice(0, separator) : '';
};

/** 一篇笔记的分类键：正文优先，文件名兜底 */
export const noteCategoryKey = (content: string, name: string): string =>
  categoryKeyFromContent(content) || categoryKeyFromName(name);

/** 「2026-11-08 14:39」这类正文时间补成可解析的串；已经带 T 的按原样解析 */
const toIsoDateTime = (text: string): string => {
  const trimmed = text.trim();
  const iso = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');

  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(iso) ? `${iso}:00` : iso;
};

/**
 * 笔记更新时间（ISO 串）：优先取正文基础信息表里的字段——那是学习记录自己的更新时间，
 * 仓库被复制、拉取或换机器后文件 mtime 会跟着变，用它排序会让顺序跳来跳去；
 * 正文里没有这个字段（或解析不出来）时才回落到文件 mtime。
 */
export const noteUpdatedAt = (content: string, mtimeIso: string): string => {
  const fromContent = readCell(NOTE_UPDATED_AT_PATTERN, content);
  const parsed = fromContent
    ? Date.parse(toIsoDateTime(fromContent))
    : Number.NaN;

  return Number.isNaN(parsed) ? mtimeIso : new Date(parsed).toISOString();
};

/** 笔记的目标知识点（正文基础信息表里的字段），取不到返回空串 */
export const noteTopic = (content: string): string =>
  readCell(NOTE_TOPIC_PATTERN, content);

/** 列表用的笔记摘要：不带正文，只带页面要展示与排序的字段 */
export type NoteSummary = {
  /** 文件名，如 errors-back-west-spacing.md */
  name: string;
  /** 分类键，如 errors；正文记录 ID 优先，文件名兜底 */
  categoryKey: string;
  /** 目标知识点（摘自正文基础信息表）；缺失时为空串 */
  topic: string;
  /** 笔记更新时间（ISO 串）；正文里的「笔记更新时间」优先，缺失时回落文件 mtime */
  updatedAt: string;
};

/** 列表摘要 + 正文，供单篇接口与构建产物使用 */
export type NoteDetail = NoteSummary & {
  /** Markdown 原文 */
  content: string;
};

/** 把一篇笔记摊成列表摘要：解析三个派生字段，丢掉正文 */
const toNoteSummary = ({
  content,
  name,
  updatedAt,
}: NoteSnapshot): NoteSummary => ({
  categoryKey: noteCategoryKey(content, name),
  name,
  topic: noteTopic(content),
  updatedAt: noteUpdatedAt(content, updatedAt),
});

/** 把一篇笔记摊成「摘要 + 正文」 */
export const toNoteDetail = (note: NoteSnapshot): NoteDetail => ({
  ...toNoteSummary(note),
  content: note.content,
});

/**
 * 汇总笔记目录下的全部笔记**摘要**，按笔记更新时间倒序。
 *
 * 列表只要摘要：正文留到打开某一篇时再按名取（见 docs/local-repo-data.md），
 * 页面进首屏不再陪着几百篇正文一起下载。
 */
export const collectNoteSummaries = async (
  repoDir: string,
): Promise<NoteSummary[]> => {
  const names = await listNoteNames(repoDir);
  const notes = await Promise.all(names.map((name) => readNote(repoDir, name)));

  return notes
    .filter((note): note is NoteSnapshot => note !== null)
    .map((note) => toNoteSummary(note))
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
