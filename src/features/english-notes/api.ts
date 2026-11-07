/**
 * 英语笔记模块的数据访问层。
 * 开发时走 Vite 插件的 /api/english/notes（实时读取 learn-english 仓库），
 * 构建产物走同目录下的 english-notes.json。
 */

import type {
  EnglishNote,
  EnglishNotesSnapshot,
} from '@/features/english-notes/types';

/** 笔记接口；构建产物里使用插件输出的静态快照文件 */
const ENDPOINT = import.meta.env.DEV
  ? '/api/english/notes'
  : '/english-notes.json';

/** 原始 payload 结构（由 Vite 插件生成） */
type RawPayload = {
  /** 快照生成时间 */
  generatedAt: unknown;
  /** 记录仓库路径 */
  repoPath: unknown;
  /** 笔记列表 */
  notes: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNumber = (value: unknown): number => {
  const parsed = value;

  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
};

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
    size: asNumber(raw.size),
  };
};

/** 把原始 payload 归一化为页面直接消费的笔记集合。 */
const normalize = (payload: RawPayload): EnglishNotesSnapshot => {
  const notes = Array.isArray(payload.notes)
    ? payload.notes.flatMap((raw) => {
        const note = normalizeNote(raw);

        return note ? [note] : [];
      })
    : [];

  return {
    generatedAt: asString(payload.generatedAt),
    repoPath: asString(payload.repoPath),
    notes,
  };
};

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

  return normalize(payload as RawPayload);
};
