/**
 * 本机服务模块的接口访问层。
 * 通过 Vite 的 /api 代理访问本地 agent（agent/server.mjs，默认 8787）。
 */

import type { ServiceStatus } from './types';

/** agent 基础路径（经 Vite 代理转发到本机 agent） */
const BASE = '/api';

let session: Promise<string> | undefined;

const getToken = () => {
  session ??= fetch(`${BASE}/session`, { signal: AbortSignal.timeout(10_000) })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('无法建立本机会话，请重新连接');
      }

      const body = (await response.json()) as { token: string };

      return body.token;
    })
    .catch((error: unknown) => {
      session = undefined;
      throw error;
    });

  return session;
};

/** A rejected token is safe to retry: authorization runs before any side effect. */
async function request<T>(
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<T> {
  const mutation = init?.method === 'POST';
  const bootstrap = path === '/agent/start';
  const headers = new Headers(init?.headers);

  if (mutation) {
    headers.set('X-Dashboard-Request', '1');

    if (!bootstrap) {
      headers.set('X-Dashboard-Token', await getToken());
    }
  }

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(mutation ? 75_000 : 10_000),
  });

  if (!response.ok) {
    let message = `请求失败（HTTP ${response.status}）`;
    let code: string | undefined;

    try {
      const body = (await response.json()) as {
        message?: string;
        code?: string;
      };

      message = body.message ?? message;
      ({ code } = body);
    } catch {
      /* Keep the HTTP status for non-JSON responses. */
    }

    if (code === 'INVALID_TOKEN' && retry) {
      session = undefined;

      return request<T>(path, init, false);
    }

    throw new Error(message);
  }

  if (path === '/agent/restart' || bootstrap) {
    session = undefined;
  }

  return (await response.json()) as T;
}

export type LogKind = 'service' | 'deploy';

/** 获取所有服务的状态快照 */
export const fetchServices = (): Promise<ServiceStatus[]> =>
  request<ServiceStatus[]>('/services');

/** 获取单个服务的日志尾部 */
export const fetchServiceLog = (
  id: string,
  lines = 80,
  kind: LogKind = 'service',
  signal?: AbortSignal,
) =>
  request<{ id: string; log: string; lines: number }>(
    `/services/${encodeURIComponent(id)}/log?lines=${lines}&kind=${kind}`,
    { signal },
  );

/** 清空单个服务的日志文件 */
export const clearServiceLog = (id: string, kind: LogKind = 'service') =>
  request<{ id: string; cleared: boolean }>(
    `/services/${encodeURIComponent(id)}/log/clear?kind=${kind}`,
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

export const restartService = (id: string) =>
  request<{ id: string; started?: boolean }>(
    `/services/${encodeURIComponent(id)}/restart`,
    { method: 'POST' },
  );

/** 重新部署服务（如构建并上传到 CloudBase） */
export const deployService = (id: string) =>
  request<{ id: string; deploying: boolean; alreadyDeploying?: boolean }>(
    `/services/${encodeURIComponent(id)}/deploy`,
    { method: 'POST' },
  );

/** 重启本地 agent；接口在新进程就绪后返回。 */
export const restartAgent = () =>
  request<{ restarted: boolean }>('/agent/restart', { method: 'POST' });

/** 通过开发服务器启动 agent，等待其就绪。 */
export const startAgent = () =>
  request<{ started: boolean }>('/agent/start', { method: 'POST' });
