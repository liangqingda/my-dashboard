/**
 * 错误文案：所有 catch 里的「取可展示原因」都走这里，避免各处重复写 instanceof。
 */

/**
 * 取错误对象上可以展示给用户的原因。
 * 值不是 Error、或 message 为空时回退到调用方给的默认文案。
 */
export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;
