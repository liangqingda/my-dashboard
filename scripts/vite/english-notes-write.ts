/**
 * 保存一篇笔记：整篇正文交给记录仓库的笔记脚本写。
 *
 * 为什么不在中间件直接 `writeFile`：笔记有格式规则（模板、折叠块、索引块、追踪行），
 * 由 `skills/take-english-study-notes/scripts/note.py write` 在锁内「落盘 → 校验 → 不过就回滚」
 * 才是唯一合法入口；本项目自己写盘等于绕过校验，畸形 md 会直接进仓库。
 *
 * 这里只做三件事：把正文落到临时文件、跑脚本、把校验问题拼成一行人话。
 * 提交仍留在 `english-notes-commit.ts`。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const runPython = promisify(execFile);

/**
 * 记录仓库里那个笔记脚本的相对路径（契约 `commands.writeNote.script` 同一处来源）。
 * skill 目录统一收在记录仓库的 `skills/` 下，路径前缀必须带上，否则契约核对会直接失败。
 */
export const NOTE_SCRIPT = 'skills/take-english-study-notes/scripts/note.py';

/** 校验器报的一处问题：行号 + 说明 */
export type NoteIssue = {
  line: number;
  message: string;
};

/** 保存结果：脚本说写进去了，以及校验器给出的合规状态 */
export type NoteWriteResult = {
  /** 最终是否落盘；校验未过时为 false，正文已回滚 */
  written: boolean;
  /** 校验状态：`valid` / `invalid` / `unverified`（校验器不可用） */
  status: string;
};

/** 拼进报错提示的问题条数上限：再多页面也读不完 */
const MAX_ISSUES = 3;

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 取校验报告里的问题；取不到就当作没有细节 */
const readIssues = (payload: unknown): NoteIssue[] => {
  if (!isObject(payload) || !isObject(payload.check)) {
    return [];
  }

  const issues = Array.isArray(payload.check.issues) ? payload.check.issues : [];

  return issues.flatMap((item) => {
    if (!isObject(item) || typeof item.message !== 'string') {
      return [];
    }

    return [
      {
        line: typeof item.line === 'number' ? item.line : 0,
        message: item.message,
      },
    ];
  });
};

/**
 * 把校验问题拼成一行人话：`第 12 行：…；第 30 行：…`。
 *
 * 行号是脚本按落盘文件给的，指向用户刚改的那段正文，所以直接展示。
 */
export const describeIssues = (issues: NoteIssue[]): string => {
  const shown = issues.slice(0, MAX_ISSUES).map((issue) => {
    return issue.line > 0
      ? `第 ${issue.line} 行：${issue.message}`
      : issue.message;
  });
  const rest = issues.length - shown.length;

  return rest > 0 ? `${shown.join('；')}（另有 ${rest} 处问题）` : shown.join('；');
};

/**
 * 读脚本失败时带回来的结果：校验不过的 JSON 在 stdout，直接报错的 JSON 在 stderr。
 * 两处都解析不出就返回 null，交给 stderr 最后一行兜底。
 */
const readFailurePayload = (error: unknown): unknown => {
  if (!isObject(error)) {
    return null;
  }

  for (const stream of [error.stdout, error.stderr]) {
    if (typeof stream !== 'string' || !stream.trim().startsWith('{')) {
      continue;
    }

    try {
      return JSON.parse(stream) as unknown;
    } catch {
      // 这一段不是 JSON（例如带 traceback），换下一段
    }
  }

  return null;
};

/** 脚本直接报错（路径不对、脚本不可用）时的原因：取 JSON 里的 error 或 stderr 最后一行 */
const scriptError = (error: unknown, payload: unknown): string => {
  if (isObject(payload) && typeof payload.error === 'string') {
    return payload.error;
  }

  const stderr =
    isObject(error) && typeof error.stderr === 'string' ? error.stderr : '';

  if (stderr.trim()) {
    const lines = stderr.trim().split('\n');
    const last = lines[lines.length - 1]?.replace(/^.*?error:\s*/u, '').trim();

    if (last) {
      return last;
    }
  }

  return error instanceof Error ? error.message : '保存失败';
};

/**
 * 让记录仓库的笔记脚本整篇写入这篇笔记。
 *
 * @param repoDir 记录仓库根目录
 * @param note 笔记相对仓库根目录的路径，如 `learning-record-notes/errors/errors-a.md`
 * @param content 整篇 Markdown 正文
 * @returns 脚本是否落盘、校验状态
 * @throws 路径不合法、校验未通过（正文已回滚）、脚本不可用时抛错，消息可直接给用户看
 */
export const writeNoteFile = async (
  repoDir: string,
  note: string,
  content: string,
): Promise<NoteWriteResult> => {
  const directory = await mkdtemp(path.join(tmpdir(), 'my-dashboard-note-'));
  const draft = path.join(directory, 'note.md');

  try {
    await writeFile(draft, content, 'utf8');

    const { stdout } = await runPython(
      'python3',
      [NOTE_SCRIPT, 'write', '--file', note, '--content-file', draft],
      {
        cwd: repoDir,
        env: { ...process.env, LEARN_ENGLISH_REPO_ROOT: repoDir },
      },
    );
    const payload = JSON.parse(stdout) as unknown;

    return {
      status: isObject(payload) && typeof payload.note_status === 'string'
        ? payload.note_status
        : 'unverified',
      written: isObject(payload) ? payload.written !== false : true,
    };
  } catch (error) {
    const payload = readFailurePayload(error);
    const issues = readIssues(payload);

    if (issues.length > 0) {
      throw new Error(`笔记校验未通过，已撤销保存。${describeIssues(issues)}`);
    }

    throw new Error(scriptError(error, payload));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};
