/**
 * 应用图标的按需抽取：从 `.app/Contents/Resources` 找 `.icns`，用 `sips` 转成 PNG，
 * 按「包路径 + 修改时间」缓存在临时目录里，页面刷新不会重复转码。
 *
 * 只服务列表展示：提取失败就返回 null，前端回落通用应用图标，不影响条目本身。
 * 图标文件路径必须落在该应用包自己的 Resources 目录内，不接受任意路径。
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { inspectAppBundle } from './files-apps.ts';

const execFileAsync = promisify(execFile);

/** 图标缓存目录：临时目录下的固定子目录，按包路径与修改时间作键 */
const ICON_CACHE_DIR = path.join(tmpdir(), 'my-dashboard-app-icons');

/** 输出边长：网格瓦片里的图标按 2 倍图取，显示时再缩 */
const ICON_SIZE = 128;

/** 判断路径是否在某个目录内（含自身不合法，必须真在里面） */
const isInside = (target: string, dir: string): boolean =>
  target.startsWith(`${dir}${path.sep}`);

/** 目录下的 `.icns` 文件；读不到按空 */
const listIcns = async (resources: string): Promise<string[]> => {
  try {
    const names = await readdir(resources);

    return names
      .filter((name) => name.toLowerCase().endsWith('.icns'))
      .map((name) => path.join(resources, name));
  } catch {
    return [];
  }
};

/**
 * 找出这个应用可用的 `.icns` 文件：优先 Info.plist 声明的图标，
 * 其次 Resources 里第一个 `.icns`。返回绝对路径，找不到返回 null。
 */
export const findAppIconSource = async (
  bundlePath: string,
  iconFile: string | null,
): Promise<string | null> => {
  const resources = path.join(bundlePath, 'Contents', 'Resources');
  const declared = iconFile
    ? path.join(
        resources,
        iconFile.toLowerCase().endsWith('.icns') ? iconFile : `${iconFile}.icns`,
      )
    : null;

  if (declared && isInside(declared, resources)) {
    try {
      await stat(declared);

      return declared;
    } catch {
      // 声明了但文件不在（有的应用用 Assets.car 存图标），继续找目录里的备用图标。
    }
  }

  const fallback = await listIcns(resources);

  return fallback[0] ?? null;
};

/**
 * 取应用图标的 PNG 路径；已经转好就直接复用缓存。
 *
 * - 应用不是 `.app` / 没有可用 `.icns` 时返回 null；
 * - `sips` 转码失败返回 null（前端显示通用图标）；
 * - 系统自带应用同样可以取图标，只是不给卸载入口。
 */
export const appIconPng = async (input: string): Promise<string | null> => {
  let bundle;

  try {
    bundle = await inspectAppBundle(input);
  } catch {
    return null;
  }

  const source = await findAppIconSource(bundle.path, bundle.info.iconFile);

  if (source === null) {
    return null;
  }

  let mtime: number;

  try {
    mtime = (await stat(source)).mtimeMs;
  } catch {
    return null;
  }

  const key = createHash('sha1')
    .update(`${bundle.realPath}:${mtime}`)
    .digest('hex')
    .slice(0, 16);
  const png = path.join(ICON_CACHE_DIR, `${key}.png`);

  try {
    await stat(png);

    return png;
  } catch {
    // 还没缓存过，下面转码。
  }

  try {
    await mkdir(ICON_CACHE_DIR, { recursive: true });
    await execFileAsync(
      'sips',
      ['-s', 'format', 'png', '-Z', String(ICON_SIZE), source, '--out', png],
      { timeout: 15_000 },
    );

    return png;
  } catch {
    return null;
  }
};
