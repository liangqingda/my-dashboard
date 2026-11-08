/**
 * 本机服务模块的接口访问层。
 * 通过 Vite 的 /api 代理访问本地 agent（agent/server.mjs，默认 8787）。
 */

import { AGENT_RECOVERY_INTERVAL, AGENT_RECOVERY_TIMEOUT } from '@/services/constants';
import type { CliCommand, LogKind, ServiceStatus } from '@/services/types';

/** agent 基础路径（经 Vite 代理转发到本机 agent） */
const BASE = '/api';

let session: Promise<string> | undefined;

const getToken = () => {
  session ??= fetchSession()
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('无法建立本机会话，请重新连接');
      }

      const body = (await response.json()) as { token: string };

      if (typeof body.token !== 'string' || !body.token) {
        throw new Error('本机会话无效，请重新连接');
      }

      return body.token;
    })
    .catch((error: unknown) => {
      session = undefined;
      throw error;
    });

  return session;
};

async function fetchSession(): Promise<Response> {
  const load = () =>
    fetch(`${BASE}/session`, {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
  const response = await load();

  if (response.status !== 404) {
    return response;
  }

  if (!import.meta.env.DEV) {
    throw new Error('本机服务版本过旧，请重启 agent 后重试');
  }

  // Reconcile a live legacy agent before sending any service command.
  await startAgent();

  return load();
}

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

  if (path === '/agent/restart') {
    session = undefined;
  }

  return (await response.json()) as T;
}

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

/** 探一次健康检查：代理还没恢复时 fetch 会直接抛错 */
const probeHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    });

    return response.ok;
  } catch {
    return false;
  }
};

const waitForHealth = async (deadline: number): Promise<boolean> => {
  if (await probeHealth()) {
    return true;
  }

  if (Date.now() >= deadline) {
    return false;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, AGENT_RECOVERY_INTERVAL);
  });

  return waitForHealth(deadline);
};

/**
 * 轮询 /api/health，直到本机服务重新可用；超时返回 false。
 * 重启工作台自身会先切断页面到 dev server 的代理，dev server 起来后才有响应。
 */
export const waitForAgentOnline = (
  timeoutMs = AGENT_RECOVERY_TIMEOUT,
): Promise<boolean> => waitForHealth(Date.now() + timeoutMs);
