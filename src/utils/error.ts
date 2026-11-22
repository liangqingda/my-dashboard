/**
 * 错误文案：所有 catch 里的「取可展示原因」都走这里，避免各处重复写 instanceof。
 */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 取错误对象上可以展示给用户的原因。
 * 值不是 Error、或 message 为空时回退到调用方给的默认文案。
 */
export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * 读失败响应体里的 `message` 字段；响应不是 JSON、或没有可读 message 时回退默认文案。
 * 中间件 / 接口的错误口径统一回 `{ message }`，页面不要再各自解析一遍 body。
 */
export const readHttpErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const payload: unknown = await response.json();

    if (isObject(payload) && typeof payload.message === 'string' && payload.message) {
      return payload.message;
    }
  } catch {
    // 响应不是 JSON 时保留默认文案。
  }

  return fallback;
};
