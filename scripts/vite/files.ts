/**
 * 文件浏览页插件：把本机指定目录下的文件夹、应用与文件暴露给前端。
 *
 * - `GET /api/files`：列用户主目录；
 * - `GET /api/files?dir=<绝对路径>`：列指定目录（含子文件夹直属条目数、应用包摘要、文件大小与修改时间，
 *   以及启动卷 / 外接卷的剩余可用空间 `space`）；
 * - `GET /api/files/content?path=<绝对路径>`：按 HTTP Range 流式读一个视频文件（只在开发模式）；
 * - `GET /api/files/image?path=<绝对路径>`：整份返回一张图片（只在开发模式，给图片预览用）；
 * - `GET /api/files/thumb?path=<绝对路径>`：图片缩略图 / 视频抽帧缩略图（带缓存，给网格用）；
 * - `GET /api/files/app-icon?path=<.app 路径>`：把应用包里的 `.icns` 转成 PNG 返回（带缓存）；
 *   也可用 `?app=<应用名>` 按播放器名取图标（网格在「外部应用」模式下就是这么用的）；
 * - `GET /api/files/app-residue?path=<.app 路径>`：列卸载会一并删掉的残留（应用数据 / 缓存 / 偏好设置等）；
 * - `POST /api/files/pick-dir`：调起 macOS 系统目录选择框，body `{ dir }` 作为默认定位目录，返回选中目录的绝对路径（取消返回 cancelled）；
 * - `POST /api/files/new-folder`：在 body `{ dir }` 目录下新建文件夹，返回新条目；
 * - `POST /api/files/rename`：body `{ path, name }` 重命名一条条目；
 * - `POST /api/files/move`：body `{ source, targetDir }` 把一条条目移入目标目录；
 * - `POST /api/files/delete`：body `{ path }` 删除一条条目，文件夹连同内部内容递归删除；
 * - `POST /api/files/open-app`：body `{ path }` 打开一个应用包（交给系统 `open`）；
 * - `POST /api/files/uninstall-app`：body `{ path }` 卸载应用包并清理残留，权限不足时弹一次授权窗补删；
 * - `POST /api/files/eject`：body `{ dir }` 推出当前目录所在的外接盘（`diskutil eject`），返回挂载点；
 * - `POST /api/files/capture`：body `{ dataUrl, dir? }` 把一帧 PNG 截图写进 `dir`（缺省用户桌面），返回文件名与绝对路径；
 * - `GET /api/files/video-apps`：列出能播放视频的本机应用（`open -a` 用应用名），供设置里选外部播放器；
 * - `POST /api/files/open`：body `{ path, app? }` 用外部播放器打开（`app` 优先，其次 IINA，再回落系统默认），返回 `{ app }`。
 *
 * 写操作与媒体接口仅限开发服务器中间件，静态构建不带这些接口；列表只给摘要，视频内容按需流式读取。
 */

import { readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream';
import type { ReadStream } from 'node:fs';
import type { Plugin } from 'vite';

import { appIconPng } from './files-app-icons.js';
import { fileThumb } from './files-thumbs.js';
import { launchAppBundle, scanAppResidues, uninstallAppBundle } from './files-apps.js';
import { openTrackedStream } from './files-handles.js';
import { openImageFile } from './files-images.js';
import {
  openVideoFile,
  openVideoStream,
  parseByteRange,
  saveCapture,
  videoEtag,
} from './files-media.js';
import { openExternalFile } from './files-open.js';
import { warmNativePicker } from './files-picker.js';
import { listVideoApps, videoAppBundlePath } from './files-video-apps.js';
import {
  createFolder,
  deleteEntry,
  homeDirectory,
  listDirectory,
  moveEntry,
  pickDirectory,
  renameEntry,
  statusForReadError,
} from './files-store.js';
import { readDirSpace } from './files-space.js';
import { ejectVolume } from './files-volume.js';

/** 截图请求体上限：一帧 PNG 的 base64 通常几 MB，留出余量但拒绝超大载荷 */
const CAPTURE_BODY_LIMIT = 40 * 1024 * 1024;

/** 统一的 JSON 错误响应 */
const sendJsonError = (
  res: import('node:http').ServerResponse,
  status: number,
  message: string,
): void => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ message }));
};

/** 从 `?dir=` 取目录路径；没带参数返回 null（回落主目录） */
const dirFromUrl = (url: string | undefined): string | null => {
  const query = url?.split('?')[1] ?? '';
  const value = new URLSearchParams(query).get('dir');

  return value && value.length > 0 ? value : null;
};

/** 只允许本页页面发起本机操作，拦住跨站请求 */
const sameOrigin = (req: import('node:http').IncomingMessage): boolean =>
  req.headers.origin === `http://${req.headers.host}`;

/**
 * 读 POST JSON body；空 body / 非法 JSON / 超长都按空对象处理。
 * 上限按请求类型给（默认 4KB，截图走更大的额度）。
 */
const readJsonBody = (
  req: import('node:http').IncomingMessage,
  limit = 4096,
): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    let raw = '';
    let aborted = false;

    req.on('data', (chunk) => {
      raw += chunk;

      if (raw.length > limit) {
        aborted = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) {
        resolve({});

        return;
      }

      try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};

        resolve(
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {},
        );
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });

/** 从 body 取字符串字段；缺失 / 非字符串按空串处理，校验留在 store 层 */
const bodyString = (body: Record<string, unknown>, key: string): string =>
  typeof body[key] === 'string' ? body[key] : '';

/** 从 body 取进程号数组：只留正整数，脏值丢掉（真正的授权判断在推出那一层） */
const bodyPids = (body: Record<string, unknown>, key: string): number[] => {
  const raw = body[key];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (item): item is number => Number.isInteger(item) && (item as number) > 1,
  );
};

/**
 * 把读流递给响应，并保证读流一定被销毁：正常读完、读盘出错、浏览器中途断开（换页、拖进度条）
 * 三种情况都会走到 `pipeline` 的收尾，句柄不会挂到下一次请求上。
 * 这是文件页能正常退出外接盘的前提——本进程只要还开着盘上的文件，系统就不让卸载。
 */
const pipeToResponse = (
  res: import('node:http').ServerResponse,
  stream: ReadStream,
  failureMessage: string,
): void => {
  pipeline(stream, res, (error) => {
    if (error === null || error === undefined) {
      return;
    }

    if (!res.headersSent) {
      sendJsonError(res, 500, failureMessage);

      return;
    }

    res.destroy();
  });
};

/**
 * 流式读一个视频文件：视频元素靠 Range 请求跳转与续播，这里按 `Range` 回 206，
 * 没有 Range 时整份返回。只做 GET / HEAD，不接受写操作。
 */
const serveVideoContent = async (
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJsonError(res, 405, '不支持的请求方法');

    return;
  }

  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const video = await openVideoFile(url.searchParams.get('path') ?? '');
    const range = parseByteRange(req.headers.range, video.size);
    const etag = videoEtag(video);

    res.setHeader('Content-Type', video.mime);
    res.setHeader('Accept-Ranges', 'bytes');
    /*
     * 允许浏览器缓存已读过的字节：同一片子重复打开、来回 seek、翻篇再翻回去都省一次重读。
     * `private` + 10 分钟；文件体积或修改时间一变，`ETag` 就变，旧缓存的 Range 片段自然失效。
     */
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date(video.mtimeMs).toUTCString());

    // 整份请求可以只靠校验直接回 304；带 Range 的请求照常回 206
    if (!range && req.headers['if-none-match'] === etag) {
      res.statusCode = 304;
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Length');
      res.end();

      return;
    }

    if (range) {
      res.statusCode = 206;
      res.setHeader(
        'Content-Range',
        `bytes ${range.start}-${range.end}/${video.size}`,
      );
      res.setHeader('Content-Length', range.end - range.start + 1);
    } else {
      res.setHeader('Content-Length', video.size);
    }

    if (req.method === 'HEAD') {
      res.end();

      return;
    }

    pipeToResponse(res, openVideoStream(video, range), '读取视频失败');
  } catch (error) {
    sendJsonError(
      res,
      statusForReadError(error),
      error instanceof Error ? error.message : '读取视频失败',
    );
  }
};

/**
 * 图片内容：整份读给浏览器（图片不需要 Range），带正确 MIME 并禁止缓存，
 * 换目录 / 换文件后不会拿到上一张的旧内容。
 */
const serveImageContent = async (
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJsonError(res, 405, '不支持的请求方法');

    return;
  }

  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const image = await openImageFile(url.searchParams.get('path') ?? '');

    res.setHeader('Content-Type', image.mime);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', image.size);

    if (req.method === 'HEAD') {
      res.end();

      return;
    }

    pipeToResponse(res, openTrackedStream(image.path), '读取图片失败');
  } catch (error) {
    sendJsonError(
      res,
      statusForReadError(error),
      error instanceof Error ? error.message : '读取图片失败',
    );
  }
};

/**
 * 列表缩略图：图片给缩放后的 JPEG、视频给 QuickLook 抽的一帧 PNG。
 * 转不出来就 404，前端回落分类图标，不拖垮条目本身。
 */
const serveThumb = async (
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJsonError(res, 405, '不支持的请求方法');

    return;
  }

  const thumb = await fileThumb(
    new URL(req.url ?? '', 'http://localhost').searchParams.get('path') ?? '',
  );

  if (thumb === null) {
    sendJsonError(res, 404, '没有可用的缩略图');

    return;
  }

  try {
    const content = await readFile(thumb.path);

    res.setHeader('Content-Type', thumb.mime);
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.setHeader('Content-Length', String(content.byteLength));

    if (req.method === 'HEAD') {
      res.end();

      return;
    }

    res.end(content);
  } catch {
    sendJsonError(res, 500, '读取缩略图失败');
  }
};

/**
 * 应用图标：取 `.icns` 转好的 PNG 缓存按二进制返回。
 * 没有可用图标时 404，前端回落通用应用图标，不拖垮条目本身。
 */
const serveAppIcon = async (
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJsonError(res, 405, '不支持的请求方法');

    return;
  }

  const url = new URL(req.url ?? '', 'http://localhost');
  const explicitPath = url.searchParams.get('path') ?? '';
  const appName = url.searchParams.get('app') ?? '';
  const bundle =
    explicitPath !== '' ? explicitPath : await videoAppBundlePath(appName);
  const png = bundle === null ? null : await appIconPng(bundle);

  if (png === null) {
    sendJsonError(res, 404, '没有可用的应用图标');

    return;
  }

  try {
    const content = await readFile(png);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=600');

    if (req.method === 'HEAD') {
      res.end();

      return;
    }

    res.end(content);
  } catch {
    sendJsonError(res, 500, '读取应用图标失败');
  }
};

/**
 * 目录浏览插件：读盘归类走 `files-store.ts`，视频流与截图走 `files-media.ts`，
 * 应用包与卸载走 `files-apps.ts`，这里只做请求解析、错误归类与响应收口。
 */
export const files = (): Plugin => ({
  name: 'files',
  configureServer(server) {
    /** 先把原生目录选择框编好，用户点按钮时不必再等编译 */
    warmNativePicker();

    server.middlewares.use('/api/files', async (req, res) => {
      const pathname = (req.url ?? '').split('?')[0];

      if (pathname === '/content') {
        await serveVideoContent(req, res);

        return;
      }

      if (pathname === '/image') {
        await serveImageContent(req, res);

        return;
      }

      if (pathname === '/thumb') {
        await serveThumb(req, res);

        return;
      }

      if (pathname === '/app-icon') {
        await serveAppIcon(req, res);

        return;
      }

      if (pathname === '/app-residue') {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ message: '不支持的请求方法' }));

          return;
        }

        try {
          const appPath = new URL(req.url ?? '', 'http://localhost').searchParams.get(
            'path',
          );
          const report = await scanAppResidues(appPath ?? '');

          res.end(JSON.stringify({ report }));
        } catch (error) {
          res.statusCode = statusForReadError(error);
          res.end(
            JSON.stringify({
              message: error instanceof Error ? error.message : '读取应用残留失败',
            }),
          );
        }

        return;
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');

      if (pathname === '/pick-dir') {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ message: '不支持的请求方法' }));

          return;
        }

        if (!sameOrigin(req)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ message: '跨站请求被拒绝' }));

          return;
        }

        try {
          const body = await readJsonBody(req);
          const defaultDir =
            typeof body.dir === 'string' && body.dir.length > 0
              ? body.dir
              : undefined;
          const picked = await pickDirectory(defaultDir);

          res.end(JSON.stringify({ picked }));
        } catch (error) {
          res.statusCode = statusForReadError(error);
          res.end(
            JSON.stringify({
              message:
                error instanceof Error ? error.message : '选择目录失败',
            }),
          );
        }

        return;
      }

      if (pathname === '/video-apps') {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ message: '不支持的请求方法' }));

          return;
        }

        try {
          const apps = await listVideoApps();

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ apps }));
        } catch (error) {
          sendJsonError(
            res,
            statusForReadError(error),
            error instanceof Error ? error.message : '读取播放器列表失败',
          );
        }

        return;
      }

      if (pathname === '/open') {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ message: '不支持的请求方法' }));

          return;
        }

        if (!sameOrigin(req)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ message: '跨站请求被拒绝' }));

          return;
        }

        try {
          const body = await readJsonBody(req);
          const app = await openExternalFile(
            bodyString(body, 'path'),
            bodyString(body, 'app') || undefined,
          );

          res.end(JSON.stringify({ app }));
        } catch (error) {
          res.statusCode = statusForReadError(error);
          res.end(
            JSON.stringify({
              message:
                error instanceof Error ? error.message : '外部打开失败',
            }),
          );
        }

        return;
      }

      if (
        pathname === '/new-folder' ||
        pathname === '/rename' ||
        pathname === '/move' ||
        pathname === '/delete' ||
        pathname === '/open-app' ||
        pathname === '/uninstall-app' ||
        pathname === '/eject' ||
        pathname === '/capture'
      ) {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ message: '不支持的请求方法' }));

          return;
        }

        if (!sameOrigin(req)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ message: '跨站请求被拒绝' }));

          return;
        }

        try {
          const body = await readJsonBody(
            req,
            pathname === '/capture' ? CAPTURE_BODY_LIMIT : undefined,
          );

          if (pathname === '/capture') {
            const capture = await saveCapture(
              bodyString(body, 'dataUrl'),
              bodyString(body, 'dir'),
            );

            res.end(JSON.stringify({ capture }));
          } else if (pathname === '/new-folder') {
            const entry = await createFolder(bodyString(body, 'dir'));

            res.end(JSON.stringify({ entry }));
          } else if (pathname === '/rename') {
            const entry = await renameEntry(
              bodyString(body, 'path'),
              bodyString(body, 'name'),
            );

            res.end(JSON.stringify({ entry }));
          } else if (pathname === '/move') {
            await moveEntry(
              bodyString(body, 'source'),
              bodyString(body, 'targetDir'),
            );

            res.end(JSON.stringify({ ok: true }));
          } else if (pathname === '/delete') {
            await deleteEntry(bodyString(body, 'path'));

            res.end(JSON.stringify({ ok: true }));
          } else if (pathname === '/eject') {
            const result = await ejectVolume(
              bodyString(body, 'dir'),
              bodyPids(body, 'killPids'),
            );

            res.end(JSON.stringify({ result }));
          } else if (pathname === '/open-app') {
            const launched = await launchAppBundle(bodyString(body, 'path'));

            res.end(JSON.stringify({ launched }));
          } else {
            const result = await uninstallAppBundle(bodyString(body, 'path'));

            res.end(JSON.stringify({ result }));
          }
        } catch (error) {
          res.statusCode = statusForReadError(error);
          res.end(
            JSON.stringify({
              message:
                error instanceof Error ? error.message : '操作失败',
            }),
          );
        }

        return;
      }

      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ message: '不支持的请求方法' }));

        return;
      }

      const dir = dirFromUrl(req.url) ?? homeDirectory();

      try {
        const listing = await listDirectory(dir);
        // 空间只是附加信息：读的是刚校验过的目录，读不到就是 null，不拖垮这次列表
        const space = await readDirSpace(listing.path);

        res.end(JSON.stringify({ listing: { ...listing, space } }));
      } catch (error) {
        res.statusCode = statusForReadError(error);
        res.end(
          JSON.stringify({
            message:
              error instanceof Error ? error.message : '读取目录失败',
          }),
        );
      }
    });
  },
});
