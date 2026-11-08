/**
 * 服务页的纯函数工具：忙碌判定、可访问性、端口展示与列表统计。
 */

import type { ServiceBusy, ServiceStatus } from '@/services/types';

/** 启动 / 重启这类「把服务拉起来」的操作是否在进行 */
export const isPrimaryBusy = (busy: ServiceBusy, id: string): boolean =>
  busy[id] === 'start' || busy[id] === 'restart';

/** 停止操作是否在进行 */
export const isStopBusy = (busy: ServiceBusy, id: string): boolean =>
  busy[id] === 'stop';

/** 服务是否有可访问的 http 地址并且正在运行 */
export const canOpenService = (service: ServiceStatus): boolean =>
  service.running && /^https?:\/\//.test(service.url ?? '');

/**
 * 端口展示串：主端口在前，附加端口依次跟在后面，有标签时显示成「前端 3000」。
 * 返回空字符串表示这个服务没有端口。
 */
export const formatServicePorts = (service: ServiceStatus): string => {
  if (service.port === null) {
    return '';
  }

  return [
    service.portLabel
      ? `${service.portLabel} ${service.port}`
      : String(service.port),
    ...service.extraPorts.map((port) =>
      port.label ? `${port.label} ${port.port}` : String(port.port),
    ),
  ].join(' · ');
};

/** 服务列表的汇总数字，列表顶部统计条用 */
export const summarizeServices = (
  services: ServiceStatus[],
): {
  /** 已登记的服务数 */
  total: number;
  /** 正在运行的个数 */
  running: number;
  /** 构建失败或部署失败的个数 */
  failed: number;
  /** 开机自启的个数 */
  autoStart: number;
} => ({
  total: services.length,
  running: services.filter((service) => service.running).length,
  failed: services.filter(
    (service) => service.build === 'fail' || service.deployOutcome === 'failed',
  ).length,
  autoStart: services.filter((service) => service.autoStart).length,
});
