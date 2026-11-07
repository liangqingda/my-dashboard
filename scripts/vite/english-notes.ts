import path from 'node:path';

import type { IncomingMessage as HttpRequest } from 'node:http';
import type { Plugin } from 'vite';

import { commitNote } from './english-notes-commit.js';
import { collectNotes, readNote, writeNote } from './english-notes-store.js';

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 读取请求体并解析为 JSON，超过 1 MB 直接拒绝 */
const readJsonBody = async (req: HttpRequest): Promise<unknown> => {
  let body = '';

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 1_000_000) {
      throw new Error('请求体过大');
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error('请求体不是有效的 JSON');
  }
};

/** 从 `?name=` 取单篇笔记名；没带参数返回 null */
const nameFromUrl = (url: string | undefined): string | null => {
  const query = url?.split('?')[1] ?? '';
  const value = new URLSearchParams(query).get('name');

  return value && value.length > 0 ? value : null;
};

/**
 * 英语笔记插件：把 learn-english 仓库 learning-record-notes 下的 Markdown
 * 暴露给前端，并把弹窗里的编辑写回源文件、提交记录仓库。
 *
 * - 开发服务器：
 *   - `GET /api/english/notes`：全部笔记（每次请求实时读盘）；
 *   - `GET /api/english/notes?name=<file>`：单篇笔记，打开预览 / 保存后只刷这一篇；
 *   - `PUT /api/english/notes`：写回源文件后自动提交该文件。
 * - 构建：全部笔记作为 `english-notes.json` 资源写进产物，供静态预览使用。
 *
 * 记录仓库默认取与本项目同级目录（`../learn-english`），
 * 可用环境变量 `ENGLISH_RECORDS_DIR` 指定其它路径。
 */
export const englishNotes = (root: string): Plugin => {
  const repoDir = path.resolve(
    process.env.ENGLISH_RECORDS_DIR ?? path.join(root, '..', 'learn-english'),
  );

  return {
    name: 'english-notes',
    async buildStart() {
      this.emitFile({
        type: 'asset',
        fileName: 'english-notes.json',
        source: JSON.stringify({ notes: await collectNotes(repoDir) }),
      });
    },
    configureServer(server) {
      // 该中间件先于 /api 代理执行，因此不会落到本机 agent 上。
      server.middlewares.use('/api/english/notes', async (req, res, next) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        if (req.method === 'GET') {
          const name = nameFromUrl(req.url);

          try {
            if (name) {
              const note = await readNote(repoDir, name);

              if (!note) {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: '这篇笔记不存在' }));

                return;
              }

              res.end(JSON.stringify({ note }));

              return;
            }

            res.end(JSON.stringify({ notes: await collectNotes(repoDir) }));
          } catch (error) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                message:
                  error instanceof Error ? error.message : '读取英语笔记失败',
              }),
            );
          }

          return;
        }

        // 把编辑后的 Markdown 写回源文件，再提交记录仓库。
        if (req.method === 'PUT') {
          try {
            const payload = await readJsonBody(req);

            if (!isObject(payload)) {
              throw new Error('请求体格式不正确');
            }

            const name = payload.name;
            const content = payload.content;

            if (typeof name !== 'string') {
              throw new Error('缺少文件名');
            }

            if (typeof content !== 'string') {
              throw new Error('正文必须是字符串');
            }

            const { updatedAt } = await writeNote(repoDir, name, content);
            const commit = await commitNote(repoDir, name);

            res.end(JSON.stringify({ commit, name, updatedAt }));
          } catch (error) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                message:
                  error instanceof Error ? error.message : '写入英语笔记失败',
              }),
            );
          }

          return;
        }

        next();
      });
    },
  };
};
