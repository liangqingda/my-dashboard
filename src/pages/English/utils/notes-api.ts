/**
 * 英语笔记模块的数据访问层。
 * 开发时走 Vite 插件的 /api/english/notes（实时读取 learn-english 仓库），
 * 构建产物走 english-notes.index.json（列表索引）+ english-notes/<文件名>（按篇正文）。
 *
 * 列表只取摘要：正文按名按需取，不再随列表整包下发（见 docs/local-repo-data.md）。
 */

import type {
  EnglishNotesSnapshot,
  NoteBody,
  NoteCategory,
  NoteSummary,
  RawNotePayload,
  RawNotesPayload,
  SavedNoteResult,
} from '../types';

/** 列表索引：开发态走中间件接口，构建产物里是插件输出的索引文件 */
const LIST_ENDPOINT = import.meta.env.DEV
  ? '/api/english/notes'
  : '/english-notes.index.json';

/**
 * 构建产物里每篇正文所在的目录，与 `scripts/vite/english-notes.ts` 的
 * `NOTES_BODY_DIR` 是同一个值；改目录时两处一起改。
 * 正文按文件名直接取（文件名口径已在写入侧校验，见 plugins 的 `isNoteName`）。
 */
const BODY_DIR = 'english-notes';

/**
 * 取数请求的缓存策略：开发态必须实时（仓库随时在改），
 * 构建产物是静态文件，交给浏览器 / CDN 正常缓存，别每次进页面重下。
 */
const REQUEST_INIT: RequestInit = import.meta.env.DEV ? { cache: 'no-store' } : {};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/** 归一化一条摘要；缺少文件名的条目直接丢弃 */
const normalizeSummary = (raw: unknown): NoteSummary | null => {
  if (!isObject(raw)) {
    return null;
  }

  const name = asString(raw.name);

  if (!name) {
    return null;
  }

  return {
    categoryKey: asString(raw.categoryKey),
    name,
    topic: asString(raw.topic),
    updatedAt: asString(raw.updatedAt),
  };
};

/** 归一化一个分类项：键或标题缺失、键重复时丢弃，不让脏数据混进列标题 */
const normalizeCategory = (raw: unknown): NoteCategory | null => {
  if (!isObject(raw)) {
    return null;
  }

  const key = asString(raw.key).trim();
  const label = asString(raw.label).trim();

  if (!key || !label) {
    return null;
  }

  return raw.hidden === true ? { hidden: true, key, label } : { key, label };
};

/** 归一化分类清单：只认第一次出现的键 */
const normalizeCategories = (raw: unknown): NoteCategory[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();

  return raw.flatMap((item) => {
    const category = normalizeCategory(item);

    if (!category || seen.has(category.key)) {
      return [];
    }

    seen.add(category.key);

    return [category];
  });
};

/** 把原始 payload 归一化为页面直接消费的笔记摘要集合与分类清单。 */
const normalize = (payload: RawNotesPayload): EnglishNotesSnapshot => ({
  categories: normalizeCategories(payload.categories),
  notes: Array.isArray(payload.notes)
    ? payload.notes.flatMap((raw) => {
        const note = normalizeSummary(raw);

        return note ? [note] : [];
      })
    : [],
});

/** 解析响应里的 JSON；格式不对时抛错，调用方给统一文案 */
const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new Error('笔记数据不是有效的 JSON');
  }
};

/**
 * 读取 learning-record-notes 下的全部笔记摘要。
 * 每次调用都会重新取数，仓库更新后刷新即可看到最新内容。
 */
export const fetchEnglishNotes = async (
  signal?: AbortSignal,
): Promise<EnglishNotesSnapshot> => {
  const response = await fetch(LIST_ENDPOINT, { ...REQUEST_INIT, signal });

  if (!response.ok) {
    throw new Error(
      import.meta.env.DEV
        ? `读取笔记失败（HTTP ${response.status}）`
        : '没有找到构建时生成的笔记索引，请重新执行构建',
    );
  }

  const payload = await readJson(response);

  if (!isObject(payload)) {
    throw new Error('笔记数据格式不符合预期');
  }

  return normalize(payload as RawNotesPayload);
};

/** 开发态单篇接口的归一化：正文必须有，摘要字段缺了按空串处理 */
const normalizeBody = (raw: unknown, name: string): NoteBody | null => {
  if (!isObject(raw) || typeof raw.content !== 'string') {
    return null;
  }

  return {
    content: raw.content,
    name,
    summary: normalizeSummary(raw),
  };
};

/**
 * 读取单篇正文：打开预览、保存之后只需要取这一篇，不必拉全列表正文。
 * 文件不存在时返回 null（例如刚好被删掉）。
 *
 * - 开发态：`GET /api/english/notes?name=…`，顺带回来最新摘要；
 * - 构建产物：直接取 `english-notes/<文件名>`，只有正文。
 */
export const fetchEnglishNote = async (
  name: string,
  signal?: AbortSignal,
): Promise<NoteBody | null> => {
  if (import.meta.env.DEV) {
    const response = await fetch(
      `${LIST_ENDPOINT}?name=${encodeURIComponent(name)}`,
      { ...REQUEST_INIT, signal },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`读取笔记失败（HTTP ${response.status}）`);
    }

    const payload = await readJson(response);

    if (!isObject(payload)) {
      throw new Error('笔记数据格式不符合预期');
    }

    return normalizeBody((payload as RawNotePayload).note, name);
  }

  const response = await fetch(
    `/${BODY_DIR}/${encodeURIComponent(name)}`,
    { ...REQUEST_INIT, signal },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`读取笔记失败（HTTP ${response.status}）`);
  }

  return { content: await response.text(), name, summary: null };
};

/**
 * 把编辑后的 Markdown 写回源文件，并由插件把改动提交到记录仓库（仅开发模式可用）。
 * 保存成功后需要重新读取一次这一篇，页面才会拿到新的正文与摘要。
 */
export const saveEnglishNote = async (
  name: string,
  content: string,
): Promise<SavedNoteResult> => {
  const response = await fetch('/api/english/notes', {
    body: JSON.stringify({ content, name }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

  if (response.ok) {
    try {
      const payload: unknown = await response.json();

      if (isObject(payload) && isObject(payload.commit)) {
        const { commit } = payload;

        return {
          commitError:
            typeof commit.error === 'string' ? commit.error : undefined,
          commitHash:
            typeof commit.hash === 'string' ? commit.hash : undefined,
        };
      }
    } catch {
      // 返回值不是 JSON 时按「已写入但没提交」处理。
    }

    return {};
  }

  if (!import.meta.env.DEV) {
    throw new Error('静态预览不支持编辑，请在开发模式下保存');
  }

  let message = `保存失败（HTTP ${response.status}）`;

  try {
    const payload: unknown = await response.json();

    if (isObject(payload) && typeof payload.message === 'string') {
      message = payload.message || message;
    }
  } catch {
    // 响应不是 JSON 时保留默认文案。
  }

  throw new Error(message);
};
