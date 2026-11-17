/**
 * 学习记录库里「一条记录」的删除。
 *
 * 笔记只说明一个知识点，真正的记录在记录仓库的两处 JSON 里：
 * - 未掌握：`learning-records/<category>.json`，形如
 *   `{ schema_version, revision, category, records: { <id>: … } }`；
 * - 已掌握：`mastered-learning-records/<category>.json`，旧文件是记录数组，新文件与上面同形。
 *
 * 删除时**按读到的原形态写回**：数组仍是数组、对象仍是对象，未掌握的库还要把 `revision` 加一
 * （与仓库脚本 `learning_records_tool/store.py` 的写入口径一致）。
 * 只删这一条记录，不碰同库里别的条目，也不替源仓库做任何结构修补。
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** 未掌握记录的目录（相对记录仓库根目录） */
export const LEARNING_RECORDS_DIR = 'learning-records';

/** 已掌握记录的目录（相对记录仓库根目录） */
export const MASTERED_RECORDS_DIR = 'mastered-learning-records';

/** 分类键只放行小写 ASCII 字母：它同时是文件名的一段，不能再宽容 */
const CATEGORY_PATTERN = /^[a-z]+$/;

/** 一条被删掉的记录 */
export type DeletedRecord = {
  /** 记录 ID，如 errors:a-few-kinds-of-food-plural */
  id: string;
  /** 记录所在文件（相对记录仓库根目录），如 learning-records/errors.json */
  file: string;
  /** 这一条来自已掌握库 */
  mastered: boolean;
};

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 读一份 JSON；文件不存在或格式不对都返回 null，不抛错 */
const readJsonFile = async (file: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as unknown;
  } catch {
    return null;
  }
};

/**
 * 写回一份 JSON：缩进两格 + 结尾换行，与仓库脚本写出来的文件同一形态，
 * 免得删一条记录就在 diff 里出现整文件重排。
 */
const writeJsonFile = async (file: string, data: unknown): Promise<void> => {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

/** 记录 ID 的分类前缀：`errors:foo` → `errors`；没有冒号或前缀不合法时返回空串 */
const categoryOfRecord = (recordId: string): string => {
  const separator = recordId.indexOf(':');
  const category = separator > 0 ? recordId.slice(0, separator) : '';

  return CATEGORY_PATTERN.test(category) ? category : '';
};

/** 从对象形态的记录库删掉一条；没命中返回 null */
const withoutRecordFromObject = (
  database: Record<string, unknown>,
  recordId: string,
): Record<string, unknown> | null => {
  const records = database.records;

  if (!isObject(records) || !(recordId in records)) {
    return null;
  }

  const remaining: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(records)) {
    if (key !== recordId) {
      remaining[key] = value;
    }
  }

  const revision =
    typeof database.revision === 'number' ? database.revision + 1 : null;

  return revision === null
    ? { ...database, records: remaining }
    : { ...database, records: remaining, revision };
};

/** 从数组形态的记录库删掉一条；没命中返回 null */
const withoutRecordFromArray = (
  database: unknown[],
  recordId: string,
): unknown[] | null => {
  const remaining = database.filter(
    (record) => !(isObject(record) && record.id === recordId),
  );

  return remaining.length === database.length ? null : remaining;
};

/**
 * 在记录仓库里删掉一条记录：先找未掌握库，再找已掌握库。
 *
 * @param repoDir 记录仓库根目录
 * @param recordId 记录 ID，如 `errors:a-few-kinds-of-food-plural`
 * @returns 删掉的记录（含所在文件）；两处都没有这条记录时返回 null
 */
export const deleteLearningRecord = async (
  repoDir: string,
  recordId: string,
): Promise<DeletedRecord | null> => {
  const category = categoryOfRecord(recordId);

  if (!category) {
    return null;
  }

  const candidates: { dir: string; mastered: boolean }[] = [
    { mastered: false, dir: LEARNING_RECORDS_DIR },
    { mastered: true, dir: MASTERED_RECORDS_DIR },
  ];

  for (const { dir, mastered } of candidates) {
    const relative = `${dir}/${category}.json`;
    const data = await readJsonFile(path.resolve(repoDir, relative));

    if (data === null) {
      continue;
    }

    const result = Array.isArray(data)
      ? withoutRecordFromArray(data, recordId)
      : isObject(data)
        ? withoutRecordFromObject(data, recordId)
        : null;

    if (result === null) {
      continue;
    }

    await writeJsonFile(path.resolve(repoDir, relative), result);

    return { file: relative, id: recordId, mastered };
  }

  return null;
};
