/**
 * learn-english 记录库的只读侧：把 `learning-records/` 与 `mastered-learning-records/`
 * 两个目录合并成知识库页面要的一份数据。
 *
 * 两个目录的格式不一样（学习中每类是一个带 `records` 的对象，已掌握每类是一个数组），
 * 字段也有精简差异，所以由这里统一摊平成同一种形状；页面不再自己判目录、补字段。
 * 这里只读，绝不自己写 JSON：删除交给记录仓库的 `delete-record`（见 `english-records-delete.ts`）。
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/** 学习中记录目录（相对记录仓库根目录，与契约 `recordsDir` 同一来源） */
export const RECORDS_DIR = 'learning-records';

/** 已掌握记录目录（相对记录仓库根目录，与契约 `masteredRecordsDir` 同一来源） */
export const MASTERED_RECORDS_DIR = 'mastered-learning-records';

/** 记录文件扩展名：一个分类一个 JSON */
const RECORD_EXTENSION = '.json';

/** 分类文件名：`<category>.json`，分类键只用小写 ASCII 字母 */
const CATEGORY_FILE_PATTERN = /^([a-z]+)\.json$/u;

/** 记录 ID 的两段：分类键与知识点 key，key 只用小写字母、数字与连字符 */
const CATEGORY_PATTERN = /^[a-z]+$/u;
const KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

/** 记录状态：学习中的两级 + 已掌握 */
export type RecordStatus = 'familiar' | 'learning' | 'mastered';

/** 一条复习历史（已掌握记录没有历史，返回空数组） */
export type ReviewHistoryEntry = {
  /** 得分 0–10 */
  score: number;
  /** 复习时间（ISO 8601） */
  reviewedAt: string;
  /** 复习前状态 */
  previousStatus: string;
  /** 复习后状态 */
  newStatus: string;
};

/** 列表用的记录摘要 */
export type RecordSummary = {
  /** 记录 ID，如 `grammar:present-perfect` */
  id: string;
  /** 分类键，如 `grammar` */
  categoryKey: string;
  /** 知识点标题 */
  title: string;
  /** 当前状态 */
  status: RecordStatus;
  /** 最近更新时间（ISO 8601）：最近复习 / 学习 / 掌握时间里最新的一个；缺失为空串 */
  updatedAt: string;
  /** 掌握分 0–10；没有评过分为 null */
  masteryScore: number | null;
  /** 下次复习时间（ISO 8601）；已掌握或还没排期时为 null */
  nextReviewAt: string | null;
};

/** 摘要 + 详情：详情只在打开某一条时取 */
export type RecordDetail = RecordSummary & {
  /** 讲解 */
  explanation: string;
  /** 代表例句（当时学到的原句 / 错句） */
  source: string;
  /** 纠正 / 示例句 */
  example: string;
  /** 标签 */
  tags: string[];
  /** 首次学习时间 */
  firstLearnedAt: string | null;
  /** 最近学习时间 */
  lastLearnedAt: string | null;
  /** 累计学习次数 */
  learnedCount: number;
  /** 累计复习次数 */
  reviewCount: number;
  /** 掌握时间；学习中为 null */
  masteredAt: string | null;
  /** 遗忘次数 */
  lapseCount: number;
  /** 已掌握记录的连续满分抽查计数；学习中为 null */
  masteredTenStreak: number | null;
  /** 逐次复习记录，新的在前 */
  reviewHistory: ReviewHistoryEntry[];
};

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 取非空字符串；其它一律当空串 */
const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** 取 ISO 时间串；空值与非字符串返回 null */
const asIso = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** 取数字；不是有限数字时用 0 */
const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** 取数字或 null（掌握分这类「没评过就是没有」的字段） */
const asNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** 状态只认三档；认不出返回 null，让这条记录被丢弃而不是猜一个状态 */
const asStatus = (value: unknown): RecordStatus | null =>
  value === 'learning' || value === 'familiar' || value === 'mastered'
    ? value
    : null;

/** 标签只收非空字符串 */
const asTags = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
    : [];

/** 记录 ID 是否合法：`<category>:<key>`，两段都只用小写 ASCII */
export const isRecordId = (id: string): boolean => {
  const separator = id.indexOf(':');

  if (separator <= 0) {
    return false;
  }

  return (
    CATEGORY_PATTERN.test(id.slice(0, separator)) &&
    KEY_PATTERN.test(id.slice(separator + 1))
  );
};

/** 记录 ID 的分类键；不合法时返回空串 */
export const recordCategory = (id: string): string => {
  if (!isRecordId(id)) {
    return '';
  }

  return id.slice(0, id.indexOf(':'));
};

/**
 * 详情静态文件名（构建期一篇一个）：`<category>/<key>.json`。
 * 前端按同一规则拼 URL，改这里要同步 `src/pages/EnglishKnowledgeBase/utils/records-api.ts`。
 */
export const recordDetailPath = (id: string): string => {
  const separator = id.indexOf(':');

  return `${id.slice(0, separator)}/${id.slice(separator + 1)}${RECORD_EXTENSION}`;
};

/** 取四个候选时间里最新的一个；都缺失时返回空串（排序时排到最后） */
const latestTime = (values: Array<string | null>): string => {
  let latest = '';
  let latestMs = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    if (value === null) {
      continue;
    }

    const ms = Date.parse(value);

    if (!Number.isNaN(ms) && ms > latestMs) {
      latest = value;
      latestMs = ms;
    }
  }

  return latest;
};

/** 逐次复习记录：新的在前，认不出时间的条目丢弃 */
const asReviewHistory = (value: unknown): ReviewHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((raw) => {
      if (!isObject(raw)) {
        return [];
      }

      const reviewedAt = asIso(raw.reviewed_at);

      if (reviewedAt === null) {
        return [];
      }

      return [
        {
          newStatus: asText(raw.new_status),
          previousStatus: asText(raw.previous_status),
          reviewedAt,
          score: asNumber(raw.score),
        },
      ];
    })
    .toSorted((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt));
};

/** 把一条原始记录摊平成详情；ID / 分类 / 标题这些关键字段缺失时返回 null */
const toRecordDetail = (
  raw: Record<string, unknown>,
  category: string,
  mastered: boolean,
): RecordDetail | null => {
  const id = asText(raw.id);

  if (!isRecordId(id) || recordCategory(id) !== category) {
    return null;
  }

  const status = mastered ? 'mastered' : asStatus(raw.status);

  if (status === null) {
    return null;
  }

  const masteredAt = asIso(raw.mastered_at);
  const lastLearnedAt = mastered ? masteredAt : asIso(raw.last_learned_at);
  const lastReviewedAt = mastered ? null : asIso(raw.last_reviewed_at);
  const firstLearnedAt = mastered ? masteredAt : asIso(raw.first_learned_at);
  const nextReviewAt = mastered ? null : asIso(raw.next_review_at);

  return {
    categoryKey: category,
    example: asText(raw.example),
    explanation: asText(raw.explanation),
    firstLearnedAt,
    id,
    lastLearnedAt,
    lapseCount: mastered ? 0 : asNumber(raw.lapse_count),
    learnedCount: mastered ? 1 : asNumber(raw.learned_count),
    masteredAt,
    masteredTenStreak: mastered ? asNumber(raw.mastered_ten_streak) : null,
    masteryScore: mastered ? 10 : asNumberOrNull(raw.mastery_score),
    nextReviewAt,
    reviewCount: mastered ? 0 : asNumber(raw.review_count),
    reviewHistory: mastered ? [] : asReviewHistory(raw.review_history),
    source: asText(raw.source),
    status,
    tags: asTags(raw.tags),
    title: asText(raw.title) || id,
    updatedAt: latestTime([
      lastReviewedAt,
      lastLearnedAt,
      masteredAt,
      firstLearnedAt,
    ]),
  };
};

/** 把详情收成列表摘要：正文类字段不下发，省一次请求的体积 */
export const toRecordSummary = (detail: RecordDetail): RecordSummary => ({
  categoryKey: detail.categoryKey,
  id: detail.id,
  masteryScore: detail.masteryScore,
  nextReviewAt: detail.nextReviewAt,
  status: detail.status,
  title: detail.title,
  updatedAt: detail.updatedAt,
});

/** 读一个 JSON 文件并解析；不存在或不是合法 JSON 都返回 null */
const readJson = async (file: string): Promise<unknown> => {
  let text: string;

  try {
    text = await readFile(file, 'utf8');
  } catch {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

/** 目录下全部分类文件名里的分类键；目录不存在时返回空数组 */
const listCategories = async (dir: string): Promise<string[]> => {
  let entries: string[] = [];

  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  return entries
    .flatMap((name) => {
      const match = CATEGORY_FILE_PATTERN.exec(name);

      return match === null ? [] : [match[1]];
    })
    .toSorted();
};

/** 从一个分类文件里取出记录数组：学习中在 `records` 下，已掌握根节点就是数组 */
const recordsOf = (raw: unknown, mastered: boolean): unknown[] => {
  if (mastered) {
    return Array.isArray(raw) ? raw : [];
  }

  return isObject(raw) && isObject(raw.records) ? Object.values(raw.records) : [];
};

/** 一个目录下的全部记录详情；单文件坏掉只丢那一类，不影响整页 */
const readDirRecords = async (
  repoDir: string,
  directory: string,
  mastered: boolean,
): Promise<RecordDetail[]> => {
  const dir = path.resolve(repoDir, directory);
  const categories = await listCategories(dir);
  const files = await Promise.all(
    categories.map((category) =>
      readJson(path.join(dir, `${category}${RECORD_EXTENSION}`)),
    ),
  );

  return files.flatMap((raw, index) => {
    const category = categories[index];

    return recordsOf(raw, mastered).flatMap((item) => {
      if (!isObject(item)) {
        return [];
      }

      const detail = toRecordDetail(item, category, mastered);

      return detail === null ? [] : [detail];
    });
  });
};

/** 已掌握记录目录里的一条：字段更精简，`mastered_ten_streak` 是连击计数 */
export const collectRecordDetails = async (
  repoDir: string,
): Promise<RecordDetail[]> => {
  const [learning, mastered] = await Promise.all([
    readDirRecords(repoDir, RECORDS_DIR, false),
    readDirRecords(repoDir, MASTERED_RECORDS_DIR, true),
  ]);

  return [...learning, ...mastered].toSorted((a, b) => {
    const timeA = Date.parse(a.updatedAt);
    const timeB = Date.parse(b.updatedAt);

    // 没有时间的记录排在最后：列表上是「新 → 旧」，未知时间不该插在中间
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
        return a.id.localeCompare(b.id);
      }

      return Number.isNaN(timeA) ? 1 : -1;
    }

    return timeB - timeA || a.id.localeCompare(b.id);
  });
};

/** 列表摘要：进页面只取这一份，详情按 ID 再取 */
export const collectRecordSummaries = async (
  repoDir: string,
): Promise<RecordSummary[]> =>
  (await collectRecordDetails(repoDir)).map(toRecordSummary);

/**
 * 按 ID 取一条详情；记录已经从任一边库里删掉时返回 null。
 * 先按分类只读那一个文件，不必为打开一条记录扫全库。
 */
export const readRecordDetail = async (
  repoDir: string,
  id: string,
): Promise<RecordDetail | null> => {
  const category = recordCategory(id);

  if (category === '') {
    return null;
  }

  const [learning, mastered] = await Promise.all([
    readJson(path.resolve(repoDir, RECORDS_DIR, `${category}${RECORD_EXTENSION}`)),
    readJson(
      path.resolve(repoDir, MASTERED_RECORDS_DIR, `${category}${RECORD_EXTENSION}`),
    ),
  ]);

  const learningRecord =
    isObject(learning) && isObject(learning.records)
      ? learning.records[id]
      : undefined;

  if (isObject(learningRecord)) {
    const detail = toRecordDetail(learningRecord, category, false);

    if (detail !== null) {
      return detail;
    }
  }

  const masteredRecord = Array.isArray(mastered)
    ? mastered.find((item) => isObject(item) && item.id === id)
    : undefined;

  return isObject(masteredRecord)
    ? toRecordDetail(masteredRecord, category, true)
    : null;
};
