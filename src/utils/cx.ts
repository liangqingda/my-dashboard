/**
 * class 拼接：条件类名统一走这里，不再手写模板字符串（也不会留下多余空格）。
 */

type ClassValue = string | false | null | undefined;

/**
 * 按顺序拼接多个类名，自动跳过 falsy 值。
 *
 * @example cx(styles.row, expanded && styles.expanded)
 */
export const cx = (...values: ClassValue[]): string =>
  values.filter(Boolean).join(' ');
