/**
 * 单个服务行的 props。
 */

import type { ServiceBusy, ServiceStatus } from '@/services/types';

export type ServiceRowProps = {
  /** 服务快照 */
  service: ServiceStatus;
  /** 正在进行中的操作 */
  busy: ServiceBusy;
  /** agent 是否离线 */
  offline: boolean;
  /** 启动 */
  onStart: (id: string) => void;
  /** 停止 */
  onStop: (id: string) => void;
  /** 重启 */
  onRestart: (id: string) => void;
  /** 部署 */
  onDeploy: (id: string) => void;
};
