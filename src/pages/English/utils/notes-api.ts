/**
 * 英语笔记模块的数据访问层。
 * 开发时走 Vite 插件的 /api/english/notes（实时读取 learn-english 仓库），
 * 构建产物走同目录下的 english-notes.json。
 */

import type {
  EnglishNote,
  EnglishNotesSnapshot,
} from '@/pages/English/types';

/** 笔记接口；构建产物里使用插件输出的静态快照文件 */
const ENDPOINT = import.meta.env.DEV
  ? '/api/english/notes'
  : '/english-notes.json';

/** 全部笔记的原始 payload（由 Vite 插件生成） */
type RawNotesPayload = {
  /** 笔记列表 */
  notes: unknown;
};

/** 单篇笔记的原始 payload */
type RawNotePayload = {
  /** 一篇笔记 */
  note: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/** 归一化单篇笔记；缺少文件名或正文的条目直接丢弃。 */
const normalizeNote = (raw: unknown): EnglishNote | null => {
  if (!isObject(raw)) {
    return null;
  }

  const name = asString(raw.name);

  if (!name || typeof raw.content !== 'string') {
    return null;
  }

  return {
    name,
    content: raw.content,
    updatedAt: asString(raw.updatedAt),
  };
};

/** 把原始 payload 归一化为页面直接消费的笔记集合。 */
const normalize = (payload: RawNotesPayload): EnglishNotesSnapshot => ({
  notes: Array.isArray(payload.notes)
    ? payload.notes.flatMap((raw) => {
        const note = normalizeNote(raw);

        return note ? [note] : [];
      })
    : [],
});

/**
 * 读取 learning-record-notes 下的全部笔记。
 * 每次调用都会重新取数，仓库更新后刷新即可看到最新内容。
 */
export const fetchEnglishNotes = async (
  signal?: AbortSignal,
): Promise<EnglishNotesSnapshot> => {
  const response = await fetch(ENDPOINT, { cache: 'no-store', signal });

  if (!response.ok) {
    throw new Error(
      import.meta.env.DEV
        ? `读取笔记失败（HTTP ${response.status}）`
        : '没有找到构建时生成的笔记快照，请重新执行构建',
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error('笔记数据不是有效的 JSON');
  }

  if (!isObject(payload)) {
    throw new Error('笔记数据格式不符合预期');
  }

  return normalize(payload as RawNotesPayload);
};

/**
 * 读取单篇笔记：打开预览、保存之后只需要刷这一篇，不必拉全仓库正文。
 * 文件不存在时返回 null（例如刚好被删掉）。
 */
export const fetchEnglishNote = async (
  name: string,
  signal?: AbortSignal,
): Promise<EnglishNote | null> => {
  if (!import.meta.env.DEV) {
    // 静态快照只带构建时的内容，单篇刷新没有意义，直接回落到列表里的那份。
    return null;
  }

  const response = await fetch(`${ENDPOINT}?name=${encodeURIComponent(name)}`, {
    cache: 'no-store',
    signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`读取笔记失败（HTTP ${response.status}）`);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error('笔记数据不是有效的 JSON');
  }

  if (!isObject(payload)) {
    throw new Error('笔记数据格式不符合预期');
  }

  return normalizeNote((payload as RawNotePayload).note);
};

/** 保存后自动提交到记录仓库的结果 */
export type SavedNoteResult = {
  /** 自动提交失败的原因；成功或没有可提交内容时为空 */
  commitError?: string;
  /** 自动提交的短 hash */
  commitHash?: string;
};

/**
 * 把编辑后的 Markdown 写回源文件，并由插件把改动提交到记录仓库（仅开发模式可用）。
 * 保存成功后需要重新读取一次笔记，页面才会拿到新的正文与修改时间。
 */
export const saveEnglishNote = async (
  name: string,
  content: string,
): Promise<SavedNoteResult> => {
  const response = await fetch(ENDPOINT, {
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
