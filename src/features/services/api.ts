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

/** 清空单个服务的日志文件 */
export const clearServiceLog = (id: string) =>
  request<{ id: string; cleared: boolean }>(
    `/services/${encodeURIComponent(id)}/log/clear`,
    { method: 'POST' },
  );

/** 全局 CLI 命令（来自 ~/.zshrc 的别名/函数） */
export type CliCommand = {
  /** 命令名 */
  name: string;
  /** 类型：alias 别名 / function 函数 */
  type: 'alias' | 'function';
  /** 一句话说明 */
  desc: string;
  /** 分组：alias / postgres / redis / other */
  group: string;
};

/** 获取 ~/.zshrc 中的全局 CLI 命令（自动发现新增命令） */
export const fetchCliCommands = () =>
  request<{ commands: CliCommand[]; source: string }>('/cli-commands');

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

/** 重新部署服务（如构建并上传到 CloudBase） */
export const deployService = (id: string) =>
  request<{ id: string; deploying: boolean; alreadyDeploying?: boolean }>(
    `/services/${encodeURIComponent(id)}/deploy`,
    { method: 'POST' },
  );
