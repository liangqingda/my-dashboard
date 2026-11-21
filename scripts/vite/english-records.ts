/**
 * 复习库插件：把 learn-english 的两个记录目录暴露给前端，并让页面能删掉一条记录。
 *
 * - 开发服务器：
 *   - `GET /api/english/records`：分类清单 + 每条记录的**摘要**（按更新时间倒序，不含讲解正文）；
 *   - `GET /api/english/records?id=<id>`：这一条「摘要 + 详情」，只打开某条时才取；
 *   - `DELETE /api/english/records?id=<id>`：交记录仓库的 `delete-record` 删记录（笔记不动），
 *     删完提交并推送。
 * - 构建：索引（分类清单 + 摘要）写进 `english-records.index.json`，每条详情单独落成
 *   `english-records/<category>/<key>.json`，静态部署时按需取。
 *
 * 读盘 / 删除前先比一遍记录仓库的 `contract.json`：契约版本、记录目录与删除命令对不上就如实报出来。
 */

import type { Plugin } from 'vite';

import { contractIssue, repoDirOf } from './english-contract.js';
import { commitRecordDeletion } from './english-notes-commit.js';
import { readCategoryConfig } from './english-notes-store.js';
import { deleteRecord } from './english-records-delete.js';
import {
  collectRecordDetails,
  collectRecordSummaries,
  isRecordId,
  readRecordDetail,
  recordDetailPath,
  toRecordSummary,
} from './english-records-store.js';

/** 构建产物里列表索引的文件名（分类清单 + 摘要） */
export const RECORDS_INDEX_FILE = 'english-records.index.json';

/** 构建产物里每条详情所在的目录（与前端拼 URL 的口径一致） */
export const RECORDS_DETAIL_DIR = 'english-records';

/** 从 `?id=` 取记录 ID；没带参数返回 null */
const idFromUrl = (url: string | undefined): string | null => {
  const query = url?.split('?')[1] ?? '';
  const value = new URLSearchParams(query).get('id');

  return value && value.length > 0 ? value : null;
};

/**
 * 复习库插件：读盘走 `english-records-store.ts`，删除走记录仓库脚本，
 * 提交文案与推送状态留在 `english-notes-commit.ts`。
 */
export const englishRecords = (root: string): Plugin => {
  const repoDir = repoDirOf(root);

  /** 是否处于构建：`emitFile` 只在构建期可用，开发期由中间件实时读盘 */
  let isBuild = false;

  return {
    name: 'english-records',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    async buildStart() {
      if (!isBuild) {
        return;
      }

      // 契约对不上就停下构建：别把「读空了 / 读歪了」的复习库快照发布出去
      const issue = await contractIssue(repoDir);

      if (issue !== null) {
        throw new Error(issue);
      }

      const details = await collectRecordDetails(repoDir);

      this.emitFile({
        fileName: RECORDS_INDEX_FILE,
        source: JSON.stringify({
          categories: await readCategoryConfig(repoDir),
          records: details.map(toRecordSummary),
        }),
        type: 'asset',
      });

      for (const detail of details) {
        this.emitFile({
          fileName: `${RECORDS_DETAIL_DIR}/${recordDetailPath(detail.id)}`,
          source: JSON.stringify(detail),
          type: 'asset',
        });
      }
    },
    async configureServer(server) {
      const issue = await contractIssue(repoDir);

      if (issue !== null) {
        server.config.logger.warn(`[english-records] ${issue}`);
      }

      // 与笔记接口同层的中间件；在 `/api` 代理之前执行，不会落到本机 agent 上
      server.middlewares.use('/api/english/records', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        // 契约对不上时读盘会「正常但为空」、删除会跑错命令：先把原因说清再谈数据
        const currentIssue = await contractIssue(repoDir);

        if (currentIssue !== null) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: currentIssue }));

          return;
        }

        if (req.method === 'GET') {
          const id = idFromUrl(req.url);

          try {
            if (id) {
              const detail = await readRecordDetail(repoDir, id);

              if (detail === null) {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: '这条记录不存在' }));

                return;
              }

              res.end(JSON.stringify({ record: detail }));

              return;
            }

            res.end(
              JSON.stringify({
                categories: await readCategoryConfig(repoDir),
                records: await collectRecordSummaries(repoDir),
              }),
            );
          } catch (error) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                message:
                  error instanceof Error ? error.message : '读取记录失败',
              }),
            );
          }

          return;
        }

        if (req.method === 'DELETE') {
          try {
            const id = idFromUrl(req.url);

            if (!id) {
              throw new Error('缺少记录 ID');
            }

            // 明显不合法的 ID 不跑脚本：脚本也会校验，但那要起一次进程
            if (!isRecordId(id)) {
              throw new Error('这个记录 ID 不合法');
            }

            const record = await deleteRecord(repoDir, id);

            // 记录删掉了才提交：只 stage 脚本改掉的那份记录文件，提交后推送
            const commit = await commitRecordDeletion(
              repoDir,
              record.file,
              record.id,
            );

            res.end(JSON.stringify({ commit, record }));
          } catch (error) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                message:
                  error instanceof Error ? error.message : '删除记录失败',
              }),
            );
          }

          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ message: '不支持的请求方法' }));
      });
    },
  };
};
