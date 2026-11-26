/**
 * 组件是否仍挂载：供异步回调在写状态前挡掉卸载后的迟到响应。
 *
 * 竞态收口的两条路子按场景选：
 * - 同一来源会被新请求顶替（切目录、换目标）→ 用 `requestId` / `AbortController` 让旧请求作废；
 * - 一次性写操作（确认删除 / 卸载 / 设墙纸 / 推出盘）→ 没有下一次请求顶替，用 mounted 标记挡卸载后的 setState。
 *
 * 用法：`const mounted = useMounted();` 异步回调里 `if (!mounted.current) return;` 再写状态。
 * 不要拿它替代请求取消：被卸载只是不该再写状态，请求本身仍会跑完。
 */

import { useEffect, useRef } from 'react';

export const useMounted = () => {
  const mountedRef = useRef(true);

  useEffect(
    () => {
      mountedRef.current = true;

      return () => {
        mountedRef.current = false;
      };
    },
    [],
  );

  return mountedRef;
};
