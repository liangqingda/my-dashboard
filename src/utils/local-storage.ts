/**
 * 界面状态的本地持久化：把「存储不可用」的失败收在这一层。
 *
 * 只服务于「刷新页面后保持上次界面状态」这类偏好（展开 / 收起、全屏、视图形态），
 * 所以读失败一律回落默认值、写失败静默放弃——隐私模式、禁用存储、配额写满
 * 都不该把页面打断，最坏结果只是刷新后回到默认状态。
 *
 * 两种存法并存：单值键存裸字符串（`useStoredState` + `FLAG_CODEC` / `createChoiceCodec`），
 * 一个弹窗的整组偏好存成一个 JSON 对象（`useStoredField` + `FLAG_FIELD_CODEC` /
 * `createChoiceFieldCodec`）。后者同一命名空间会被几个字段 hook 各读一次，但都只在挂载时读；
 * 这里不做读缓存，缓存反而会引入跨标签页的旧值。
 */

/** 状态值与存储原文的编解码 */
export type StoredCodec<T> = {
  /** 从存储原文还原状态；原文为 null（没写过 / 存储不可用）时走默认值 */
  decode: (raw: string | null) => T;
  /** 把状态写成存储原文 */
  encode: (value: T) => string;
};

/** 开关状态的编解码：存 '1' / '0'，缺失即关 */
export const FLAG_CODEC: StoredCodec<boolean> = {
  decode: (raw) => raw === '1',
  encode: (value) => (value ? '1' : '0'),
};

/** 纯字符串编解码：存原文，没写过回落空串（如记住上次打开的目录路径） */
export const STRING_CODEC: StoredCodec<string> = {
  decode: (raw) => raw ?? '',
  encode: (value) => value,
};

/**
 * 区间数字编解码（滑块这类固定档位，如 0–100 的透明度）：存整数原文。
 * 没写过、不是数字、越界都回落 fallback——被手改坏的档位回到安全值，而不是夹到边界。
 */
export const createRangedNumberCodec = (
  min: number,
  max: number,
  fallback: number,
): StoredCodec<number> => ({
  decode: (raw) => {
    if (raw === null || raw.trim() === '') {
      return fallback;
    }

    const value = Number(raw);

    return Number.isFinite(value) && value >= min && value <= max
      ? Math.round(value)
      : fallback;
  },
  encode: (value) => String(Math.round(value)),
});

/**
 * 枚举取值的统一校验：不是字符串、不在 choices 里（枚举改版、被手工改坏）
 * 一律回落 fallback，单值键与对象字段两条编解码都靠这一步，别各写一遍。
 */
const matchChoice = <T extends string>(
  choices: readonly T[],
  fallback: T,
  value: unknown,
): T =>
  typeof value === 'string'
    ? (choices.find((choice) => choice === value) ?? fallback)
    : fallback;

/**
 * 受枚举约束的状态编解码（如「分列看板 / 表格」这类形态）：
 * 存储值不在 choices 里（枚举改版、被手工改坏）时回落 fallback，避免把脏值渲染出来。
 */
export const createChoiceCodec = <T extends string>(
  choices: readonly T[],
  fallback: T,
): StoredCodec<T> => ({
  decode: (raw) => matchChoice(choices, fallback, raw),
  encode: (value) => value,
});

/** 一个弹窗的整组偏好：localStorage 里存成一个 JSON 对象，字段名见各模块的 `constants.ts` */
export type StoredRecord = Record<string, unknown>;

/**
 * 对象里某个字段的编解码：值就是 JSON 里的那一项（布尔存布尔、数字存数字），
 * 不再套一层字符串，读出来的对象人眼也能直接看明白。
 *
 * 与 `StoredCodec` 并存而不是替换：单值键（英语页视图形态等）沿用原来的裸字符串格式，
 * 换格式会让已存的值一次性失效；这里只服务「一个命名空间一个对象」的那类偏好。
 */
export type StoredFieldCodec<T> = {
  /** 从对象里那一项还原状态；缺失或类型不对时走默认值 */
  decode: (value: unknown) => T;
  /** 把状态写成对象里那一项 */
  encode: (value: T) => unknown;
};

/** 对象字段的开关编解码：只有 true 算开，缺失 / 脏值都算关 */
export const FLAG_FIELD_CODEC: StoredFieldCodec<boolean> = {
  decode: (value) => value === true,
  encode: (value) => value,
};

/**
 * 对象字段的枚举编解码（字段版的 `createChoiceCodec`）：缺失、不是字符串、不在 choices 里
 * 都回落 fallback，枚举改版或存储被手工改坏时不会渲染出一个不认识的状态。
 */
export const createChoiceFieldCodec = <T extends string>(
  choices: readonly T[],
  fallback: T,
): StoredFieldCodec<T> => ({
  decode: (value) => matchChoice(choices, fallback, value),
  encode: (value) => value,
});

/** 读取原始字符串；没写过、已被清掉或存储不可用时返回 null */
export const readStoredString = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * 写入原始字符串；写不进去（隐私模式 / 配额写满）时静默放弃，状态只在本轮有效。
 * 返回是否真的写进去了：默认偏好不需要这个结果，程序坞这类「写失败要告诉用户」的调用方用它区分。
 */
export const writeStoredString = (key: string, value: string): boolean => {
  try {
    window.localStorage.setItem(key, value);

    return true;
  } catch {
    // 存不进去不影响当前界面，刷新后只是回到默认状态
    return false;
  }
};

/**
 * 读取整组偏好：没写过、被清掉、不是合法 JSON 对象（被手工改坏）时返回空对象，
 * 各字段按自己的默认值走；不缓存，同一命名空间的每次读写都以存储里的最新值为准。
 */
export const readStoredRecord = (key: string): StoredRecord => {
  const raw = readStoredString(key);

  if (raw === null) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as StoredRecord)
      : {};
  } catch {
    return {};
  }
};

/** 读对象里的一个字段；缺失 / 类型不对时由 codec 回落默认 */
export const readStoredField = <T>(
  key: string,
  field: string,
  codec: StoredFieldCodec<T>,
): T => codec.decode(readStoredRecord(key)[field]);

/**
 * 写对象里的一个字段：先读回整组再合并，同一命名空间里的其它偏好不会被这次写入冲掉
 * （一组偏好合到一个对象后，各 hook 各写各的字段，靠这一步保住邻居）。
 */
export const writeStoredField = <T>(
  key: string,
  field: string,
  codec: StoredFieldCodec<T>,
  value: T,
): void => {
  const record = readStoredRecord(key);

  writeStoredString(
    key,
    JSON.stringify({ ...record, [field]: codec.encode(value) }),
  );
};
