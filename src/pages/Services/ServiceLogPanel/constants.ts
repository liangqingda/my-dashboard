/**
 * 日志面板的常量。
 */

import { scopedStorageKey } from '@/utils/page-storage';

/**
 * 某个服务日志面板展开状态的存储键：页面标识（路由 `/services`）+ 能力 + 服务 id，
 * 各服务各记各的展开状态。
 */
export const logExpandedStorageKey = (serviceId: string): string =>
  scopedStorageKey('services', `service-log-expanded:${serviceId}`);
