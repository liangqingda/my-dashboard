/**
 * 页面级刷新事件：侧边栏「刷新」按钮通知当前页面重新取数。
 * 页面用 onPageRefresh 订阅，返回函数可直接作为 useEffect 的清理函数。
 */

/** 事件名，页面与侧边栏共用 */
const PAGE_REFRESH_EVENT = 'app:page-refresh';

/** 请求当前页面刷新自己的数据。 */
export const requestPageRefresh = () => {
  window.dispatchEvent(new Event(PAGE_REFRESH_EVENT));
};

/** 订阅页面刷新，返回取消订阅函数。 */
export const onPageRefresh = (handler: () => void): (() => void) => {
  window.addEventListener(PAGE_REFRESH_EVENT, handler);

  return () => window.removeEventListener(PAGE_REFRESH_EVENT, handler);
};
