import path from 'node:path';

import type { IncomingMessage as HttpRequest } from 'node:http';
import type { Plugin } from 'vite';

import { commitNote } from './english-notes-commit.js';
import {
  collectNoteSummaries,
  readCategoryConfig,
  readNote,
  toNoteDetail,
  writeNote,
} from './english-notes-store.js';

/** 构建产物里列表索引的文件名（只含摘要与分类清单） */
export const NOTES_INDEX_FILE = 'english-notes.index.json';

/**
 * 构建产物里每篇正文的目录：一篇一个静态文件，打开时按名取。
 * 与笔记目录同名不同层：这个在构建产物里，那个在记录仓库里。
 */
export const NOTES_BODY_DIR = 'english-notes';

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
 *   - `GET /api/english/notes`：全部笔记的**摘要**（每次请求实时读盘，不含正文）；
 *   - `GET /api/english/notes?name=<file>`：单篇「摘要 + 正文」，打开预览 / 保存后只刷这一篇；
 *   - `PUT /api/english/notes`：写回源文件后自动提交该文件。
 * - 构建：索引（分类清单 + 摘要）写进 `english-notes.index.json`，每篇正文单独落成
 *   `english-notes/<文件名>`，供预览与静态部署按需取。
 *
 * 记录仓库默认取与本项目同级目录（`../learn-english`），
 * 可用环境变量 `ENGLISH_RECORDS_DIR` 指定其它路径。
 */
export const englishNotes = (root: string): Plugin => {
  const repoDir = path.resolve(
    process.env.ENGLISH_RECORDS_DIR ?? path.join(root, '..', 'learn-english'),
  );

  /** 是否处于构建：`emitFile` 只在构建期可用，开发期由中间件实时读盘 */
  let isBuild = false;

  return {
    name: 'english-notes',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    async buildStart() {
      if (!isBuild) {
        return;
      }

      const summaries = await collectNoteSummaries(repoDir);

      // 首屏只读索引：分类清单 + 每篇摘要，不含正文
      this.emitFile({
        type: 'asset',
        fileName: NOTES_INDEX_FILE,
        source: JSON.stringify({
          categories: await readCategoryConfig(repoDir),
          notes: summaries,
        }),
      });

      // 正文按篇落成独立静态文件，打开哪篇取哪篇，不再整包下发
      for (const summary of summaries) {
        const note = await readNote(repoDir, summary.name);

        if (!note) {
          continue;
        }

        this.emitFile({
          type: 'asset',
          fileName: `${NOTES_BODY_DIR}/${summary.name}`,
          source: note.content,
        });
      }
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

              // 单篇接口回「摘要 + 正文」：保存后分类、知识点、时间可能一起变，
              // 页面拿到这一份就能原地更新列表里的那条，不用整页重拉。
              res.end(JSON.stringify({ note: toNoteDetail(note) }));

              return;
            }

            res.end(
              JSON.stringify({
                categories: await readCategoryConfig(repoDir),
                notes: await collectNoteSummaries(repoDir),
              }),
            );
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
