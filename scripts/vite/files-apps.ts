/**
 * macOS 应用包（`.app`）的识别、残留扫描与卸载。
 *
 * 列表只拿轻量摘要（显示名 / 路径 / 修改时间 / 是否系统自带），不读 Info.plist：
 * 一次列目录要为几十个应用各起一个 `plutil` 进程，代价比整份目录扫描还大。
 * 只有在打开卸载确认弹窗时才解析 bundle id，并按它列出用户与系统级残留。
 *
 * 卸载永远是「删整包 + 删算出来的残留」，不接受调用方传入待删路径——
 * 路径只能由这里按应用包推导，避免页面把任意路径塞进来。
 */

import { execFile } from 'node:child_process';
import { readdir, realpath, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** 列表里的一条应用包 */
export type AppEntry = {
  /** 显示名：文件名的 `.app` 后缀去掉 */
  name: string;
  /** `.app` 包绝对路径，卸载时原样回传 */
  path: string;
  /** 包的最后修改时间（ISO 8601） */
  updatedAt: string;
  /** 最后修改时间（毫秒）：应用之间按它「新的在前」 */
  updatedMs: number;
  /** 是否系统自带（符号链接指向 `/System` 等只读位置），这类应用不给卸载入口 */
  system: boolean;
};

/** Info.plist 里本模块用得上的字段，缺一项就按 null */
export type AppBundleInfo = {
  /** `CFBundleIdentifier`，残留目录与偏好设置都按它找 */
  bundleId: string | null;
  /** 人类可读名字：`CFBundleDisplayName` 优先，其次 `CFBundleName` */
  displayName: string | null;
  /** 可执行文件名，退出应用时用 */
  executable: string | null;
  /** `CFBundleIconFile` 原值（可能不带 `.icns`） */
  iconFile: string | null;
  /** `CFBundleShortVersionString` */
  version: string | null;
};

/** 解析后的一条应用包 */
export type AppInspection = {
  /** 调用方传入的路径（符号链接保持原样） */
  path: string;
  /** 跟随符号链接后的真实路径 */
  realPath: string;
  /** 是否系统自带 */
  system: boolean;
  /** 显示名：Info.plist 优先，其次是去掉后缀的文件名 */
  name: string;
  /** Info.plist 摘要 */
  info: AppBundleInfo;
};

/** 一条残留：绝对路径 + 它是什么 */
export type AppResidue = {
  /** 绝对路径 */
  path: string;
  /** 中文说明，直接进确认弹窗 */
  label: string;
};

/** 卸载前扫出来的报告 */
export type AppResidueReport = {
  /** 应用本体摘要 */
  app: {
    /** 显示名 */
    name: string;
    /** 应用包绝对路径 */
    path: string;
    /** bundle id；读不到时为 null，只剩应用名这一类残留 */
    bundleId: string | null;
    /** 是否系统自带（系统自带时 residues 为空） */
    system: boolean;
  };
  /** 应用本体之外、将要一并删除的残留 */
  residues: AppResidue[];
};

/** 卸载结果：哪些删掉了、哪些没删掉 */
export type AppUninstallResult = {
  /** 已删除的绝对路径 */
  removed: string[];
  /** 删除失败的条目 */
  failed: { path: string; message: string }[];
};

/** 应用包文件名：以 `.app` 结尾（大小写不敏感） */
export const isAppBundleName = (name: string): boolean =>
  name.toLowerCase().endsWith('.app');

/** 文件名去掉 `.app` 后缀，用作显示名 */
export const stripAppSuffix = (name: string): string =>
  name.replace(/\.app$/i, '');

/**
 * 真实路径是否落在系统只读位置。系统自带应用（如 `/Applications/Safari.app`
 * 指向 `/System/Applications`）不能被卸载，命中这里就拒绝。
 */
export const isSystemAppPath = (realPath: string): boolean =>
  realPath.startsWith('/System/') ||
  realPath.startsWith('/usr/') ||
  realPath === '/';

/** 取 Node 错误上的 `code` 字段；不是错误对象时返回空串 */
const errorCode = (error: unknown): string =>
  error && typeof error === 'object' && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';

/** 路径是否存在（跟随符号链接） */
const pathExists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);

    return true;
  } catch {
    return false;
  }
};

/** 读一个目录的子项名；读不到按空目录处理 */
const readNames = async (dir: string): Promise<string[]> => {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
};

/** 从 plist 里取字符串字段；缺失 / 类型不对按 null 收口 */
const plistString = (
  record: Record<string, unknown>,
  key: string,
): string | null =>
  typeof record[key] === 'string' && (record[key] as string).length > 0
    ? (record[key] as string)
    : null;

/**
 * 解析应用包的 Info.plist：`plutil` 把二进制 / XML 两种格式统一转成 JSON 再读。
 * 读不到或不是合法对象时返回空摘要——列表不依赖它，卸载只是少找几类残留。
 */
export const readAppBundleInfo = async (
  bundlePath: string,
): Promise<AppBundleInfo> => {
  const empty: AppBundleInfo = {
    bundleId: null,
    displayName: null,
    executable: null,
    iconFile: null,
    version: null,
  };

  try {
    const { stdout } = await execFileAsync(
      'plutil',
      [
        '-convert',
        'json',
        '-o',
        '-',
        path.join(bundlePath, 'Contents', 'Info.plist'),
      ],
      { timeout: 5000 },
    );
    const parsed: unknown = JSON.parse(stdout);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return empty;
    }

    const record = parsed as Record<string, unknown>;

    return {
      bundleId: plistString(record, 'CFBundleIdentifier'),
      displayName:
        plistString(record, 'CFBundleDisplayName') ??
        plistString(record, 'CFBundleName'),
      executable: plistString(record, 'CFBundleExecutable'),
      iconFile: plistString(record, 'CFBundleIconFile'),
      version: plistString(record, 'CFBundleShortVersionString'),
    };
  } catch {
    return empty;
  }
};

/** 带错误码的校验错误：路由层按 `statusForReadError` 转成 HTTP 状态 */
const appError = (message: string, code: string): Error => {
  const error = new Error(message) as Error & { code?: string };

  error.code = code;

  return error;
};

/**
 * 解析并校验一个应用包：必须是存在的 `.app` 目录（允许是符号链接）。
 * 不是应用包时抛可读错误，路由层按 400/404 收口。
 */
export const inspectAppBundle = async (
  input: string,
): Promise<AppInspection> => {
  const bundlePath = path.resolve(input);

  if (!isAppBundleName(path.basename(bundlePath))) {
    throw appError('只能操作 .app 应用包', 'EINVAL');
  }

  let info;

  try {
    info = await stat(bundlePath);
  } catch {
    throw appError(`应用不存在：${bundlePath}`, 'ENOENT');
  }

  if (!info.isDirectory()) {
    throw appError('这不是应用包目录', 'ENOTDIR');
  }

  const realPath = await realpath(bundlePath).catch(() => bundlePath);
  const plist = await readAppBundleInfo(bundlePath);

  return {
    info: plist,
    name: plist.displayName ?? stripAppSuffix(path.basename(bundlePath)),
    path: bundlePath,
    realPath,
    system: isSystemAppPath(realPath),
  };
};

/**
 * 打开一个应用包：校验是 `.app` 后交给系统 `open`（等价于在 Finder 里双击）。
 * 只传真实路径，页面给什么路径都不会被当成可执行文件直接跑。
 */
export const launchAppBundle = async (
  input: string,
): Promise<{ path: string }> => {
  const { realPath } = await inspectAppBundle(input);

  try {
    await execFileAsync('open', [realPath], { timeout: 15_000 });
  } catch (error) {
    throw appError(
      `无法打开应用：${error instanceof Error ? error.message : realPath}`,
      errorCode(error) || 'EIO',
    );
  }

  return { path: realPath };
};

/**
 * 列目录时用的轻量摘要：只 stat + realpath，不读 Info.plist。
 * 读不到（符号链接指向不存在、不是目录）返回 null，调用方跳过这一条。
 */
export const describeAppEntry = async (
  entryPath: string,
  fileName: string,
): Promise<AppEntry | null> => {
  try {
    const info = await stat(entryPath);

    if (!info.isDirectory()) {
      return null;
    }

    const realPath = await realpath(entryPath).catch(() => entryPath);

    return {
      name: stripAppSuffix(fileName),
      path: entryPath,
      updatedAt: info.mtime.toISOString(),
      updatedMs: info.mtimeMs,
      system: isSystemAppPath(realPath),
    };
  } catch {
    return null;
  }
};

/** 去重、保序 */
const unique = (values: string[]): string[] => [...new Set(values)];

/** 只留下真实存在的路径，拼成残留列表；`label` 原样带过来 */
const existingResidues = async (
  candidates: { label: string; paths: string[] }[],
): Promise<AppResidue[]> => {
  const seen = new Set<string>();
  const residues: AppResidue[] = [];

  for (const candidate of candidates) {
    for (const candidatePath of candidate.paths) {
      if (seen.has(candidatePath) || !(await pathExists(candidatePath))) {
        continue;
      }

      seen.add(candidatePath);
      residues.push({ label: candidate.label, path: candidatePath });
    }
  }

  return residues;
};

/**
 * 按 bundle id 与应用名推导残留路径。所有候选都是精确名字（或精确前缀 / 后缀），
 * 不做模糊匹配；只返回真实存在的条目，确认弹窗里列出来的就是要删的。
 *
 * `home` 可注入，测试用临时目录代替真实主目录。
 */
export const scanAppResidues = async (
  input: string,
  home: string = homedir(),
): Promise<AppResidueReport> => {
  const app = await inspectAppBundle(input);

  if (app.system) {
    return {
      app: {
        bundleId: app.info.bundleId,
        name: app.name,
        path: app.path,
        system: true,
      },
      residues: [],
    };
  }

  const library = path.join(home, 'Library');
  const bundleId = app.info.bundleId;
  const fileStem = stripAppSuffix(path.basename(app.path));
  const appNames = unique(
    [fileStem, app.name].filter((name) => name && name !== bundleId),
  );
  const id = bundleId ? [bundleId] : [];

  const byHostNames = id.length
    ? (await readNames(path.join(library, 'Preferences', 'ByHost'))
        .then((names) =>
          names
            .filter((name) => name.startsWith(`${bundleId}.`))
            .map((name) => path.join(library, 'Preferences', 'ByHost', name)),
        ))
    : [];
  const groupContainers = id.length
    ? (await readNames(path.join(library, 'Group Containers'))
        .then((names) =>
          names
            .filter((name) => name.endsWith(`.${bundleId}`))
            .map((name) => path.join(library, 'Group Containers', name)),
        ))
    : [];
  const userAgents = id.length
    ? (await readNames(path.join(library, 'LaunchAgents'))
        .then((names) =>
          names
            .filter(
              (name) => name.includes(bundleId ?? '') && name.endsWith('.plist'),
            )
            .map((name) => path.join(library, 'LaunchAgents', name)),
        ))
    : [];
  const systemAgents = id.length
    ? (
        await Promise.all(
          ['LaunchAgents', 'LaunchDaemons'].map(async (dir) => {
            const names = await readNames(path.join('/Library', dir));

            return names
              .filter(
                (name) =>
                  name.includes(bundleId ?? '') && name.endsWith('.plist'),
              )
              .map((name) => path.join('/Library', dir, name));
          }),
        )
      ).flat()
    : [];

  const residues = await existingResidues([
    {
      label: '用户数据（Application Support）',
      paths: appNames.map((name) =>
        path.join(library, 'Application Support', name),
      ),
    },
    {
      label: '缓存',
      paths: [
        ...appNames.map((name) => path.join(library, 'Caches', name)),
        ...id.map((value) => path.join(library, 'Caches', value)),
      ],
    },
    {
      label: '偏好设置',
      paths: id.map((value) =>
        path.join(library, 'Preferences', `${value}.plist`),
      ),
    },
    { label: '偏好设置（按主机）', paths: byHostNames },
    {
      label: '保存状态',
      paths: id.map((value) =>
        path.join(library, 'Saved Application State', `${value}.savedState`),
      ),
    },
    {
      label: '日志',
      paths: [
        ...appNames.map((name) => path.join(library, 'Logs', name)),
        ...id.map((value) => path.join(library, 'Logs', value)),
      ],
    },
    {
      label: 'Cookie',
      paths: id.map((value) =>
        path.join(library, 'Cookies', `${value}.binarycookies`),
      ),
    },
    {
      label: '网络存储（HTTPStorages）',
      paths: id.map((value) => path.join(library, 'HTTPStorages', value)),
    },
    {
      label: 'WebKit 数据',
      paths: id.map((value) => path.join(library, 'WebKit', value)),
    },
    {
      label: '沙盒容器',
      paths: id.map((value) => path.join(library, 'Containers', value)),
    },
    {
      label: '应用脚本',
      paths: id.map((value) =>
        path.join(library, 'Application Scripts', value),
      ),
    },
    { label: '共享容器（Group Containers）', paths: groupContainers },
    { label: '登录启动项（LaunchAgents）', paths: userAgents },
    {
      label: '系统级数据（需要管理员权限）',
      paths: [
        ...id.map((value) =>
          path.join('/Library', 'Application Support', value),
        ),
        ...id.map((value) => path.join('/Library', 'Caches', value)),
        ...id.map((value) =>
          path.join('/Library', 'Preferences', `${value}.plist`),
        ),
        ...systemAgents,
      ],
    },
  ]);

  return {
    app: {
      bundleId,
      name: app.name,
      path: app.path,
      system: false,
    },
    residues,
  };
};

/** AppleScript 字符串转义：反斜杠与双引号先转义，避免打断脚本 */
const appleScriptString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** 正则元字符转义：`pkill -f` 的匹配串会被当成扩展正则 */
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** POSIX shell 单引号转义：路径里的单引号写成 `'\''` */
const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * 尽力让应用先退出：再删包时缓存与沙盒文件才不会被退出流程重新写回来。
 * 用 `pkill -f` 匹配包内可执行路径，而不是 `tell application ... to quit`——
 * 后者会把没在运行的应用拉起来，卸载反而多启动一次。
 */
const quitApp = async (realPath: string): Promise<void> => {
  try {
    await execFileAsync('pkill', ['-f', escapeRegex(`${realPath}/Contents/`)], {
      timeout: 8000,
    });
  } catch {
    // 没在运行（pkill 返回 1）或不给杀，都不影响后续删包。
  }
};

/** 删一个路径；不存在也算成功（`force` 只是忽略 ENOENT） */
const removePath = async (target: string): Promise<void> => {
  await rm(target, { force: true, recursive: true });
};

/** 用一次管理员授权删掉剩余条目：只在普通删除碰到权限错误时才走 */
const removeWithAdmin = async (targets: string[]): Promise<void> => {
  const command = `rm -rf ${targets.map((target) => shellQuote(target)).join(' ')}`;

  await execFileAsync(
    'osascript',
    [
      '-e',
      `do shell script "${appleScriptString(command)}" with administrator privileges`,
    ],
    { timeout: 120_000 },
  );
};

/**
 * 卸载一个应用包：先退应用，再删整包与全部残留。
 * 普通删除遇到权限错误（root 所有的应用、`/Library` 系统级数据）时，一次弹 macOS
 * 授权窗补删；用户取消授权就如实返回失败条目，不假装删干净。
 */
export const uninstallAppBundle = async (
  input: string,
  home: string = homedir(),
): Promise<AppUninstallResult> => {
  const report = await scanAppResidues(input, home);

  if (report.app.system) {
    throw appError('系统自带应用不能卸载', 'EINVAL');
  }

  // 退出要用真实路径匹配进程，`scanAppResidues` 只回传了调用方路径，这里再解析一次
  const { realPath: bundleRealPath } = await inspectAppBundle(input);

  await quitApp(bundleRealPath);

  const targets = [report.app.path, ...report.residues.map((item) => item.path)];
  const removed: string[] = [];
  const denied: { path: string; code: string }[] = [];

  for (const target of targets) {
    try {
      await removePath(target);
      removed.push(target);
    } catch (error) {
      denied.push({ code: errorCode(error), path: target });
    }
  }

  const permissionDenied = denied.filter(
    (item) => item.code === 'EACCES' || item.code === 'EPERM',
  );

  if (permissionDenied.length > 0) {
    try {
      await removeWithAdmin(permissionDenied.map((item) => item.path));
    } catch {
      // 用户取消授权 / 授权失败：下面按实际是否还在磁盘上收口。
    }
  }

  const failed: AppUninstallResult['failed'] = [];

  for (const item of denied) {
    if (await pathExists(item.path)) {
      failed.push({
        path: item.path,
        message:
          item.code === 'EACCES' || item.code === 'EPERM'
            ? '需要管理员权限，未删除'
            : '删除失败',
      });
    } else {
      removed.push(item.path);
    }
  }

  return { failed, removed };
};
