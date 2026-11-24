/**
 * 目录选择框的原生实现：AppleScript 的 `choose folder` 每次都要现起脚本运行时，
 * 冷机第一次点「选择本地目录」常要一两秒才弹窗。这里改用系统 `NSOpenPanel`：
 * 第一次把极小的 Swift 源码编译进项目缓存，之后每次只起一个几十 KB 的可执行文件，
 * 弹窗几乎即时。编译或运行不可用时由调用方回落到原来的 AppleScript 实现。
 */

import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** 原生选择框的返回：选中路径或用户取消，失败由调用方决定是否回落 */
export type NativePickedDir = { path: string } | { cancelled: true };

/** 缓存目录与二进制路径：放 node_modules/.cache 下，不进版本库也不污染项目根 */
const CACHE_DIR = path.join(
  process.cwd(),
  'node_modules',
  '.cache',
  'my-dashboard-files',
);
const BINARY_PATH = path.join(CACHE_DIR, 'pick-directory');
const SOURCE_PATH = path.join(CACHE_DIR, 'pick-directory.swift');

/** Swift 源码：一个无 Dock 图标的小程序，选目录后打印 POSIX 路径；取消以 1 退出 */
const SWIFT_SOURCE = `import AppKit
import Foundation

let arguments = CommandLine.arguments
let defaultPath = arguments.count > 1 ? arguments[1] : ""

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let panel = NSOpenPanel()
panel.canChooseFiles = false
panel.canChooseDirectories = true
panel.allowsMultipleSelection = false
panel.canCreateDirectories = false
panel.prompt = "选择"
panel.message = "选择要浏览的目录"

if !defaultPath.isEmpty {
    var isDirectory: ObjCBool = false
    if FileManager.default.fileExists(atPath: defaultPath, isDirectory: &isDirectory),
        isDirectory.boolValue {
        panel.directoryURL = URL(fileURLWithPath: defaultPath)
    }
}

app.activate(ignoringOtherApps: true)

if panel.runModal() == .OK, let url = panel.url {
    print(url.path)
    exit(0)
}

exit(1)
`;

/** 编译只跑一次：并发点击共用同一个 Promise，失败记成 null，之后不再重试 */
let buildTask: Promise<string | null> | null = null;

/** 读缓存状态：源码没变、二进制比源码新就直接用 */
const readReadyBinary = async (): Promise<string | null> => {
  try {
    const [binaryInfo, sourceInfo] = await Promise.all([
      stat(BINARY_PATH),
      stat(SOURCE_PATH),
    ]);

    return binaryInfo.mtimeMs >= sourceInfo.mtimeMs ? BINARY_PATH : null;
  } catch {
    return null;
  }
};

/** 把源码写进缓存；内容没变就不重复写，避免无谓改动二进制时间戳 */
const writeSource = async (): Promise<void> => {
  try {
    const current = await readFile(SOURCE_PATH, 'utf8');

    if (current === SWIFT_SOURCE) {
      return;
    }
  } catch {
    /* 没有旧源码就照常写 */
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(SOURCE_PATH, SWIFT_SOURCE, 'utf8');
};

/** 编译原生选择框；只在 macOS 上尝试，编译器缺失或失败返回 null */
const buildBinary = async (): Promise<string | null> => {
  if (process.platform !== 'darwin') {
    return null;
  }

  const ready = await readReadyBinary();

  if (ready !== null) {
    return ready;
  }

  try {
    await writeSource();
    await execFileAsync('swiftc', ['-O', SOURCE_PATH, '-o', BINARY_PATH], {
      timeout: 60_000,
    });

    return BINARY_PATH;
  } catch {
    return null;
  }
};

/** 预编译：页面一进来就在后台准备，用户点按钮时通常已经就绪；失败静默回落 */
export const warmNativePicker = (): void => {
  buildTask ??= buildBinary();
  void buildTask.catch(() => null);
};

/**
 * 用原生面板选目录。返回 null 表示原生路径不可用，调用方应回落到 AppleScript；
 * 取消按 `{ cancelled: true }` 收口，不当作失败。
 */
export const pickNativeDirectory = async (
  defaultDir?: string,
): Promise<NativePickedDir | null> => {
  warmNativePicker();

  const binary = await (buildTask ?? buildBinary());

  if (binary === null) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(
      binary,
      defaultDir ? [defaultDir] : [],
    );
    const picked = stdout.trim();

    return picked ? { path: picked } : { cancelled: true };
  } catch (error) {
    const exitCode = (error as { code?: number }).code;

    /** 取消是脚本主动 exit(1)；其它退出码说明工具坏了，交给调用方回落 */
    return exitCode === 1 ? { cancelled: true } : null;
  }
};
