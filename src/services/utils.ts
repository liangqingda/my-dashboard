/**
 * 服务模块的纯函数工具。
 */

import type { ServiceStatus } from '@/services/types';

/** 单个服务快照里所有会影响渲染的字段是否都没变 */
const isSameService = (prev: ServiceStatus, next: ServiceStatus): boolean =>
  prev.id === next.id &&
  prev.name === next.name &&
  prev.running === next.running &&
  prev.build === next.build &&
  prev.deploying === next.deploying &&
  prev.deployOutcome === next.deployOutcome &&
  prev.lastDeployAt === next.lastDeployAt &&
  prev.lastStartedAt === next.lastStartedAt &&
  prev.pids.join(',') === next.pids.join(',') &&
  (prev.lastExit?.at ?? '') === (next.lastExit?.at ?? '');

/**
 * 判断两次读取的结果是否等价：等价时保留旧数组，避免整棵服务列表白白重渲染。
 */
export const isSameServiceList = (
  prev: ServiceStatus[],
  next: ServiceStatus[],
): boolean =>
  prev.length === next.length &&
  next.every((service, index) => isSameService(prev[index], service));
