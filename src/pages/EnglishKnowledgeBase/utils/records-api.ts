/**
 * 知识库模块的数据访问层。
 * 开发时走 Vite 插件的 `/api/english/records`（实时读取 learn-english 仓库），
 * 构建产物走 `english-records.index.json`（列表索引）+ `english-records/<category>/<key>.json`（按条详情）。
 *
 * 列表只取摘要：详情按 ID 按需取，不在首屏陪跑一堆讲解正文（见 `docs/local-repo-data.md`）。
 */

import type {
  DeleteRecordResult,
  RecordCategory,
  RecordCommit,
  RecordDetail,
  RecordStatus,
  RecordSummary,
  ReviewHistoryEntry,
  ReviewSnapshot,
} from '../types';

/** 列表索引：开发态走中间件接口，构建产物里是插件输出的索引文件 */
const LIST_ENDPOINT = import.meta.env.DEV
  ? '/api/english/records'
  : '/english-records.index.json';

/**
 * 构建产物里每条详情所在的目录，与 `scripts/vite/english-records.ts` 的
 * `RECORDS_DETAIL_DIR`、存档模块的 `recordDetailPath` 是同一个口径；改目录时三处一起改。
 */
const DETAIL_DIR = 'english-records';

/** 取数请求的缓存策略：开发态必须实时，构建产物交给浏览器正常缓存 */
const REQUEST_INIT: RequestInit = import.meta.env.DEV
  ? { cache: 'no-store' }
  : {};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const asNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** 状态只认三档；认不出就丢掉这条，不猜一个状态出来 */
const asStatus = (value: unknown): RecordStatus | null =>
  value === 'learning' || value === 'familiar' || value === 'mastered'
    ? value
    : null;

/** 归一化一个分类：键或标题缺失、键重复时丢弃 */
const normalizeCategories = (raw: unknown): RecordCategory[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();

  return raw.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const key = asString(item.key).trim();
    const label = asString(item.label).trim();

    if (!key || !label || seen.has(key)) {
      return [];
    }

    seen.add(key);

    return [item.hidden === true ? { hidden: true, key, label } : { key, label }];
  });
};

/** 归一化一条摘要；ID 或状态缺失时丢弃 */
const normalizeSummary = (raw: unknown): RecordSummary | null => {
  if (!isObject(raw)) {
    return null;
  }

  const id = asString(raw.id);
  const status = asStatus(raw.status);

  if (!id || status === null) {
    return null;
  }

  return {
    categoryKey: asString(raw.categoryKey),
    id,
    masteredTenStreak: asNumberOrNull(raw.masteredTenStreak),
    masteryScore: asNumberOrNull(raw.masteryScore),
    nextReviewAt: asStringOrNull(raw.nextReviewAt),
    status,
    title: asString(raw.title) || id,
    updatedAt: asString(raw.updatedAt),
  };
};

/** 归一化逐次复习记录：时间缺失的条目丢弃，新的在前 */
const normalizeHistory = (raw: unknown): ReviewHistoryEntry[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .flatMap((item) => {
      if (!isObject(item)) {
        return [];
      }

      const reviewedAt = asStringOrNull(item.reviewedAt);

      if (reviewedAt === null) {
        return [];
      }

      return [
        {
          newStatus: asString(item.newStatus),
          previousStatus: asString(item.previousStatus),
          reviewedAt,
          score: asNumber(item.score),
        },
      ];
    })
    .toSorted((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt));
};

/** 归一化一条详情：核心字段不合格返回 null */
const normalizeDetail = (raw: unknown): RecordDetail | null => {
  const summary = normalizeSummary(raw);

  if (!isObject(raw) || summary === null) {
    return null;
  }

  return {
    ...summary,
    example: asString(raw.example),
    explanation: asString(raw.explanation),
    firstLearnedAt: asStringOrNull(raw.firstLearnedAt),
    lapseCount: asNumber(raw.lapseCount),
    lastLearnedAt: asStringOrNull(raw.lastLearnedAt),
    learnedCount: asNumber(raw.learnedCount),
    masteredAt: asStringOrNull(raw.masteredAt),
    masteredTenStreak: asNumberOrNull(raw.masteredTenStreak),
    reviewCount: asNumber(raw.reviewCount),
    reviewHistory: normalizeHistory(raw.reviewHistory),
    source: asString(raw.source),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter(
          (tag): tag is string => typeof tag === 'string' && tag.length > 0,
        )
      : [],
  };
};

/** 解析响应里的 JSON；格式不对时抛错，调用方给统一文案 */
const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new Error('记录数据不是有效的 JSON');
  }
};

/**
 * 读取两个记录目录的全部摘要（插件已按更新时间倒序排好）。
 * 每次调用都会重新取数，仓库更新后刷新即可看到最新内容。
 */
export const fetchReviewRecords = async (
  signal?: AbortSignal,
): Promise<ReviewSnapshot> => {
  const response = await fetch(LIST_ENDPOINT, { ...REQUEST_INIT, signal });

  if (!response.ok) {
    throw new Error(
      import.meta.env.DEV
        ? `读取记录失败（HTTP ${response.status}）`
        : '没有找到构建时生成的记录索引，请重新执行构建',
    );
  }

  const payload = await readJson(response);

  if (!isObject(payload)) {
    throw new Error('记录数据格式不符合预期');
  }

  return {
    categories: normalizeCategories(payload.categories),
    records: Array.isArray(payload.records)
      ? payload.records.flatMap((raw) => {
          const record = normalizeSummary(raw);

          return record ? [record] : [];
        })
      : [],
  };
};

/**
 * 构建产物里一条详情文件的相对路径：`<category>/<key>.json`。
 * ID 形如 `grammar:present-perfect`，拆开后逐段编码（不能整串 encode，否则 `:` 变 `%3A`）。
 */
const detailPath = (id: string): string => {
  const separator = id.indexOf(':');
  const category = id.slice(0, separator);
  const key = id.slice(separator + 1);

  return `${DETAIL_DIR}/${encodeURIComponent(category)}/${encodeURIComponent(key)}.json`;
};

/**
 * 按 ID 读取一条详情；记录已不在库中时返回 null（例如刚被删掉）。
 *
 * - 开发态：`GET /api/english/records?id=…`；
 * - 构建产物：直接取 `english-records/<category>/<key>.json`。
 */
export const fetchRecordDetail = async (
  id: string,
  signal?: AbortSignal,
): Promise<RecordDetail | null> => {
  const url = import.meta.env.DEV
    ? `${LIST_ENDPOINT}?id=${encodeURIComponent(id)}`
    : `/${detailPath(id)}`;
  const response = await fetch(url, { ...REQUEST_INIT, signal });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`读取记录详情失败（HTTP ${response.status}）`);
  }

  const payload = await readJson(response);

  if (!isObject(payload)) {
    throw new Error('记录详情格式不符合预期');
  }

  // 开发态返回 `{ record }`；静态产物本身就是详情对象
  return normalizeDetail(import.meta.env.DEV ? payload.record : payload);
};

/** 读失败响应里的 `message`；响应不是 JSON 时保留默认文案 */
const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const payload: unknown = await response.json();

    if (
      isObject(payload) &&
      typeof payload.message === 'string' &&
      payload.message
    ) {
      return payload.message;
    }
  } catch {
    // 响应不是 JSON 时保留默认文案。
  }

  return fallback;
};

/** 归一化提交结果：只收字符串与布尔，认不出的字段不下发 */
const normalizeCommit = (raw: unknown): RecordCommit => {
  if (!isObject(raw)) {
    return {};
  }

  return {
    error: asStringOrNull(raw.error) ?? undefined,
    hash: asStringOrNull(raw.hash) ?? undefined,
    pushError: asStringOrNull(raw.pushError) ?? undefined,
    pushed: typeof raw.pushed === 'boolean' ? raw.pushed : undefined,
    subject: asStringOrNull(raw.subject) ?? undefined,
  };
};

/**
 * 删除一条记录：中间件交记录仓库的 `delete-record` 删记录（笔记文件不动），
 * 再自动提交并推送（仅开发模式可用）。
 * 页面靠返回值说明提交 / 推送成没成，不把中间状态藏起来。
 */
export const deleteReviewRecord = async (
  id: string,
): Promise<DeleteRecordResult> => {
  if (!import.meta.env.DEV) {
    throw new Error('静态预览不支持删除，请在开发模式下操作');
  }

  const response = await fetch(
    `${LIST_ENDPOINT}?${new URLSearchParams({ id }).toString()}`,
    { ...REQUEST_INIT, method: 'DELETE' },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, `删除失败（HTTP ${response.status}）`),
    );
  }

  const payload = await readJson(response);

  if (!isObject(payload) || !isObject(payload.record)) {
    throw new Error('删除接口没有返回记录信息');
  }

  const { record } = payload;
  const status = asStatus(record.status);

  if (status === null) {
    throw new Error('删除接口返回的状态不合法');
  }

  return {
    commit: normalizeCommit(payload.commit),
    record: {
      category: asString(record.category),
      file: asString(record.file),
      id: asString(record.id) || id,
      noteFile: asStringOrNull(record.noteFile),
      status,
      title: asString(record.title),
    },
  };
};
