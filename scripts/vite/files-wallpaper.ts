/**
 * 桌面墙纸：把文件页里的一张本机图片设为 macOS 的桌面背景。
 *
 * 与 `files-images.ts` / `files-media.ts` 同一层定位：只做路径校验、原生助手编排与错误归类，
 * 路由壳只拼响应。复用 `openImageFile` 的校验（绝对路径 + 存在 + 常规文件 + 图片扩展名），
 * 墙纸接口不接受任意文件。
 *
 * 为什么不用 `NSWorkspace` / AppleScript：
 * - macOS 26 起 `NSWorkspace.setDesktopImageURL` 对普通图片也报「The file doesn't exist」；
 * - `System Events` 的 `picture of every desktop` 只会写「当前那个桌面空间」，还会弹自动化授权。
 *
 * 现在直接改系统真正读的那份配置：`~/Library/Application Support/com.apple.wallpaper/Store/Index.plist`，
 * 把每个桌面空间、每块屏幕的 `Desktop` 选项换成这张图（`Idle` / 屏幕保护不动），
 * 改完重启 `WallpaperAgent`——它只在启动时读一次配置，不重启就只写文件、桌面不刷新，
 * 这正是「弹了成功提示但壁纸没变」的原因。写入前先备份成 `Index.plist.dashboard.bak`。
 */

import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层，不经过 Vite 的 `.js → .ts` 解析
import { openImageFile } from './files-images.ts';

const execFileAsync = promisify(execFile);

/** 缓存目录与二进制路径：与目录选择框共用同一处，不进版本库也不污染项目根 */
const CACHE_DIR = path.join(
  process.cwd(),
  'node_modules',
  '.cache',
  'my-dashboard-files',
);
const BINARY_PATH = path.join(CACHE_DIR, 'set-wallpaper');
const SOURCE_PATH = path.join(CACHE_DIR, 'set-wallpaper.swift');

/** 等桌面进程回来的节奏：launchd 通常 1–2 秒内拉起，最多等 3 秒 */
const RESTART_POLL_INTERVAL_MS = 200;
const RESTART_POLL_LIMIT = 15;

/**
 * 改墙纸配置的 Swift 助手：读 Index.plist → 备份 → 换掉所有桌面空间的 Desktop 选项 →
 * 原子写回。只动 `Desktop.Content.Choices` 与 `LastSet` / `LastUse`，
 * 其它系统字段（Idle、缩放选项、没见过的键）原样保留。
 */
const SWIFT_SOURCE = `import Foundation

func fail(_ message: String, _ code: Int32) -> Never {
    FileHandle.standardError.write(Data((message + "\\n").utf8))
    exit(code)
}

let arguments = CommandLine.arguments
guard arguments.count > 1 else { fail("缺少图片路径", 2) }
let imagePath = arguments[1]
guard FileManager.default.fileExists(atPath: imagePath) else {
    fail("图片不存在：\\(imagePath)", 3)
}

let fileManager = FileManager.default
let storeDirectory = fileManager.homeDirectoryForCurrentUser
    .appendingPathComponent("Library/Application Support/com.apple.wallpaper/Store")
let indexPath = storeDirectory.appendingPathComponent("Index.plist")
let backupPath = storeDirectory.appendingPathComponent("Index.plist.dashboard.bak")

guard let sourceData = try? Data(contentsOf: indexPath) else {
    fail("读不到墙纸配置：\\(indexPath.path)", 4)
}
guard var root = (try? PropertyListSerialization.propertyList(from: sourceData, options: [], format: nil)) as? [String: Any] else {
    fail("墙纸配置格式不符合预期", 5)
}

let imageURLString = URL(fileURLWithPath: imagePath).absoluteString
let configuration: [String: Any] = [
    "type": "imageFile",
    "url": ["relative": imageURLString] as [String: String],
]
guard let configurationData = try? PropertyListSerialization.data(fromPropertyList: configuration, format: .binary, options: 0) else {
    fail("生成墙纸条目失败", 6)
}

do {
    try sourceData.write(to: backupPath, options: .atomic)
} catch {
    fail("备份墙纸配置失败，未做任何修改", 7)
}

let now = Date()
var updated = 0

func applyImageChoice(_ holder: inout [String: Any]) {
    guard var desktop = holder["Desktop"] as? [String: Any],
          var content = desktop["Content"] as? [String: Any],
          content["Choices"] is [[String: Any]]
    else { return }

    let choice: [String: Any] = [
        "Configuration": configurationData,
        "Files": [Any](),
        "Provider": "com.apple.wallpaper.choice.image",
    ]

    content["Choices"] = [choice]
    desktop["Content"] = content
    desktop["LastSet"] = now
    desktop["LastUse"] = now
    holder["Desktop"] = desktop
    updated += 1
}

if var section = root["AllSpacesAndDisplays"] as? [String: Any] {
    applyImageChoice(&section)
    root["AllSpacesAndDisplays"] = section
}

if var displays = root["Displays"] as? [String: Any] {
    for key in Array(displays.keys) {
        guard var display = displays[key] as? [String: Any] else { continue }
        applyImageChoice(&display)
        displays[key] = display
    }
    root["Displays"] = displays
}

if var spaces = root["Spaces"] as? [String: Any] {
    for spaceKey in Array(spaces.keys) {
        guard var space = spaces[spaceKey] as? [String: Any] else { continue }
        if var defaultSection = space["Default"] as? [String: Any] {
            applyImageChoice(&defaultSection)
            space["Default"] = defaultSection
        }
        if var displayMap = space["Displays"] as? [String: Any] {
            for displayKey in Array(displayMap.keys) {
                guard var display = displayMap[displayKey] as? [String: Any] else { continue }
                applyImageChoice(&display)
                displayMap[displayKey] = display
            }
            space["Displays"] = displayMap
        }
        spaces[spaceKey] = space
    }
    root["Spaces"] = spaces
}

guard updated > 0 else { fail("墙纸配置里没有可写入的桌面", 8) }
guard let outputData = try? PropertyListSerialization.data(fromPropertyList: root, format: .binary, options: 0) else {
    fail("写回前打包失败", 9)
}
do {
    try outputData.write(to: indexPath, options: .atomic)
} catch {
    fail("写墙纸配置失败", 10)
}

print(updated)
`;

/** 编译只跑一次：并发点击共用同一个 Promise，失败记成 null，之后不再重试 */
let buildTask: Promise<string | null> | null = null;

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

/** 编译助手；只在 macOS 上尝试，编译器缺失或失败返回 null */
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

/** 预编译：开发服务器起来就在后台准备，第一次点按钮时通常已经就绪 */
export const warmWallpaperHelper = (): void => {
  buildTask ??= buildBinary();
  void buildTask.catch(() => null);
};

/** `killall` 报「没有这个进程」：桌面进程此刻没在跑，不当作失败 */
export const isAgentAbsent = (error: unknown): boolean =>
  /No matching processes/i.test(errorText(error));

/** 等一拍再查进程有没有回来，避免刚 kill 就判定没起来 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * 让 `WallpaperAgent` 重新读配置：先结束它，再等 launchd 把它拉起来。
 * 进程没在跑也算成功（下次启动会按新配置读）；起来了才算这次刷新真的落地。
 */
const restartWallpaperAgent = async (): Promise<void> => {
  try {
    await execFileAsync('killall', ['WallpaperAgent']);
  } catch (error) {
    if (!isAgentAbsent(error)) {
      throw withCode(
        `墙纸配置已写入，但桌面进程没能重启：${errorText(error).trim()}`,
        'EIO',
      );
    }
  }

  for (let attempt = 0; attempt < RESTART_POLL_LIMIT; attempt += 1) {
    try {
      await execFileAsync('pgrep', ['-x', 'WallpaperAgent']);

      return;
    } catch {
      await sleep(RESTART_POLL_INTERVAL_MS);
    }
  }

  throw withCode('墙纸配置已写入，但桌面进程没有重新启动，请稍后重试', 'EAGAIN');
};

/** 一次换墙纸的结果：用了哪张图 */
export type WallpaperReceipt = {
  /** 校验后的图片绝对路径 */
  path: string;
};

/**
 * 把一张本机图片设为桌面墙纸：校验图片 → 原生助手写进所有桌面空间的配置 →
 * 重启 `WallpaperAgent` 让改动真正显示出来。
 * 非 macOS、路径不是图片、编译器缺失、写配置失败都抛带 `code` 的错误。
 */
export const setDesktopWallpaper = async (
  input: string,
): Promise<WallpaperReceipt> => {
  if (process.platform !== 'darwin') {
    throw withCode('只有 macOS 支持更换桌面墙纸', 'EINVAL');
  }

  const image = await openImageFile(input);

  warmWallpaperHelper();

  const binary = await (buildTask ?? buildBinary());

  if (binary === null) {
    /** 编译失败不记死：用户装好命令行工具后，下一次点击再试一次 */
    buildTask = null;

    throw withCode(
      '换墙纸需要一个原生助手：装好 Xcode 命令行工具（xcode-select --install）后再试',
      'EINVAL',
    );
  }

  let output: string;

  try {
    ({ stdout: output } = await execFileAsync(binary, [image.path], {
      timeout: 30_000,
    }));
  } catch (error) {
    const detail = errorText(error).trim();

    throw withCode(
      detail.length > 0 ? `更换桌面墙纸失败：${detail}` : '更换桌面墙纸失败',
      'EIO',
    );
  }

  if (!Number.isInteger(Number(output.trim())) || Number(output.trim()) <= 0) {
    throw withCode('更换桌面墙纸失败：助手没有写到任何桌面', 'EIO');
  }

  await restartWallpaperAgent();

  return { path: image.path };
};
