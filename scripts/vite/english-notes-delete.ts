/**
 * 删除一篇笔记：md 与它的学习记录两半都在记录仓库里，所以这件事交给记录仓库自己的脚本
 * `skills/learn-from-english/scripts/learning_records.py delete-note`。
 *
 * 为什么不让中间件自己删：记录那一半的写入有它的规矩（文件锁、revision、未掌握 / 已掌握
 * 拆分、原子替换），外部复制一份写回逻辑迟早和源仓库漂移；脚本也是源仓库唯一允许改
 * `learning-records/*.json` 的口子。
 *
 * 这里只做三件事：拼命令、跑一次 python3、把 stdout 的 JSON 收敛成页面要的形状。
 * 提交与推送仍留在 `english-notes-commit.ts`——提交文案与推送状态是本项目这边的约定。
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runPython = promisify(execFile);

/**
 * 记录仓库里那个删除脚本的相对路径（契约 `commands.deleteNote.script` 同一处来源）。
 * 与写入脚本同口径：skill 目录都挂在记录仓库的 `skills/` 下。
 */
export const DELETE_SCRIPT = 'skills/learn-from-english/scripts/learning_records.py';

/**
 * 脚本最长跑多久。
 *
 * 脚本要抢记录库的 `.records.lock`：另一个进程（复习写入）持锁时它会一直等，
 * 不设上限的话这个 HTTP 请求就跟着一起挂住，页面只会看到一个转不完的圈。
 */
const SCRIPT_TIMEOUT_MS = 30_000;

/** 删除结果里的记录：删到一条才有，没删到（本来就没有）为 null */
export type DeletedRecordInfo = {
  /** 记录 ID，如 `errors:a-few-kinds-of-food-plural` */
  id: string;
  /** 被改动的记录文件（相对仓库根目录），如 `learning-records/errors.json` */
  file: string;
  /** 这一条原本在已掌握库里 */
  mastered: boolean;
};

/** 一次删除的结果：md 已删，记录那一半删没删各自交代 */
export type DeletedNote = {
  /** 这条记录是这次一起删掉的；null 表示没有可删的记录 */
  record: DeletedRecordInfo | null;
  /** 这次只删 md、记录按用户要求留着了；没有可保留的记录时为 false */
  recordKept: boolean;
  /** 记录那一半没删成的原因（如记录 ID 与文件名不一致）：md 那时已经删了 */
  recordError?: string;
};

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 把脚本失败的原因翻成一行人话。
 *
 * 脚本用 argparse 报错，原因写在 stderr 最后一行的 `... error: <原因>` 上；
 * 取不到就退回 Node 自己的错误（例如机器上没有 python3）。
 */
const scriptError = (error: unknown): string => {
  // 超时不是脚本自己报的错：stderr 可能是空的，先说清是被谁掐断的
  if (isObject(error) && error.killed === true) {
    return '删除脚本超时（记录库可能正被其它操作占用），请稍后重试';
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

  return error instanceof Error ? error.message : '删除脚本执行失败';
};

/** 收敛脚本 stdout 的 JSON；认不出的结果按失败处理，不猜「应该成功了」 */
const parseDeletedNote = (note: string, stdout: string): DeletedNote => {
  let payload: unknown;

  try {
    payload = JSON.parse(stdout) as unknown;
  } catch {
    throw new Error('删除脚本没有返回可读的结果');
  }

  if (!isObject(payload) || payload.note_deleted !== true) {
    throw new Error('删除脚本没有确认这次删除');
  }

  // 脚本会把它实际删掉的路径回显一遍：对不上说明删的不是我们要求的那个文件
  if (typeof payload.note === 'string' && payload.note !== note) {
    throw new Error('删除脚本报告的路径与请求不一致');
  }

  const rawRecord = isObject(payload.record) ? payload.record : null;
  const record =
    rawRecord && typeof rawRecord.file === 'string' && rawRecord.file
      ? {
          file: rawRecord.file,
          id: typeof rawRecord.id === 'string' ? rawRecord.id : '',
          mastered: rawRecord.mastered === true,
        }
      : null;

  if (rawRecord && record === null) {
    throw new Error('记录已经删掉，但脚本没有告诉改的是哪份文件');
  }

  const recordError =
    typeof payload.record_error === 'string' ? payload.record_error : '';

  return recordError
    ? { record, recordError, recordKept: payload.record_kept === true }
    : { record, recordKept: payload.record_kept === true };
};

/** 删除请求的选项：勾了「只删 Markdown」时保留记录 */
export type DeleteNoteOptions = {
  /** 只删 md，记录留在记录库里；记录仓库回 `record_kept` 表示确实保留了一条 */
  keepRecord?: boolean;
};

/**
 * 让记录仓库的脚本删掉这篇笔记与它的记录。
 *
 * @param repoDir 记录仓库根目录
 * @param note 笔记相对仓库根目录的路径，如 `learning-record-notes/errors/errors-a.md`
 * @param options `keepRecord` 为真时只删 md，记录保留（脚本的 `--keep-record`）
 * @returns md 已删的结果，附带记录删没删 / 保留没保留 / 没删成的原因
 * @throws 路径不合法、笔记不存在、脚本不可用、超时：这类失败发生在删文件之前，md 还在；
 *   只有脚本删完 md 之后写记录时崩掉（极少见）才会出现「抛错但 md 已删」
 */
export const deleteNote = async (
  repoDir: string,
  note: string,
  { keepRecord = false }: DeleteNoteOptions = {},
): Promise<DeletedNote> => {
  let stdout: string;

  try {
    ({ stdout } = await runPython(
      'python3',
      [
        DELETE_SCRIPT,
        'delete-note',
        '--note',
        note,
        ...(keepRecord ? ['--keep-record'] : []),
      ],
      { cwd: repoDir, timeout: SCRIPT_TIMEOUT_MS },
    ));
  } catch (error) {
    throw new Error(scriptError(error));
  }

  return parseDeletedNote(note, stdout);
};
