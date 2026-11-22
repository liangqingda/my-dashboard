/**
 * 页面级界面状态的存储键拼法：`<页面标识>:<组件或能力>`。
 *
 * 页面标识就是路由：pathname 去掉前导 `/`、段间用 `-` 连接
 * （`/english/notes` → `english-notes`、`/english/knowledge-base` → `english-knowledge-base`）。
 * 不套全局前缀（`my-dashboard:` 这类）——所有键都属于同一个应用，前缀区分不了任何东西，
 * 真正要区分的是「哪一页、哪个组件」。
 *
 * 同一个公共组件挂在不同页面时必须用各自的标识（页面把标识传给组件），
 * 否则两页会共用同一份全屏 / 字号这类偏好。
 */

/** 路由 → 页面标识：`/english/notes` → `english-notes`；根路径兜底 `root` */
export const pageStorageScope = (pathname: string): string =>
  pathname.split('/').filter(Boolean).join('-') || 'root';

/** 页面标识 + 能力 → 存储键：`scopedStorageKey('english-notes', 'view-mode')` → `english-notes:view-mode` */
export const scopedStorageKey = (scope: string, capability: string): string =>
  `${scope}:${capability}`;

/** 某页里某个能力的存储键：`pageStorageKey('/english/notes', 'view-mode')` → `english-notes:view-mode` */
export const pageStorageKey = (pathname: string, capability: string): string =>
  scopedStorageKey(pageStorageScope(pathname), capability);
