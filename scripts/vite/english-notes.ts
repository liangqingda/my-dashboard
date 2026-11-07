import { execFile } from 'node:child_process';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { Dirent } from 'node:fs';
import type { IncomingMessage as HttpRequest } from 'node:http';
import type { Plugin } from 'vite';

/** 笔记目录（相对记录仓库根目录） */
const NOTES_DIR = 'learning-record-notes';

/** 只收集 Markdown 文件 */
const NOTE_EXTENSION = '.md';

/** 目录级的说明文件不算笔记，也不允许写 */
const EXCLUDED_FILES = new Set(['readme.md']);

/** 笔记文件名只能是这种形态，避免路径穿越 */
const NOTE_NAME_PATTERN = /^[\w.-]+\.md$/u;

const runGit = promisify(execFile);

/** 自动提交失败不阻断保存，原样把原因带回前端 */
type CommitResult = {
  /** 提交短 hash */
  hash?: string;
  /** 提交标题 */
  subject?: string;
  /** 提交失败原因 */
  error?: string;
};

/**
 * 把本次保存的笔记提交到记录仓库。
 *
 * 只 stage 这一个文件，避免把仓库里其它进程的改动一起提交；提交信息半固定，
 * 前半段说明是手动编辑、带上文件名，后半段是固定来源说明。
 */
const commitNote = async (
  repoDir: string,
  name: string,
): Promise<CommitResult> => {
  const relative = `${NOTES_DIR}/${name}`;
  const subject = `docs(notes): 手动编辑 ${path.basename(name, NOTE_EXTENSION)}`;

  try {
    await runGit('git', ['add', '--', relative], { cwd: repoDir });

    // 内容没有实际变化时不产生空提交
    const { stdout: staged } = await runGit(
      'git',
      ['diff', '--cached', '--name-only', '--', relative],
      { cwd: repoDir },
    );

    if (!staged.trim()) {
      return {};
    }

    await runGit(
      'git',
      ['commit', '-m', subject, '-m', '通过 my-dashboard 的 Markdown 预览弹窗保存'],
      { cwd: repoDir },
    );

    const { stdout } = await runGit('git', ['log', '-1', '--format=%h'], {
      cwd: repoDir,
    });

    return { hash: stdout.trim(), subject };
  } catch (error) {
    const output =
      typeof error === 'object' && error !== null
        ? [readField(error, 'stdout'), readField(error, 'stderr')].join('\n')
        : '';

    if (output.includes('nothing to commit')) {
      return {};
    }

    const firstLine = output
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    return { error: firstLine ?? '提交失败' };
  }
};

/** 读取错误对象上的 stdout / stderr 文本 */
const readField = (value: object, key: string): string => {
  if (!(key in value)) {
    return '';
  }

  const field = (value as Record<string, unknown>)[key];

  return typeof field === 'string' ? field : '';
};

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
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        if (req.method === 'GET') {
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

          return;
        }

        // 把编辑后的 Markdown 写回源文件；只允许写学习笔记目录下已存在的笔记。
        if (req.method === 'PUT') {
          try {
            const payload = await readJsonBody(req);

            if (!isObject(payload)) {
              throw new Error('请求体格式不正确');
            }

            const name = payload.name;
            const content = payload.content;

            if (
              typeof name !== 'string' ||
              !NOTE_NAME_PATTERN.test(name) ||
              EXCLUDED_FILES.has(name.toLowerCase())
            ) {
              throw new Error('这个文件不允许写入');
            }

            if (typeof content !== 'string') {
              throw new Error('正文必须是字符串');
            }

            const dir = path.resolve(repoDir, NOTES_DIR);
            const file = path.resolve(dir, name);

            if (!file.startsWith(`${dir}${path.sep}`)) {
              throw new Error('这个文件不允许写入');
            }

            await writeFile(file, content, 'utf8');

            const info = await stat(file);
            const commit = await commitNote(repoDir, name);

            res.end(
              JSON.stringify({
                commit,
                name,
                updatedAt: info.mtime.toISOString(),
                size: info.size,
              }),
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

        next();
      });
    },
  };
};
