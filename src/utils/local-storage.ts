/**
 * 界面状态的本地持久化：把「存储不可用」的失败收在这一层。
 *
 * 只服务于「刷新页面后保持上次界面状态」这类偏好（展开 / 收起、全屏、视图形态），
 * 所以读失败一律回落默认值、写失败静默放弃——隐私模式、禁用存储、配额写满
 * 都不该把页面打断，最坏结果只是刷新后回到默认状态。
 *
 * 这里不做读缓存：每个状态只在组件挂载时读一次（见 `@/hooks/useStoredState`），
 * 不存在同一 key 的重复读取，缓存反而会引入跨标签页的旧值。
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

/**
 * 受枚举约束的状态编解码（如「分列看板 / 表格」这类形态）：
 * 存储值不在 choices 里（枚举改版、被手工改坏）时回落 fallback，避免把脏值渲染出来。
 */
export const createChoiceCodec = <T extends string>(
  choices: readonly T[],
  fallback: T,
): StoredCodec<T> => ({
  decode: (raw) =>
    raw === null
      ? fallback
      : (choices.find((choice) => choice === raw) ?? fallback),
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

/** 写入原始字符串；写不进去（隐私模式 / 配额写满）时静默放弃，状态只在本轮有效 */
export const writeStoredString = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 存不进去不影响当前界面，刷新后只是回到默认状态
  }
};
