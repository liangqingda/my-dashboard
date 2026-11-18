/**
 * 把一次操作提交到记录仓库。
 *
 * 只 stage 本次涉及的那几个文件，避免把仓库里其它进程的改动一起提交；
 * 提交信息半固定（前缀说明操作 + 文件名，正文固定来源说明）；
 * 失败不阻断操作本身，只把原因回传前端。
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { NOTE_EXTENSION, NOTES_DIR } from './english-notes-store.js';

const runGit = promisify(execFile);

/** 提交结果：失败不阻断保存 / 删除，原样把原因带回前端 */
export type CommitResult = {
  /** 提交短 hash */
  hash?: string;
  /** 提交标题 */
  subject?: string;
  /** 提交失败原因 */
  error?: string;
  /** 删除后是否推送成功（只在删除流程里给） */
  pushed?: boolean;
  /** 没有推送成的原因：没配上游分支，或 git push 自己报的错 */
  pushError?: string;
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

/**
 * 推送记录仓库：没配上游分支时不算失败，明确说明跳过。
 *
 * 只在删除流程里用（见 `commitNoteDeletion`）：手动保存只提交、不替用户推送，
 * 删除同时改掉了 md 与记录两处文件，删完把这次提交推上去，远端才不会还留着一篇已经不存在的笔记。
 *
 * @param repoDir 记录仓库根目录
 * @returns 是否推成功；失败时带回 git 自己报的第一行原因
 */
const pushRepo = async (
  repoDir: string,
): Promise<{ pushed: boolean; pushError?: string }> => {
  try {
    await runGit(
      'git',
      ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
      { cwd: repoDir },
    );
  } catch {
    return { pushed: false, pushError: '没有配置上游分支，已跳过推送' };
  }

  try {
    await runGit('git', ['push'], { cwd: repoDir });

    return { pushed: true };
  } catch (error) {
    return { pushed: false, pushError: firstLine(gitOutput(error), '推送失败') };
  }
};

/**
 * 提交一次删除：笔记 md 与它的记录文件一起提交，提交完再推送。
 *
 * - md 已经被删掉，`git add -- 路径` 会把这次删除记进暂存区；
 * - 带 pathspec 提交：只提交这两个文件，不把 index 里别的预暂存改动捎上；
 * - 提交成功才推送；没有可提交内容时不产生空提交，也不推空；
 * - 失败不阻断删除本身（文件已经删掉了），只把原因回传前端。
 *
 * @param repoDir 记录仓库根目录
 * @param name 笔记相对路径，如 errors/errors-a.md
 * @param recordFile 记录文件相对仓库根目录的路径；这次没删到记录时不传
 * @param options `noteDeleted` 为假表示只删了记录（md 还在）：不 stage md，提交标题按「记录」写
 */
export const commitNoteDeletion = async (
  repoDir: string,
  name: string,
  recordFile?: string,
  { noteDeleted = true }: { noteDeleted?: boolean } = {},
): Promise<CommitResult> => {
  const relative = `${NOTES_DIR}/${name}`;
  const stem = path.basename(name, NOTE_EXTENSION);
  const paths = [
    ...(noteDeleted ? [relative] : []),
    ...(recordFile ? [recordFile] : []),
  ];
  const subject = noteDeleted
    ? `docs(notes): 删除 ${stem}`
    : `docs(records): 删除 ${stem} 的学习记录`;

  try {
    await runGit('git', ['add', '--', ...paths], { cwd: repoDir });

    const { stdout: staged } = await runGit(
      'git',
      ['diff', '--cached', '--name-only', '--', ...paths],
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
        '通过 my-dashboard 的 Markdown 预览弹窗删除',
        '--',
        ...paths,
      ],
      { cwd: repoDir },
    );

    const { stdout } = await runGit('git', ['log', '-1', '--format=%h'], {
      cwd: repoDir,
    });

    return { hash: stdout.trim(), subject, ...(await pushRepo(repoDir)) };
  } catch (error) {
    const output = gitOutput(error);

    // 提交没成功就把这几个路径从暂存区撤掉，别给用户留脏 index
    try {
      await runGit('git', ['reset', '-q', '--', ...paths], { cwd: repoDir });
    } catch {
      // 撤暂存失败不影响删除结果，只是 index 会留着这次改动
    }

    return { error: firstLine(output, '提交失败') };
  }
};
