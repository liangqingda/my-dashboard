/**
 * 删除一条记录：这件事交给记录仓库自己的脚本
 * `skills/learn-from-english/scripts/learning_records.py delete-record`。
 *
 * 为什么不让中间件自己改 JSON：记录库里有一条记录可能落在学习 / 已掌握两个目录、
 * 还有文件锁、revision 与原子替换、复习领取凭据要一起作废，外部复制一份写回逻辑迟早跟源仓库漂移。
 *
 * 这里只做三件事：拼命令、跑一次 python3、把 stdout 的 JSON 收敛成页面要的形状。
 * 提交与推送留在 `english-notes-commit.ts`（与本项目其它写操作同一套约定）。
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runPython = promisify(execFile);

/** 记录仓库里那个脚本的相对路径（契约 `commands.deleteRecord.script` 同一处来源） */
export const RECORD_SCRIPT =
  'skills/learn-from-english/scripts/learning_records.py';

/**
 * 脚本最长跑多久：它要抢记录库的 `.records.lock`，另一个进程持锁时会一直等，
 * 不设上限这个 HTTP 请求就跟着挂住，页面只剩一个转不完的圈。
 */
const SCRIPT_TIMEOUT_MS = 30_000;

/** 删除成功后的记录信息：记录原本落在哪个目录、标题是什么 */
export type DeletedRecord = {
  /** 记录 ID，如 `grammar:present-perfect` */
  id: string;
  /** 分类键 */
  category: string;
  /** 删除前的状态 */
  status: string;
  /** 删除前的标题 */
  title: string;
  /** 被改动的记录文件（相对仓库根目录），如 `learning-records/grammar.json` */
  file: string;
  /** 同知识点的笔记还在时的路径（脚本只删记录、不动笔记）；没有笔记为 null */
  noteFile: string | null;
};

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 把脚本失败的原因翻成一行人话。
 * 脚本用 argparse 报错，原因写在 stderr 最后一行的 `... error: <原因>` 上；
 * 取不到就退回 Node 自己的错误（例如机器上没有 python3）。
 */
const scriptError = (error: unknown): string => {
  if (isObject(error) && error.killed === true) {
    return '删除脚本超时（记录库可能正被其它操作占用），请稍后重试';
  }

  const stderr =
    isObject(error) && typeof error.stderr === 'string' ? error.stderr : '';

  if (stderr.trim()) {
    const lines = stderr.trim().split('\n');
    const last = lines[lines.length - 1]?.replace(/^.*?error:\s*/u, '').trim();

    if (last) {
      // 记录本来就没了：页面提示「已经不在了」，不是一次失败
      if (/^record does not exist/u.test(last)) {
        return '这条记录已经不在了，可能刚被其它操作删掉';
      }

      return last;
    }
  }

  return error instanceof Error ? error.message : '删除脚本执行失败';
};

/** 收敛脚本 stdout 的 JSON；认不出的结果按失败处理，不猜「应该成功了」 */
const parseDeletedRecord = (id: string, stdout: string): DeletedRecord => {
  let payload: unknown;

  try {
    payload = JSON.parse(stdout) as unknown;
  } catch {
    throw new Error('删除脚本没有返回可读的结果');
  }

  if (!isObject(payload) || payload.deleted !== true) {
    throw new Error('删除脚本没有确认这次删除');
  }

  // 脚本会把实际删掉的 ID 回显一遍：对不上说明删的不是我们要求的那条
  if (typeof payload.id === 'string' && payload.id !== id) {
    throw new Error('删除脚本报告的记录与请求不一致');
  }

  const category = typeof payload.category === 'string' ? payload.category : '';
  const file = typeof payload.file === 'string' ? payload.file : '';

  if (!category || !file) {
    throw new Error('记录已经删掉，但脚本没有告诉改的是哪份文件');
  }

  return {
    category,
    file,
    id,
    noteFile:
      typeof payload.note_file === 'string' && payload.note_file
        ? payload.note_file
        : null,
    status: typeof payload.status === 'string' ? payload.status : '',
    title: typeof payload.title === 'string' ? payload.title : '',
  };
};

/**
 * 让记录仓库的脚本删掉一条记录（笔记文件不动）。
 *
 * @param repoDir 记录仓库根目录
 * @param id 记录 ID，如 `grammar:present-perfect`
 * @returns 删掉的记录与它原本所在的文件
 * @throws ID 不合法、记录不存在、脚本不可用、超时：这类失败发生在改动之前
 */
export const deleteRecord = async (
  repoDir: string,
  id: string,
): Promise<DeletedRecord> => {
  let stdout: string;

  try {
    ({ stdout } = await runPython(
      'python3',
      [RECORD_SCRIPT, 'delete-record', '--id', id],
      { cwd: repoDir, timeout: SCRIPT_TIMEOUT_MS },
    ));
  } catch (error) {
    throw new Error(scriptError(error));
  }

  return parseDeletedRecord(id, stdout);
};
