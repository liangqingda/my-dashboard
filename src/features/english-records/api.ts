/**
 * 英语记录模块的数据访问层。
 * 开发时走 Vite 插件的 /api/english/records（实时读取 learn-english 仓库），
 * 构建产物走同目录下的 english-records.json。
 */

import type {
  EnglishRecord,
  EnglishRecordsSnapshot,
  RecordStatus,
  ReviewEvent,
} from '@/features/english-records/types';

/** 记录接口；构建产物里使用插件输出的静态快照文件 */
const ENDPOINT = import.meta.env.DEV
  ? '/api/english/records'
  : '/english-records.json';

const STATUSES: RecordStatus[] = ['learning', 'familiar', 'mastered'];

/** 原始 payload 中单个分类的结构 */
type RawCategory = {
  /** 分类标识 */
  category: unknown;
  /** learning-records/<category>.json 内容 */
  learning: unknown;
  /** mastered-learning-records/<category>.json 内容 */
  mastered: unknown;
};

/** 原始 payload 结构（由 Vite 插件生成） */
type RawPayload = {
  /** 快照生成时间 */
  generatedAt: unknown;
  /** 记录仓库路径 */
  repoPath: unknown;
  /** 各分类原始数据 */
  categories: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asPositiveInt = (value: unknown): number => {
  const parsed = asNumber(value);

  return parsed === null ? 0 : Math.round(parsed);
};

const asStatus = (value: unknown): RecordStatus =>
  STATUSES.includes(value as RecordStatus) ? (value as RecordStatus) : 'learning';

/** 归一化复习历史；非法条目直接丢弃。 */
const asReviewHistory = (value: unknown): ReviewEvent[] => {
  if (!Array.isArray(value)) {return [];}

  return value.flatMap((item) => {
    if (!isObject(item)) {return [];}

    const score = asNumber(item.score);
    const reviewedAt = asString(item.reviewed_at);

    if (score === null || !reviewedAt) {return [];}

    return [
      {
        score,
        reviewedAt,
        previousStatus: asStatus(item.previous_status),
        newStatus: asStatus(item.new_status),
      },
    ];
  });
};

/** 归一化 learning-records 里的一条完整记录。 */
const normalizeLearningRecord = (
  category: string,
  raw: unknown,
): EnglishRecord | null => {
  if (!isObject(raw)) {return null;}

  const id = asString(raw.id);
  const title = asString(raw.title);

  if (!id || !title) {return null;}

  return {
    id,
    category,
    status: asStatus(raw.status),
    title,
    explanation: asString(raw.explanation),
    source: asString(raw.source),
    example: asString(raw.example),
    tags: asStringArray(raw.tags),
    firstLearnedAt: asString(raw.first_learned_at) || null,
    lastLearnedAt: asString(raw.last_learned_at) || null,
    learnedCount: asPositiveInt(raw.learned_count),
    masteryScore: asNumber(raw.mastery_score),
    reviewCount: asPositiveInt(raw.review_count),
    highScoreStreak: asPositiveInt(raw.high_score_streak),
    lastReviewedAt: asString(raw.last_reviewed_at) || null,
    nextReviewAt: asString(raw.next_review_at) || null,
    lapseCount: asPositiveInt(raw.lapse_count),
    masteredAt: asString(raw.mastered_at) || null,
    reviewHistory: asReviewHistory(raw.review_history),
  };
};

/** 归一化 mastered-learning-records 里只保留 id / title / explanation / mastered_at 的精简记录。 */
const normalizeMasteredRecord = (
  category: string,
  raw: unknown,
): EnglishRecord | null => {
  if (!isObject(raw)) {return null;}

  const id = asString(raw.id);
  const title = asString(raw.title);

  if (!id || !title) {return null;}

  const masteredAt = asString(raw.mastered_at) || null;

  return {
    id,
    category,
    status: 'mastered',
    title,
    explanation: asString(raw.explanation),
    source: '',
    example: '',
    tags: [],
    firstLearnedAt: null,
    lastLearnedAt: masteredAt,
    learnedCount: 1,
    masteryScore: null,
    reviewCount: 0,
    highScoreStreak: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    lapseCount: 0,
    masteredAt,
    reviewHistory: [],
  };
};

/** 把原始 payload 归一化为页面直接消费的记录集合。 */
const normalize = (payload: RawPayload): EnglishRecordsSnapshot => {
  const categories = Array.isArray(payload.categories)
    ? payload.categories.filter(isObject)
    : [];

  const records = categories.flatMap((entry) => {
    const category = asString((entry as RawCategory).category);

    if (!category) {
      return [];
    }

    const { learning, mastered } = entry as RawCategory;
    const learningRecords =
      isObject(learning) && isObject(learning.records)
        ? Object.values(learning.records).flatMap((raw) => {
            const record = normalizeLearningRecord(category, raw);

            return record ? [record] : [];
          })
        : [];
    const masteredRecords = Array.isArray(mastered)
      ? mastered.flatMap((raw) => {
          const record = normalizeMasteredRecord(category, raw);

          return record ? [record] : [];
        })
      : [];

    return [...learningRecords, ...masteredRecords];
  });

  return {
    generatedAt: asString(payload.generatedAt),
    repoPath: asString(payload.repoPath),
    records,
  };
};

/**
 * 读取全部英语学习记录。
 * 每次调用都会重新取数，仓库更新后刷新即可看到最新内容。
 */
export const fetchEnglishRecords = async (
  signal?: AbortSignal,
): Promise<EnglishRecordsSnapshot> => {
  const response = await fetch(ENDPOINT, { cache: 'no-store', signal });

  if (!response.ok) {
    throw new Error(
      import.meta.env.DEV
        ? `读取学习记录失败（HTTP ${response.status}）`
        : '没有找到构建时生成的记录快照，请重新执行构建',
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error('学习记录不是有效的 JSON');
  }

  if (!isObject(payload)) {
    throw new Error('学习记录格式不符合预期');
  }

  return normalize(payload as RawPayload);
};
