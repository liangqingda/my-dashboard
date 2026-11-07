/**
 * 把一次手动编辑提交到记录仓库。
 *
 * 只 stage 被编辑的那一个文件，避免把仓库里其它进程的改动一起提交；
 * 提交信息半固定（前缀说明手动编辑 + 文件名，正文固定来源说明）；
 * 失败不阻断保存，只把原因回传前端。
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { NOTE_EXTENSION, NOTES_DIR } from './english-notes-store.js';

const runGit = promisify(execFile);

/** 提交结果：失败不阻断保存，原样把原因带回前端 */
export type CommitResult = {
  /** 提交短 hash */
  hash?: string;
  /** 提交标题 */
  subject?: string;
  /** 提交失败原因 */
  error?: string;
};

/** 读取错误对象上的 stdout / stderr 文本 */
const readField = (value: object, key: string): string => {
  if (!(key in value)) {
    return '';
  }

  const field = (value as Record<string, unknown>)[key];

  return typeof field === 'string' ? field : '';
};

/** 取 git 命令的全部输出（git 会把提示写到 stdout，不能只看 stderr） */
const gitOutput = (error: unknown): string =>
  typeof error === 'object' && error !== null
    ? [readField(error, 'stdout'), readField(error, 'stderr')].join('\n')
    : '';

/** 取消息的第一段非空行，用作给用户看的失败原因 */
const firstLine = (text: string, fallback: string): string =>
  text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? fallback;

export const commitNote = async (
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
      [
        'commit',
        '-m',
        subject,
        '-m',
        '通过 my-dashboard 的 Markdown 预览弹窗保存',
        // 带 pathspec：只提交这一个文件，不把 index 里别的预暂存改动捎上
        '--',
        relative,
      ],
      { cwd: repoDir },
    );

    const { stdout } = await runGit('git', ['log', '-1', '--format=%h'], {
      cwd: repoDir,
    });

    return { hash: stdout.trim(), subject };
  } catch (error) {
    const output = gitOutput(error);

    if (output.includes('nothing to commit')) {
      return {};
    }

    // 提交没成功就把这一条从暂存区撤掉，别给用户留脏 index
    try {
      await runGit('git', ['reset', '-q', '--', relative], { cwd: repoDir });
    } catch {
      // 撤暂存失败也不影响保存结果，只是 index 会留着这条改动
    }

    return { error: firstLine(output, '提交失败') };
  }
};
