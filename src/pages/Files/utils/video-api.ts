/**
 * 视频的三条接口：本机能播放视频的应用列表（设置里的「外部应用」下拉）、
 * 把某个视频交给外部播放器打开，以及把浏览器抽好的音轨写盘。
 *
 * 扫描与判断都在 Vite 中间件（`scripts/vite/files-video-apps.ts`、`files-open.ts`），
 * 这里只发请求、把回执收窄；静态构建下这些接口不存在，直接给出可读的错。
 */

import { readHttpErrorMessage } from '@/utils/error';

import type { VideoAppOption } from '../types';

import { normalizeAudioResponse } from './normalize';

const VIDEO_APPS_ENDPOINT = '/api/files/video-apps';
const OPEN_ENDPOINT = '/api/files/open';
const AUDIO_ENDPOINT = '/api/files/audio';

/** 取数请求的缓存策略：开发态必须实时，静态产物不读这个接口 */
const REQUEST_INIT: RequestInit = import.meta.env.DEV
  ? { cache: 'no-store' }
  : {};

/** 播放器列表：只留名字非空的项；回执不是 `{ apps: [...] }` 就当格式不对 */
const normalizeVideoApps = (payload: unknown): VideoAppOption[] | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const { apps } = payload as { apps?: unknown };

  if (!Array.isArray(apps)) {
    return null;
  }

  return apps.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }

    const { name, path } = item as { name?: unknown; path?: unknown };

    return typeof name === 'string' && name
      ? [{ name, path: typeof path === 'string' ? path : '' }]
      : [];
  });
};

/** 真正发请求那一步：缓存只包这一层，失败时能整块丢掉重来 */
const requestVideoApps = async (): Promise<VideoAppOption[]> => {
  const response = await fetch(VIDEO_APPS_ENDPOINT, REQUEST_INIT);

  if (!response.ok) {
    throw new Error(
      await readHttpErrorMessage(
        response,
        `读取播放器列表失败（HTTP ${response.status}）`,
      ),
    );
  }

  const payload: unknown = await response.json();
  const apps = normalizeVideoApps(payload);

  if (apps === null) {
    throw new Error('播放器列表格式不符合预期');
  }

  return apps;
};

/**
 * 页面级缓存：扫应用目录要读十几个 `Info.plist`，设置面板反复开关不该每次都重扫。
 * 一次进页面只扫一遍——进页面时由 `FilesActions` 清空，所以装完新播放器刷新页面就能看到。
 * 失败不缓存（下次打开面板会重试）。
 */
let videoAppsRequest: Promise<VideoAppOption[]> | null = null;

/** 清掉缓存：进页面时调一次，让本次停留内共用同一份结果 */
export const resetVideoAppsCache = (): void => {
  videoAppsRequest = null;
};

/** 能播放视频的本机应用：设置面板里的下拉选项，同一次页面停留内只请求一次 */
export const fetchVideoApps = (): Promise<VideoAppOption[]> => {
  if (!import.meta.env.DEV) {
    throw new Error('静态构建不支持操作本地目录，请在开发模式下打开');
  }

  videoAppsRequest ??= requestVideoApps().catch((caught: unknown) => {
    videoAppsRequest = null;
    throw caught;
  });

  return videoAppsRequest;
};

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
 * 走这条路径的意义是把解码交给本地播放器（硬解 + 直接读盘），比浏览器里软解快得多。
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

/**
 * 把导出的音频（WebM 字节）写进目标目录；文件名以 `baseName`（视频名）打头，时间戳由后端补，
 * 同一秒重名后端会追加序号。返回实际文件名。
 */
export const saveAudioFile = async (
  blob: Blob,
  dir: string,
  baseName: string,
): Promise<string> => {
  if (!import.meta.env.DEV) {
    throw new Error('静态构建不支持操作本地目录，请在开发模式下打开');
  }

  const query = new URLSearchParams({ name: baseName });

  if (dir.length > 0) {
    query.set('dir', dir);
  }

  const response = await fetch(`${AUDIO_ENDPOINT}?${query.toString()}`, {
    ...REQUEST_INIT,
    body: blob,
    headers: { 'Content-Type': 'audio/webm' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(
      await readHttpErrorMessage(
        response,
        `导出音频失败（HTTP ${response.status}）`,
      ),
    );
  }

  const payload: unknown = await response.json();
  const name = normalizeAudioResponse(payload);

  if (name === null) {
    throw new Error('导出音频回执格式不符合预期');
  }

  return name;
};
