/**
 * 页面级刷新：标题栏「刷新当前页面」按钮通知当前页面重新取数。
 *
 * 订阅者集中登记而不是广播 window 事件，是为了让发起刷新的按钮能等到页面真正取完数：
 * 点一下就先弹「已刷新」而数据其实还在路上，等于给了个假反馈。
 * 页面用 `onPageRefresh` 订阅（返回取消订阅函数，可直接作为 useEffect 的清理函数）。
 */

/** 页面订阅的重新取数回调；返回 Promise 时会被等到结束 */
type PageRefreshHandler = () => Promise<void> | void;

/**
 * 请求结果：`done` 是页面取数完成；`empty` 是当前页面没有订阅刷新，
 * 也就是这个页面没有可重新读取的数据，不算失败。
 */
export type PageRefreshResult = 'done' | 'empty';

/** 当前订阅者：同一时刻只有正在显示的页面在订阅 */
const handlers = new Set<PageRefreshHandler>();

/**
 * 请求当前页面刷新自己的数据，等页面取完数才返回。
 *
 * @returns 页面取数完成返回 `done`；没有页面订阅时返回 `empty`
 * @throws 页面取数失败时抛出该失败原因，供调用方提示错误
 */
export const requestPageRefresh = async (): Promise<PageRefreshResult> => {
  const current = Array.from(handlers);

  if (current.length === 0) {
    return 'empty';
  }

  const results = await Promise.allSettled(
    current.map((handler) => Promise.resolve().then(handler)),
  );
  const failed = results.find((result) => result.status === 'rejected');

  if (failed?.status === 'rejected') {
    throw failed.reason;
  }

  return 'done';
};

/**
 * 订阅页面刷新。
 *
 * @param handler 页面重新取数的回调
 * @returns 取消订阅函数
 */
export const onPageRefresh = (handler: PageRefreshHandler): (() => void) => {
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
  };
};
