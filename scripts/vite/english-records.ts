import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Plugin } from 'vite';

/**
 * learn-english 仓库中可以出现在页面上的记录分类。
 * 顺序即页面索引栏的展示顺序。
 */
const CATEGORIES = [
  'errors',
  'vocabulary',
  'phrases',
  'grammar',
  'usage',
  'pronunciation',
] as const;

/** 单个分类的原始文件内容；读取失败时为 null。 */
type CategorySnapshot = {
  /** 分类标识，如 errors */
  category: string;
  /** learning-records/<category>.json 原文解析结果 */
  learning: unknown;
  /** mastered-learning-records/<category>.json 原文解析结果 */
  mastered: unknown;
};

/** 返回给前端的完整快照，原样保留仓库里的 JSON 结构。 */
type RecordsSnapshot = {
  /** 生成快照的时间（ISO 8601） */
  generatedAt: string;
  /** 记录仓库的绝对路径，页脚会展示 */
  repoPath: string;
  /** 各分类的原始数据 */
  categories: CategorySnapshot[];
};

/**
 * 读取并解析一个 JSON 文件；文件缺失或格式损坏时返回 null，
 * 让页面缺少某个分类时仍然可用。
 */
const readJson = async (file: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as unknown;
  } catch {
    return null;
  }
};

/** 汇总仓库下所有分类的学习记录。 */
const collectSnapshot = async (repoDir: string): Promise<RecordsSnapshot> => {
  const categories = await Promise.all(
    CATEGORIES.map(async (category) => ({
      category,
      learning: await readJson(
        path.join(repoDir, 'learning-records', `${category}.json`),
      ),
      mastered: await readJson(
        path.join(repoDir, 'mastered-learning-records', `${category}.json`),
      ),
    })),
  );

  return {
    generatedAt: new Date().toISOString(),
    repoPath: repoDir,
    categories,
  };
};

/**
 * 英语记录插件：把 learn-english 仓库的学习记录以只读 JSON 暴露给前端。
 *
 * - 开发服务器：`GET /api/english/records` 每次请求实时读盘，
 *   Codex 新增记录后刷新页面即可看到，无需重启。
 * - 构建：作为 `english-records.json` 资源写进产物，供静态预览使用。
 *
 * 记录仓库默认取与本项目同级目录（`../learn-english`），
 * 可用环境变量 `ENGLISH_RECORDS_DIR` 指定其它路径。
 */
export const englishRecords = (root: string): Plugin => {
  const repoDir = path.resolve(
    process.env.ENGLISH_RECORDS_DIR ?? path.join(root, '..', 'learn-english'),
  );

  return {
    name: 'english-records',
    async buildStart() {
      this.emitFile({
        type: 'asset',
        fileName: 'english-records.json',
        source: JSON.stringify(await collectSnapshot(repoDir)),
      });
    },
    configureServer(server) {
      // 该中间件先于 /api 代理执行，因此不会落到本机 agent 上。
      server.middlewares.use('/api/english/records', async (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        try {
          res.end(JSON.stringify(await collectSnapshot(repoDir)));
        } catch (error) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              message:
                error instanceof Error
                  ? error.message
                  : '读取英语学习记录失败',
            }),
          );
        }
      });
    },
  };
};
