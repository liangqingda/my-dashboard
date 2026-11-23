/**
 * 用外部播放器打开本机文件：把绕开浏览器的路径留在这里。
 *
 * 浏览器只认它支持的容器与编码，硬解能力也远不如本地播放器（mpv / IINA）：
 * 遇到大码率 HEVC、mkv 这类片子，「交给本地播放器」比在弹窗里等它软解快得多。
 * 这里只做入参校验与 `open` 调用，路由壳只回「用的哪个应用」。
 */

import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';

/** 首选的外部播放器（macOS 下按应用名调起，不写死安装路径） */
const PREFERRED_PLAYER = 'IINA';

/** 带 `code` 的错误：路由壳据此归类成 HTTP 状态码 */
const withCode = (message: string, code: string): Error => {
  const error = new Error(message) as Error & { code?: string };

  error.code = code;

  return error;
};

/** 取 Node 错误上的 `code`；不是错误对象时返回空串 */
const errorCode = (error: unknown): string =>
  error && typeof error === 'object' && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';

/**
 * 校验一个可打开的文件：必须是绝对路径、必须存在、必须是常规文件。
 * 相对路径不收——拼到进程 cwd 上打开的不是用户点的那一个。
 */
export const resolveOpenableFile = async (input: string): Promise<string> => {
  const trimmed = input.trim();

  if (!trimmed) {
    throw withCode('缺少文件路径', 'ENOENT');
  }

  if (!path.isAbsolute(trimmed)) {
    throw withCode('文件路径必须是绝对路径', 'EINVAL');
  }

  const filePath = path.resolve(trimmed);

  let info;

  try {
    info = await stat(filePath);
  } catch (error) {
    const code = errorCode(error) || 'ENOENT';

    throw withCode(
      code === 'ENOENT' ? `文件不存在：${filePath}` : '读取文件失败',
      code,
    );
  }

  if (!info.isFile()) {
    throw withCode('文件路径不是常规文件', 'EINVAL');
  }

  return filePath;
};

/** 调一次 `open`；非 0 退出码按失败处理（找不到指定应用也是非 0） */
const runOpen = (args: readonly string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('open', [...args], { stdio: 'ignore' });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();

        return;
      }

      reject(withCode('调起外部应用失败', 'EIO'));
    });
  });

/** 打开结果：`iina` 表示走的是首选播放器，`default` 表示回落到系统默认应用 */
export type ExternalOpenApp = 'iina' | 'default';

/**
 * 用外部应用打开一个文件：优先用 IINA，没装就回落到系统默认应用（`open <path>`）。
 * 只有 macOS 有这套；其它平台直接报不支持，而不是悄悄改成别的行为。
 */
export const openExternalFile = async (
  input: string,
): Promise<ExternalOpenApp> => {
  if (process.platform !== 'darwin') {
    throw withCode('只有 macOS 支持用外部应用打开', 'ENOTSUP');
  }

  const filePath = await resolveOpenableFile(input);

  try {
    await runOpen(['-a', PREFERRED_PLAYER, filePath]);

    return 'iina';
  } catch {
    await runOpen([filePath]);

    return 'default';
  }
};
