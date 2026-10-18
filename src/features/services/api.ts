/**
 * 本机服务模块的接口访问层。
 * 通过 Vite 的 /api 代理访问本地 agent（agent/server.mjs，默认 8787）。
 */

import type { ServiceStatus } from './types';

/** agent 基础路径（经 Vite 代理转发到本机 agent） */
const BASE = '/api';

/** 统一的 JSON 请求封装：非 2xx 时抛出带后端 message 的错误 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);

  if (!response.ok) {
    let message = `请求失败（HTTP ${response.status}）`;

    try {
      const { message: bodyMessage } = (await response.json()) as {
        message?: string;
      };

      if (bodyMessage) {
        message = bodyMessage;
      }
    } catch {
      /* 非 JSON 响应，保留默认错误信息 */
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

/** 获取所有服务的状态快照 */
export const fetchServices = (): Promise<ServiceStatus[]> =>
  request<ServiceStatus[]>('/services');

/** 获取单个服务的日志尾部 */
export const fetchServiceLog = (id: string, lines = 80) =>
  request<{ id: string; log: string; lines: number }>(
    `/services/${encodeURIComponent(id)}/log?lines=${lines}`,
  );

/** 启动服务 */
export const startService = (id: string) =>
  request<{ id: string; started?: boolean; alreadyRunning?: boolean }>(
    `/services/${encodeURIComponent(id)}/start`,
    { method: 'POST' },
  );

/** 停止服务 */
export const stopService = (id: string) =>
  request<{ id: string; stopped?: boolean; remaining?: number[] }>(
    `/services/${encodeURIComponent(id)}/stop`,
    { method: 'POST' },
  );
