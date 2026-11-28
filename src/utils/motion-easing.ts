/**
 * 缓动曲线的 JS 侧常量：与 `src/styles/global.scss` 的 `--app-ease-*` 一一对应、同值。
 *
 * Web Animations 的 `easing` 不认 CSS 变量（传 `var(...)` 会按无效关键字处理），
 * 所以两处各存一份字面值，改曲线必须两边一起改。语义分档见 `docs/motion.md`：
 * standard 常规状态 / 淡入淡出 / 小位移，emphasized 大位移 / 飞入 / 展开，
 * layout 布局尺寸，exit 退场 / 收起 / 滑出，spring 落点回弹（只给程序坞图标）。
 * 持续旋转用 `'linear'`，它不在这套语义里。
 */
export const MOTION_EASING = {
  standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  emphasized: 'cubic-bezier(0.22, 1, 0.36, 1)',
  layout: 'cubic-bezier(0.33, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.55, 0.02, 0.72, 0.36)',
  spring: 'cubic-bezier(0.2, 0.9, 0.25, 1.16)',
} as const;
