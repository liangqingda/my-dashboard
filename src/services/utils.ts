/**
 * 服务模块的纯函数工具。
 */

import type { ServiceActivity, ServiceStatus } from '@/services/types';

/** 读取状态失败：HTTP 错误是带 message 的 Error，连接被切断时 fetch 抛 TypeError */
export const isConnectionError = (error: unknown): boolean =>
  error instanceof TypeError;

/** 单个服务快照里所有会影响渲染的字段是否都没变 */
const isSameService = (prev: ServiceStatus, next: ServiceStatus): boolean =>
  prev.id === next.id &&
  prev.name === next.name &&
  prev.running === next.running &&
  prev.build === next.build &&
  prev.canStop === next.canStop &&
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

/** 校验 sessionStorage 里存进来的历史记录，坏数据一律丢弃 */
export const isServiceActivity = (item: unknown): item is ServiceActivity => {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  return (
    'id' in item &&
    typeof item.id === 'string' &&
    'serviceName' in item &&
    typeof item.serviceName === 'string' &&
    'label' in item &&
    typeof item.label === 'string' &&
    'at' in item &&
    typeof item.at === 'string' &&
    Number.isFinite(Date.parse(item.at)) &&
    'success' in item &&
    typeof item.success === 'boolean'
  );
};
