/**
 * 能播放视频的本地应用：给「视频点击后用外部应用打开」选一个目标。
 *
 * 判断靠应用包里 `Info.plist` 的 `CFBundleDocumentTypes`：声明了视频统一类型标识
 * （或视频扩展名）的应用才出现在列表里。`/Applications`、`/System/Applications`
 * 与用户自己的 `~/Applications` 三处扫一遍，顶层 `.app` 足够覆盖常见播放器。
 *
 * `plutil -convert json` 一次只解一个包，读不到（二进制、没有 plist）就跳过，
 * 单个包坏掉不影响整个列表。
 */

import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** 一个可选的播放器 */
export type VideoApp = {
  /** 应用名（不含 `.app`），`open -a` 直接用它 */
  name: string;
  /** 应用包绝对路径 */
  path: string;
};

/** 应用可能声明的视频统一类型标识：声明其中任意一个就算能播视频 */
const VIDEO_CONTENT_TYPES: readonly string[] = [
  'public.movie',
  'public.audiovisual-content',
  'public.mpeg-4',
  'com.apple.quicktime-movie',
  'org.matroska.mkv',
  'public.avi',
  'public.mpeg',
];

/** 同上，但按扩展名声明（有的播放器只写扩展名不写 UTI） */
const VIDEO_EXTENSIONS: readonly string[] = [
  'mp4',
  'mov',
  'mkv',
  'avi',
  'webm',
  'm4v',
  'flv',
  'wmv',
  'mpeg',
  'mpg',
  'm2ts',
  '3gp',
];

/** 扫描的三个目录；用户目录下的应用同样能播视频 */
const CANDIDATE_DIRS: readonly string[] = [
  '/Applications',
  '/System/Applications',
  path.join(homedir(), 'Applications'),
];

/** 同时解多少个 plist：不要一次拉起几十个 `plutil` 把窗口卡住 */
const PLIST_CONCURRENCY = 8;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 任一字符串项命中给定集合（大小写不敏感，扩展名与 UTI 都按小写比） */
const hasAny = (values: readonly string[], accepted: readonly string[]): boolean =>
  values.some((value) => accepted.includes(value.toLowerCase()));

/**
 * 从 `CFBundleDocumentTypes` 判断这个包能不能播视频。
 * 只看「可打开」的声明：没有 `LSItemContentTypes` 与扩展名就当作不能。
 */
export const declaresVideoPlayback = (documentTypes: unknown): boolean => {
  if (!Array.isArray(documentTypes)) {
    return false;
  }

  return documentTypes.some((item) => {
    if (!isRecord(item)) {
      return false;
    }

    const contentTypes = Array.isArray(item.LSItemContentTypes)
      ? item.LSItemContentTypes.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const extensions = Array.isArray(item.CFBundleTypeExtensions)
      ? item.CFBundleTypeExtensions
          .filter((value): value is string => typeof value === 'string')
          /* 有的包把扩展名写成 `.mkv`，去掉点号再比 */
          .map((value) => value.replace(/^\./, ''))
      : [];

    return (
      hasAny(contentTypes, VIDEO_CONTENT_TYPES) || hasAny(extensions, VIDEO_EXTENSIONS)
    );
  });
};

/** 取包名：目录名去掉 `.app`；`CFBundleDisplayName` 只影响界面叫法，`open -a` 仍用包名 */
const appNameOf = (fileName: string): string => fileName.replace(/\.app$/i, '');

/** 解一个包的 Info.plist；读不到（缺文件、二进制解不开）返回 null */
const readInfoPlist = async (bundlePath: string): Promise<unknown> => {
  const plist = path.join(bundlePath, 'Contents', 'Info.plist');

  try {
    const { stdout } = await execFileAsync(
      'plutil',
      ['-convert', 'json', '-o', '-', plist],
      { maxBuffer: 4 * 1024 * 1024 },
    );

    return JSON.parse(stdout);
  } catch {
    return null;
  }
};

/** 扫一个目录下的顶层 `.app`，返回它们的绝对路径；目录不存在就给空数组 */
const scanDir = async (dir: string): Promise<string[]> => {
  try {
    const names = await readdir(dir);

    return names
      .filter((name) => name.endsWith('.app'))
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
};

/** 按并发上限跑一批任务，保持结果顺序 */
const mapWithLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(items[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
};

/** 设置里没选应用时用的默认播放器名：与前端 `DEFAULT_VIDEO_APP` 一致 */
const DEFAULT_VIDEO_APP_NAME = 'IINA';

/**
 * 明确不列出的应用：它们也声明了视频类型（网盘预览、阅读器、聊天、音乐、系统 QuickTime），
 * 但列表要的是「专门拿来看片的播放器」，这些混进来只会让下拉变长。
 * 名字是 `.app` 去掉后缀的包名，与 `open -a` 用的那份一致。
 */
const EXCLUDED_VIDEO_APPS: readonly string[] = [
  'BaiduNetdisk_mac',
  'Books',
  'Messages',
  'Music',
  'QuickTime Player',
];

/** 这个应用要不要出现在列表里（按包名精确匹配） */
export const isListableVideoApp = (name: string): boolean =>
  !EXCLUDED_VIDEO_APPS.includes(name);

/**
 * 列出能播放视频的应用：三处目录各自扫顶层 `.app`，按应用名去重、按名字排序。
 * 扫不到（目录不存在、包损坏）就给空数组，页面据此回落到「默认播放器」。
 */
export const listVideoApps = async (): Promise<VideoApp[]> => {
  const bundles = (await Promise.all(CANDIDATE_DIRS.map(scanDir))).flat();

  const apps = await mapWithLimit(bundles, PLIST_CONCURRENCY, async (bundle) => {
    const plist = await readInfoPlist(bundle);

    if (!isRecord(plist) || !declaresVideoPlayback(plist.CFBundleDocumentTypes)) {
      return null;
    }

    return { name: appNameOf(path.basename(bundle)), path: bundle };
  });

  const seen = new Set<string>();
  const result: VideoApp[] = [];

  for (const app of apps) {
    if (app === null || seen.has(app.name) || !isListableVideoApp(app.name)) {
      continue;
    }

    seen.add(app.name);
    result.push(app);
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * 按应用名找它的包路径：网格缩略图要用所选播放器的图标，而前端只存了名字。
 * 名字为空按默认 IINA；找不到返回 null，前端回落分类图标。
 */
export const videoAppBundlePath = async (name: string): Promise<string | null> => {
  const wanted = name.trim() === '' ? DEFAULT_VIDEO_APP_NAME : name.trim();
  const apps = await listVideoApps();

  return apps.find((app) => app.name === wanted)?.path ?? null;
};
