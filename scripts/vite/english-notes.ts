import path from 'node:path';

import type { IncomingMessage as HttpRequest } from 'node:http';
import type { Plugin } from 'vite';

import { commitNote, commitNoteDeletion } from './english-notes-commit.js';
import { assertContract } from './english-notes-contract.js';
import { deleteNote, DELETE_SCRIPT } from './english-notes-delete.js';
import { writeNoteFile, NOTE_SCRIPT } from './english-notes-write.js';
import {
  CATEGORY_CONFIG_FILE,
  NOTES_DIR,
  collectNoteSummaries,
  isNoteName,
  readCategoryConfig,
  readNote,
  toNoteDetail,
} from './english-notes-store.js';

import type { RepoExpectation } from './english-notes-contract.js';

/** 构建产物里列表索引的文件名（只含摘要与分类清单） */
export const NOTES_INDEX_FILE = 'english-notes.index.json';

/**
 * 构建产物里每篇正文的目录：一篇一个静态文件，打开时按名取。
 * 与笔记目录同名不同层：这个在构建产物里，那个在记录仓库里。
 */
export const NOTES_BODY_DIR = 'english-notes';

/**
 * 本项目对记录仓库的要求：`contract.json` 必须与这套值逐项一致。
 *
 * 各值都来自对应模块的真实常量，这里只做组装，不再抄第二份——
 * 契约和「实际会跑什么」之间不能有第三个版本。
 */
const CONTRACT_EXPECTATION: RepoExpectation = {
  python: 'python3',
  notesDir: NOTES_DIR,
  categoriesFile: `${NOTES_DIR}/${CATEGORY_CONFIG_FILE}`,
  writeNote: { script: NOTE_SCRIPT, args: ['write'] },
  deleteNote: { script: DELETE_SCRIPT, args: ['delete-note'] },
};

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 把删除失败的原因翻成页面能直接显示的一句话。
 *
 * 删除动作在记录仓库的脚本里，它报错是英文（argparse 的原文）；这里按原因归类，
 * 认得出的一律给中文，认不出的保留原文并加前缀，不把英文句子直接丢给用户。
 */
const deleteFailureMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : '';

  // 本项目自己抛的原因本来就是中文，原样给出去
  if (/^[\u4e00-\u9fa5]/u.test(message)) {
    return message;
  }

  if (/^note does not exist/u.test(message)) {
    return '这篇笔记已经不在了';
  }

  if (/^cannot read note categories/u.test(message)) {
    return '读不到笔记分类清单，已拒绝删除';
  }

  if (/^note (must|directory|file name)/u.test(message)) {
    return '这个文件不允许删除';
  }

  return message ? `删除失败：${message}` : '删除英语笔记失败';
};

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
 *   - `PUT /api/english/notes`：写回源文件后自动提交该文件；
 *   - `DELETE /api/english/notes?name=<file>`：删掉这一篇 md 与它的学习记录，提交并推送。
 * - 构建：索引（分类清单 + 摘要）写进 `english-notes.index.json`，每篇正文单独落成
 *   `english-notes/<文件名>`，供预览与静态部署按需取。
 *
 * 记录仓库默认取与本项目同级目录（`../learn-english`），
 * 可用环境变量 `ENGLISH_RECORDS_DIR` 指定其它路径。读盘 / 写盘前先比一遍记录仓库的
 * `contract.json`：两边契约（版本、笔记目录、分类清单、写删命令）对不上就如实报出来。
 */
export const englishNotes = (root: string): Plugin => {
  const repoDir = path.resolve(
    process.env.ENGLISH_RECORDS_DIR ?? path.join(root, '..', 'learn-english'),
  );

  /** 是否处于构建：`emitFile` 只在构建期可用，开发期由中间件实时读盘 */
  let isBuild = false;

  /**
   * 核对记录仓库契约，返回不一致的原因；一致返回 null。
   *
   * 每次请求都读一遍：契约文件只有几行，比一次笔记读盘便宜得多，换来的是记录仓库那边
   * 改契约后页面立刻报差异，而不是等下次重启才发现。
   */
  const contractIssue = async (): Promise<string | null> => {
    try {
      await assertContract(repoDir, CONTRACT_EXPECTATION);

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : '记录仓库契约核对失败';
    }
  };

  return {
    name: 'english-notes',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    async buildStart() {
      if (!isBuild) {
        return;
      }

      // 构建产物整份来自记录仓库：契约对不上就把构建停下来，
      // 别把「读空了 / 读歪了」的快照发布出去
      await assertContract(repoDir, CONTRACT_EXPECTATION);

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
    async configureServer(server) {
      const issue = await contractIssue();

      if (issue !== null) {
        // 不拦整台工作台：服务页等其它页面照常可用，只在英语接口上如实报原因
        server.config.logger.warn(`[english-notes] ${issue}`);
      }

      // 该中间件先于 /api 代理执行，因此不会落到本机 agent 上。
      server.middlewares.use('/api/english/notes', async (req, res, next) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        // 契约对不上时，读盘会「正常但为空」、写盘会跑错命令：先把原因说清再谈数据
        const currentIssue = await contractIssue();

        if (currentIssue !== null) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: currentIssue }));

          return;
        }

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

            // 名字先按本项目的笔记路径规则过一遍：脚本也会校验，但那要起进程，
            // 明显不合法的请求没必要跑一趟
            if (!isNoteName(name)) {
              throw new Error('这个文件不允许写入');
            }

            // 整篇正文交给记录仓库的笔记脚本写：它在锁内落盘并校验，
            // 校验不过就回滚并把问题行带回来，本项目不自己检查 md 格式
            await writeNoteFile(repoDir, `${NOTES_DIR}/${name}`, content);

            const saved = await readNote(repoDir, name);

            if (!saved) {
              throw new Error('写入后读不到这篇笔记');
            }

            const commit = await commitNote(repoDir, name);

            res.end(
              JSON.stringify({ commit, name, updatedAt: saved.updatedAt }),
            );
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

        // 删除一篇笔记：md 与它的学习记录一起删，删完提交并推送。
        if (req.method === 'DELETE') {
          try {
            const name = nameFromUrl(req.url);

            if (!name) {
              throw new Error('缺少文件名');
            }

            // 名字先在本项目按笔记路径规则过一遍：脚本也会再校验，但那一步
            // 要起进程才能拿到结果，明显不合法的请求没必要跑一趟
            if (!isNoteName(name)) {
              throw new Error('这个文件不允许删除');
            }

            // md 与它的记录都由记录仓库的脚本删：这里只负责让它跑起来、
            // 再把「记录删没删」原样带回页面，不自己碰记录 JSON
            const { record, recordError } = await deleteNote(
              repoDir,
              `${NOTES_DIR}/${name}`,
            );

            const commit = await commitNoteDeletion(
              repoDir,
              name,
              record?.file,
            );

            res.end(JSON.stringify({ commit, name, record, recordError }));
          } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: deleteFailureMessage(error) }));
          }

          return;
        }

        next();
      });
    },
  };
};
