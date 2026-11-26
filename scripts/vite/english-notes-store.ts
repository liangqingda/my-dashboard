/**
 * learn-english 笔记目录的读写：只认 Markdown 文件，写操作必须留在笔记目录内。
 */

import { open, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import type { Dirent } from 'node:fs';

/** 笔记目录（相对记录仓库根目录） */
export const NOTES_DIR = 'learning-record-notes';

/** 只收集 Markdown 文件 */
export const NOTE_EXTENSION = '.md';

/** 目录级的说明文件不算笔记，也不允许写 */
const EXCLUDED_FILES = new Set(['readme.md']);

/**
 * 笔记按分类分目录存放：`<category>/<category>-<slug>.md`，目录名必须等于文件名前缀。
 * 与记录仓库 `check_note.py` 同一口径；slug 只放行小写 ASCII 字母、数字与连字符。
 * 不再放行中文：中文 slug 会落成非 ASCII 文件名，源仓库的写入器与校验器都已拒收，
 * 这里单方面宽容只会把源仓库的数据缺陷藏起来。顺带挡住 `..`、空白与多余层级。
 */
const NOTE_PATH_PATTERN = /^([a-z]+)\/([a-z]+)-([a-z0-9][a-z0-9-]*)\.md$/;

/** 笔记是否是合法路径：`<category>/<category>-<slug>.md`，目录与文件名前缀必须一致 */
export const isNoteName = (name: string): boolean => {
  const match = NOTE_PATH_PATTERN.exec(name);

  return match !== null && match[1] === match[2];
};

/** 一篇笔记 */
export type NoteSnapshot = {
  /** 相对笔记目录的路径，如 errors/errors-back-west-spacing.md */
  name: string;
  /** Markdown 原文 */
  content: string;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
};

/** 笔记目录的绝对路径 */
const notesDirOf = (repoDir: string): string =>
  path.resolve(repoDir, NOTES_DIR);

/** 校验笔记路径并返回安全的绝对路径；不合法直接抛错 */
const resolveNoteFile = (repoDir: string, name: string): string => {
  const rejected = '这个文件不允许读取';

  if (!isNoteName(name)) {
    throw new Error(rejected);
  }

  const dir = notesDirOf(repoDir);
  const file = path.resolve(dir, name);

  if (!file.startsWith(`${dir}${path.sep}`)) {
    throw new Error(rejected);
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

/**
 * 目录下全部笔记的相对路径（`<category>/<name>.md`，已排除说明文件）。
 * 只扫一层分类目录：`learning-record-notes/` 根下只放 `categories.json` 与 `README.md`。
 */
const listNoteNames = async (repoDir: string): Promise<string[]> => {
  const dir = notesDirOf(repoDir);
  let entries: Dirent[] = [];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    // 目录不存在时按空笔记集处理，页面会给出空态。
    return [];
  }

  const names: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const category = entry.name;

    if (!/^[a-z]+$/.test(category)) {
      continue;
    }

    let files: Dirent[] = [];

    try {
      files = await readdir(path.join(dir, category), { withFileTypes: true });
    } catch {
      continue;
    }

    for (const file of files) {
      if (
        file.isFile() &&
        file.name.toLowerCase().endsWith(NOTE_EXTENSION) &&
        !EXCLUDED_FILES.has(file.name.toLowerCase()) &&
        isNoteName(`${category}/${file.name}`)
      ) {
        names[names.length] = `${category}/${file.name}`;
      }
    }
  }

  return names;
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
 * 从文件名取分类键：`errors/errors-back-west-spacing.md` → `errors`。
 * 只在正文没有记录 ID 时兜底，正常笔记以正文为准。
 * 取相对路径的最后一段，分类目录本身不参与解析。
 */
export const categoryKeyFromName = (name: string): string => {
  const fileName = name.slice(name.lastIndexOf('/') + 1);
  const separator = fileName.indexOf('-');

  return separator > 0 ? fileName.slice(0, separator) : '';
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

/** 笔记的记录 ID（正文基础信息表里的 `errors:xxx`），取不到返回空串 */

/** 列表用的笔记摘要：不带正文，只带页面要展示与排序的字段 */
export type NoteSummary = {
  /** 相对笔记目录的路径，如 errors/errors-back-west-spacing.md */
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

/** 摘要只读文件头时的字节上限：基础信息表在正文最前面，几 KB 就够 */
const NOTE_HEAD_BYTES = 16 * 1024;

/** 一次允许同时读进内存的笔记篇数：峰值不随笔记总数线性上涨 */
const NOTE_READ_CONCURRENCY = 8;

/** 读到的文件头：正文是否被截断（没截断时它就是整篇正文） */
type NoteHead = {
  text: string;
  truncated: boolean;
};

/**
 * 读一篇笔记的前若干字节；读不到返回 null。
 * 超过上限时截到最后一个换行：宁可回落整读，也不把某一行读成半截。
 */
const readNoteHead = async (file: string): Promise<NoteHead | null> => {
  const handle = await open(file, 'r').catch(() => null);

  if (handle === null) {
    return null;
  }

  try {
    const { size } = await handle.stat();
    const length = Math.min(size, NOTE_HEAD_BYTES);

    if (length === 0) {
      return { text: '', truncated: false };
    }

    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    const text = buffer.subarray(0, bytesRead).toString('utf8');

    if (size <= NOTE_HEAD_BYTES) {
      return { text, truncated: false };
    }

    const cut = text.lastIndexOf('\n');

    return { text: cut >= 0 ? text.slice(0, cut) : '', truncated: true };
  } catch {
    return null;
  } finally {
    await handle.close();
  }
};

/** 三行基础信息表字段：都在才说明整张表落在截断的文件头里 */
const HEAD_FIELD_PATTERNS = [
  RECORD_ID_PATTERN,
  NOTE_UPDATED_AT_PATTERN,
  NOTE_TOPIC_PATTERN,
];

/**
 * 读一篇笔记的摘要：正常笔记只读文件头，不把整篇正文摊进内存。
 * 文件头被截断且信息表没完整落在里面时回落整读——截断的字段可能只读到半行，
 * 拿它当摘要会静默改掉更新时间这类值。
 */
const readNoteSummary = async (
  repoDir: string,
  name: string,
): Promise<NoteSummary | null> => {
  let file: string;

  try {
    file = resolveNoteFile(repoDir, name);
  } catch {
    return null;
  }

  const [head, info] = await Promise.all([
    readNoteHead(file),
    stat(file).catch(() => null),
  ]);

  if (head === null || info === null) {
    return null;
  }

  const headIsWholeTable =
    !head.truncated ||
    HEAD_FIELD_PATTERNS.every((pattern) => pattern.test(head.text));

  if (!headIsWholeTable) {
    const note = await readNote(repoDir, name);

    return note === null ? null : toNoteSummary(note);
  }

  return {
    categoryKey: noteCategoryKey(head.text, name),
    name,
    topic: noteTopic(head.text),
    updatedAt: noteUpdatedAt(head.text, info.mtime.toISOString()),
  };
};

/** 按并发上限跑一组读取，结果与输入同序 */
const mapWithLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;

      next += 1;
      results[index] = await run(items[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
};

/**
 * 汇总笔记目录下的全部笔记**摘要**，按笔记更新时间倒序。
 *
 * 列表只要摘要：正文留到打开某一篇时再按名取（见 docs/local-repo-data.md），
 * 页面进首屏不再陪着几百篇正文一起下载；读盘也只取文件头、并限制并发，
 * 摘要这份内存不随笔记总数线性增长。
 */
export const collectNoteSummaries = async (
  repoDir: string,
): Promise<NoteSummary[]> => {
  const names = await listNoteNames(repoDir);
  const notes = await mapWithLimit(names, NOTE_READ_CONCURRENCY, (name) =>
    readNoteSummary(repoDir, name),
  );

  return notes
    .filter((note): note is NoteSummary => note !== null)
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
