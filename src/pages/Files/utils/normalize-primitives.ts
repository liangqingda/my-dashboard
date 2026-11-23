/**
 * 中间件回执归一化用的取值小件：类型守卫与「不是期望类型就给兜底值」。
 * 只服务同目录的 `normalize*.ts`，业务判断留在各自文件里。
 */

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

export const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
