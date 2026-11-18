/**
 * class 拼接：条件类名统一走这里，不再手写模板字符串（也不会留下多余空格）。
 *
 * 不用 `clsx`：调用方只有「若干静态类名 + 条件为假时传 `false`」这一种形态，它的对象 / 数组
 * 语法一处都没用到；换成它只会把 `string | false | null | undefined` 放宽成它的 `ClassValue`，
 * 少了编译期约束、换不来任何能力。真需要它的实现时按 `docs/dependencies.md` 的
 * 「收窄类型再导出」形态接，不要把宽接口铺到调用方。
 */

type ClassValue = string | false | null | undefined;

/**
 * 按顺序拼接多个类名，自动跳过 falsy 值。
 *
 * @example cx(styles.row, expanded && styles.expanded)
 */
export const cx = (...values: ClassValue[]): string =>
  values.filter(Boolean).join(' ');
