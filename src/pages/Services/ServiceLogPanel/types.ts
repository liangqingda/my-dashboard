/**
 * 服务日志面板组件的 props。
 */

import type { ServiceStatus } from '@/services/types';

export type ServiceLogPanelProps = {
  /** 服务快照，日志面板只读它 */
  service: ServiceStatus;
  /** agent 是否离线：离线时暂停读取 */
  offline: boolean;
};
