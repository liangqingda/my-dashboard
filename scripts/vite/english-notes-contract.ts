/**
 * 记录仓库契约：learn-english 在仓库根的 `contract.json` 里声明本项目依赖的那几件事
 * （契约版本、笔记目录、分类清单、两个写 / 删命令）。
 *
 * 为什么先比一遍而不是直接拿来用：两边是各自独立的仓库，值一旦不一致，读盘会「正常但为空」、
 * 写盘会跑错命令，页面只看得到空白，根因却藏在两个仓库中间。这里在启动 / 构建时对一次，
 * 对不上就把差异逐条说出来。
 *
 * 期望值由调用方（`english-notes.ts`）按各模块的真实常量组装后传进来：本文件不导入同目录模块，
 * 单测才能直接用 Node 的类型擦除跑起来。
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** 契约文件（相对记录仓库根目录） */
export const CONTRACT_FILE = 'contract.json';

/** 本项目实现的契约版本：记录仓库改契约时同步改这里，并跟进传进来的期望值 */
export const CONTRACT_VERSION = 1;

/** 一条命令的声明：跑哪个脚本、第一个参数是哪个子命令 */
export type ContractCommand = {
  script: string;
  args: string[];
};

/** 本项目对记录仓库的要求：契约里必须逐项声明同一套值 */
export type RepoExpectation = {
  python: string;
  notesDir: string;
  categoriesFile: string;
  writeNote: ContractCommand;
  deleteNote: ContractCommand;
};

/** 判断解析后的 JSON 是不是普通对象 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 取一个非空字符串字段；其它一律当作缺失 */
const readText = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** 取参数数组；只要有一项不是非空字符串就当作缺失 */
const readArgs = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const args = value.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );

  return args.length === value.length ? args : null;
};

/** 取一条命令声明；脚本或参数缺失返回 null */
const readCommand = (raw: unknown): ContractCommand | null => {
  if (!isObject(raw)) {
    return null;
  }

  const script = readText(raw.script);
  const args = readArgs(raw.args);

  return script !== null && args !== null ? { script, args } : null;
};

/** 一项差异：契约里的值与本项目的不一致；相同时返回 null */
const diff = (
  label: string,
  actual: string | null,
  expected: string,
): string | null =>
  actual === expected
    ? null
    : `${label}（契约 ${actual ?? '缺失'} / 本项目 ${expected}）`;

/** 把非空的差异收进问题列表 */
const addProblem = (problems: string[], problem: string | null): void => {
  if (problem !== null) {
    problems.push(problem);
  }
};

/** 两边命令声明对不上的地方：脚本路径与子命令各自比 */
const commandProblems = (
  label: string,
  actual: ContractCommand | null,
  expected: ContractCommand,
): string[] =>
  [
    diff(`${label}.script`, actual?.script ?? null, expected.script),
    diff(
      `${label}.args`,
      actual === null ? null : actual.args.join(' '),
      expected.args.join(' '),
    ),
  ].filter((problem): problem is string => problem !== null);

/**
 * 校验记录仓库声明的契约与本项目实现是否一致；不一致直接抛错。
 *
 * @param repoDir 记录仓库根目录
 * @param expected 本项目实际使用的目录与命令
 * @throws 缺文件、不是合法 JSON、结构不对、版本或命令与实现不一致：消息可直接给用户看
 */
export const assertContract = async (
  repoDir: string,
  expected: RepoExpectation,
): Promise<void> => {
  const file = path.resolve(repoDir, CONTRACT_FILE);
  let text: string;

  try {
    text = await readFile(file, 'utf8');
  } catch {
    throw new Error(
      `读不到记录仓库的 ${CONTRACT_FILE}（${file}）：无法确认笔记目录与写删命令是否仍与本项目一致`,
    );
  }

  let raw: unknown;

  try {
    raw = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `记录仓库的 ${CONTRACT_FILE} 不是合法 JSON：${
        error instanceof Error ? error.message : '解析失败'
      }`,
    );
  }

  if (!isObject(raw)) {
    throw new Error(`记录仓库的 ${CONTRACT_FILE} 结构不对：顶层必须是对象`);
  }

  const problems: string[] = [];
  const version = raw.contractVersion;

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    addProblem(
      problems,
      `contractVersion（契约缺失 / 本项目 v${CONTRACT_VERSION}）`,
    );
  } else if (version !== CONTRACT_VERSION) {
    addProblem(
      problems,
      `contractVersion（契约 v${version} / 本项目 v${CONTRACT_VERSION}）`,
    );
  }

  addProblem(problems, diff('python', readText(raw.python), expected.python));
  addProblem(
    problems,
    diff('notesDir', readText(raw.notesDir), expected.notesDir),
  );
  addProblem(
    problems,
    diff(
      'categoriesFile',
      readText(raw.categoriesFile),
      expected.categoriesFile,
    ),
  );

  const commands = isObject(raw.commands) ? raw.commands : {};
  const write = readCommand(commands.writeNote);
  const remove = readCommand(commands.deleteNote);

  problems.push(
    ...commandProblems('commands.writeNote', write, expected.writeNote),
    ...commandProblems('commands.deleteNote', remove, expected.deleteNote),
  );

  if (problems.length > 0) {
    throw new Error(
      `记录仓库契约与本项目不一致：${problems.join('、')}。请同步本项目，或修正记录仓库的 ${CONTRACT_FILE}`,
    );
  }
};
