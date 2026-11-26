/**
 * 桌面墙纸：把文件页里的一张本机图片设为 macOS 当前的桌面背景。
 *
 * 与 `files-images.ts` / `files-media.ts` 同一层定位：只做路径校验、系统命令拼装与错误归类，
 * 路由壳只拼响应。复用 `openImageFile` 的校验（绝对路径 + 存在 + 常规文件 + 图片扩展名），
 * 墙纸接口不接受任意文件。
 *
 * 为什么走 `System Events` 的 `picture of every desktop`：一条脚本就铺满当前所有屏幕与空间，
 * 不必自己按屏枚举；macOS 26 起 `NSWorkspace.setDesktopImageURL` 对普通图片也会报
 * 「The file doesn't exist」，而这条 AppleScript 仍然可用。
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层，不经过 Vite 的 `.js → .ts` 解析
import { openImageFile } from './files-images.ts';

const execFileAsync = promisify(execFile);

/**
 * 换墙纸的 AppleScript：路径从 `argv` 进（不拼进脚本正文），
 * 文件名里的引号、反斜杠、空格都不会打断脚本；`on run` 让 `osascript` 把参数交给它。
 */
export const WALLPAPER_SCRIPT = `on run argv
	tell application "System Events"
		set picture of every desktop to (POSIX file (item 1 of argv))
	end tell
end run`;

/** System Events 的等待上限：首次调用可能弹出一次「自动化」授权窗，要给人留时间 */
const WALLPAPER_TIMEOUT_MS = 30_000;

/** 带 `code` 的错误：路由壳据此归类成 HTTP 状态码 */
const withCode = (message: string, code: string): Error => {
  const error = new Error(message) as Error & { code?: string };

  error.code = code;

  return error;
};

/** 取命令错误的 stdout / stderr / message，拼成一段用于归类文案的文本 */
const errorText = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const record = error as { message?: string; stderr?: string };

  return `${record.message ?? ''} ${record.stderr ?? ''}`;
};

/**
 * 把 osascript 的失败翻成页面能直接读懂的原因。
 * 自动化未授权（-1743）是用户能自己解决的一类，单独说清去哪勾选；
 * 其余保留原始输出并加前缀，不假装成功。
 */
export const wallpaperFailure = (error: unknown): Error => {
  const text = errorText(error);

  if (text.includes('-1743') || /not authorized/i.test(text)) {
    return withCode(
      '系统没有允许控制「系统事件」：到「系统设置 → 隐私与安全性 → 自动化」里，给运行开发服务器的终端（或编辑器）勾上「系统事件」再试',
      'EACCES',
    );
  }

  if (text.includes('-600') || /is not running/i.test(text)) {
    return withCode('「系统事件」没有响应，稍后重试', 'EAGAIN');
  }

  const detail = text.trim();

  return withCode(
    detail.length > 0 ? `更换桌面墙纸失败：${detail}` : '更换桌面墙纸失败',
    'EIO',
  );
};

/** 一次换墙纸的结果：用了哪张图 */
export type WallpaperReceipt = {
  /** 校验后的图片绝对路径 */
  path: string;
};

/**
 * 把一张本机图片设为桌面墙纸：校验图片 → 跑 AppleScript 铺到所有桌面。
 * 非 macOS、路径不是图片、系统拒绝控制 System Events 都抛带 `code` 的错误。
 */
export const setDesktopWallpaper = async (
  input: string,
): Promise<WallpaperReceipt> => {
  if (process.platform !== 'darwin') {
    throw withCode('只有 macOS 支持更换桌面墙纸', 'EINVAL');
  }

  const image = await openImageFile(input);

  try {
    await execFileAsync('osascript', ['-e', WALLPAPER_SCRIPT, image.path], {
      timeout: WALLPAPER_TIMEOUT_MS,
    });
  } catch (error) {
    throw wallpaperFailure(error);
  }

  return { path: image.path };
};
