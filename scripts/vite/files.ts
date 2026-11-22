/**
 * 文件浏览页插件：把本机指定目录下的文件夹与文件暴露给前端。
 *
 * - `GET /api/files`：列用户主目录；
 * - `GET /api/files?dir=<绝对路径>`：列指定目录（含子文件夹直属条目数、文件大小与修改时间）。
 *
 * 只读、不写盘；中间件只挂在开发服务器上，静态构建不带这个接口。
 * 文件内容与预览是单独任务，本接口不下发文件内容，只给列表摘要。
 */

import type { Plugin } from 'vite';

import {
  homeDirectory,
  listDirectory,
  statusForReadError,
} from './files-store.js';

/** 从 `?dir=` 取目录路径；没带参数返回 null（回落主目录） */
const dirFromUrl = (url: string | undefined): string | null => {
  const query = url?.split('?')[1] ?? '';
  const value = new URLSearchParams(query).get('dir');

  return value && value.length > 0 ? value : null;
};

/**
 * 目录浏览插件：读盘归类走 `files-store.ts`，这里只做请求解析、错误归类与响应收口。
 */
export const files = (): Plugin => ({
  name: 'files',
  configureServer(server) {
    server.middlewares.use('/api/files', async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');

      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ message: '不支持的请求方法' }));

        return;
      }

      const dir = dirFromUrl(req.url) ?? homeDirectory();

      try {
        const listing = await listDirectory(dir);

        res.end(JSON.stringify({ listing }));
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
