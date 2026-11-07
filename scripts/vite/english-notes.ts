import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import type { Dirent } from 'node:fs';
import type { Plugin } from 'vite';

/** 笔记目录（相对记录仓库根目录） */
const NOTES_DIR = 'learning-record-notes';

/** 只收集 Markdown 文件 */
const NOTE_EXTENSION = '.md';

/** 目录级的说明文件不算笔记 */
const EXCLUDED_FILES = new Set(['readme.md']);

/** 一篇笔记的读取结果 */
type NoteSnapshot = {
  /** 文件名，如 errors-back-west-spacing.md */
  name: string;
  /** Markdown 原文 */
  content: string;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
  /** 文件字节数 */
  size: number;
};

/** 返回给前端的完整快照 */
type NotesSnapshot = {
  /** 生成快照的时间（ISO 8601） */
  generatedAt: string;
  /** 记录仓库的绝对路径，页脚会展示 */
  repoPath: string;
  /** 全部笔记，按最后修改时间倒序 */
  notes: NoteSnapshot[];
};

/**
 * 读取一篇笔记；文件在收集过程中消失或不可读时返回 null，
 * 不让单篇失败影响整页。
 */
const readNote = async (dir: string, name: string): Promise<NoteSnapshot | null> => {
  const file = path.join(dir, name);

  try {
    const [content, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);

    return {
      name,
      content,
      updatedAt: info.mtime.toISOString(),
      size: info.size,
    };
  } catch {
    return null;
  }
};

/** 汇总 learning-record-notes 目录下的全部笔记。 */
const collectNotes = async (repoDir: string): Promise<NotesSnapshot> => {
  const dir = path.join(repoDir, NOTES_DIR);

  let entries: Dirent[] = [];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    // 目录不存在时按空笔记集处理，页面会给出空态。
  }

  const names = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(NOTE_EXTENSION) &&
        !EXCLUDED_FILES.has(entry.name.toLowerCase()),
    )
    .map((entry) => entry.name);

  const notes = await Promise.all(names.map((name) => readNote(dir, name)));

  return {
    generatedAt: new Date().toISOString(),
    repoPath: repoDir,
    notes: notes
      .filter((note): note is NoteSnapshot => note !== null)
      .toSorted(
        (a, b) =>
          b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name),
      ),
  };
};

/**
 * 英语笔记插件：把 learn-english 仓库 learning-record-notes 下的 Markdown
 * 以只读 JSON 暴露给前端。
 *
 * - 开发服务器：`GET /api/english/notes` 每次请求实时读盘，
 *   Codex 写完新笔记后刷新页面即可看到。
 * - 构建：作为 `english-notes.json` 资源写进产物，供静态预览使用。
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
        source: JSON.stringify(await collectNotes(repoDir)),
      });
    },
    configureServer(server) {
      // 该中间件先于 /api 代理执行，因此不会落到本机 agent 上。
      server.middlewares.use('/api/english/notes', async (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        try {
          res.end(JSON.stringify(await collectNotes(repoDir)));
        } catch (error) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              message:
                error instanceof Error ? error.message : '读取英语笔记失败',
            }),
          );
        }
      });
    },
  };
};
