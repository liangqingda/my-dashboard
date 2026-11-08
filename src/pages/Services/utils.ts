/**
 * 服务页的纯函数工具：忙碌判定、可访问性、端口展示、状态徽标推导与列表统计。
 */

import type { PillView, StatusViewInput } from './types';

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

/** 由运行态 + 编译态推导状态徽标的文案与色系（渲染期直接推导，无需 effect） */
export const deriveStatusView = ({
  build,
  running,
}: StatusViewInput): PillView => {
  if (running) {
    if (build === 'ok') {
      return { label: '运行中', tone: 'ok' };
    }

    if (build === 'fail') {
      return { label: '编译失败', tone: 'danger' };
    }

    return build === 'starting'
      ? { label: '启动中', tone: 'warn' }
      : { label: '运行待确认', tone: 'warn' };
  }

  return build === 'fail'
    ? { label: '启动失败', tone: 'danger' }
    : { label: '已停止', tone: 'muted' };
};

/** 服务列表的汇总数字，列表顶部统计条用；一次遍历同时数四个口径 */
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
} => {
  let running = 0;
  let failed = 0;
  let autoStart = 0;

  for (const service of services) {
    if (service.running) {
      running += 1;
    }

    if (service.build === 'fail' || service.deployOutcome === 'failed') {
      failed += 1;
    }

    if (service.autoStart) {
      autoStart += 1;
    }
  }

  return { total: services.length, running, failed, autoStart };
};

/** 日志正文：有输出就原样显示，没有时区分「正在读取」与「确实没有」 */
export const resolveLogContent = (log: string, loading: boolean): string => {
  if (log.trim()) {
    return log;
  }

  return loading ? '正在读取日志…' : '暂无日志输出';
};
