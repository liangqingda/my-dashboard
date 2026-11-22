/**
 * 文件浏览页插件：把本机指定目录下的文件夹与文件暴露给前端。
 *
 * - `GET /api/files`：列用户主目录；
 * - `GET /api/files?dir=<绝对路径>`：列指定目录（含子文件夹直属条目数、文件大小与修改时间，
 *   以及启动卷 / 外接卷的剩余可用空间 `space`）；
 * - `POST /api/files/pick-dir`：调起 macOS 系统目录选择框，body `{ dir }` 作为默认定位目录，返回选中目录的绝对路径（取消返回 cancelled）；
 * - `POST /api/files/new-folder`：在 body `{ dir }` 目录下新建文件夹，返回新条目；
 * - `POST /api/files/rename`：body `{ path, name }` 重命名一条条目；
 * - `POST /api/files/move`：body `{ source, targetDir }` 把一条条目移入目标目录；
 * - `POST /api/files/delete`：body `{ path }` 删除一条条目，文件夹连同内部内容递归删除。
 *
 * 写操作仅限开发服务器中间件，静态构建不带这些接口；不读文件内容，只给列表摘要。
 */

import type { Plugin } from 'vite';

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

/** 从 `?dir=` 取目录路径；没带参数返回 null（回落主目录） */
const dirFromUrl = (url: string | undefined): string | null => {
  const query = url?.split('?')[1] ?? '';
  const value = new URLSearchParams(query).get('dir');

  return value && value.length > 0 ? value : null;
};

/** 只允许本页页面发起本机操作，拦住跨站请求 */
const sameOrigin = (req: import('node:http').IncomingMessage): boolean =>
  req.headers.origin === `http://${req.headers.host}`;

/** 读 POST JSON body；空 body / 非法 JSON / 超长都按空对象处理 */
const readJsonBody = (
  req: import('node:http').IncomingMessage,
): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    let raw = '';
    let aborted = false;

    req.on('data', (chunk) => {
      raw += chunk;

      if (raw.length > 4096) {
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

/**
 * 目录浏览插件：读盘归类走 `files-store.ts`，这里只做请求解析、错误归类与响应收口。
 */
export const files = (): Plugin => ({
  name: 'files',
  configureServer(server) {
    server.middlewares.use('/api/files', async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');

      const pathname = (req.url ?? '').split('?')[0];

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

      if (
        pathname === '/new-folder' ||
        pathname === '/rename' ||
        pathname === '/move' ||
        pathname === '/delete'
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
          const body = await readJsonBody(req);

          if (pathname === '/new-folder') {
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
          } else {
            await deleteEntry(bodyString(body, 'path'));

            res.end(JSON.stringify({ ok: true }));
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
