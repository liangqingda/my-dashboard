/**
 * 把本机文件交给外部应用打开：程序坞窗口与文件页共用同一条接口。
 * 只在开发态可用（静态构建没有 Vite 中间件）；失败沿用 HTTP 错误文案。
 */

import { readHttpErrorMessage } from '@/utils/error';

const OPEN_ENDPOINT = '/api/files/open';

const REQUEST_INIT: RequestInit = import.meta.env.DEV
  ? { cache: 'no-store' }
  : {};

/** 外部打开的回执：实际用上的应用名，`default` 表示系统默认应用；其它一律当格式不对 */
const normalizeOpenAppResponse = (payload: unknown): string | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const { app } = payload as { app?: unknown };

  return typeof app === 'string' && app ? app : null;
};

/**
 * 用外部播放器打开一个视频：给定的应用优先，其次 IINA，再回落系统默认应用。
 *
 * @returns 实际用上的应用名；`default` 表示系统默认应用
 */
export const openFileExternally = async (
  pathValue: string,
  appName?: string,
): Promise<string> => {
  const response = await fetch(OPEN_ENDPOINT, {
    ...REQUEST_INIT,
    body: JSON.stringify({ path: pathValue, ...(appName ? { app: appName } : {}) }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(
      await readHttpErrorMessage(
        response,
        `外部打开失败（HTTP ${response.status}）`,
      ),
    );
  }

  const payload: unknown = await response.json();
  const app = normalizeOpenAppResponse(payload);

  if (app === null) {
    throw new Error('外部打开回执格式不符合预期');
  }

  return app;
};
