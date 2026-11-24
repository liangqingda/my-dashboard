/**
 * 本进程对外打开的文件读流登记表。
 *
 * 两个用途：
 *
 * 1. 读流只跟这一次响应同生共死：响应结束、浏览器中断都会销毁，模块里不缓存句柄
 *    ——缓存一条流等于把整块盘的寿命绑在页面停留时长上；
 * 2. 推出外接盘前能把本进程还挂着的读流一次性销毁：只要自己还开着盘上的文件，
 *    `diskutil` 就会因为「正在使用」拒绝卸载，用户点推出也退不掉。
 *
 * 登记进这张表的流，`close`（正常读完 / 出错 / 被 `destroy`）时自动销号。
 */

import { createReadStream } from 'node:fs';
import path from 'node:path';

import type { ReadStream } from 'node:fs';

/** 一次 `createReadStream` 的字节区间；不传就是整份 */
export type TrackedStreamRange = {
  /** 起始字节（含） */
  start?: number;
  /** 结束字节（含） */
  end?: number;
};

/** 还开着的读流：文件路径 → 流集合（同一文件可能被多段 Range 同时读） */
const openStreams = new Map<string, Set<ReadStream>>();

/** 路径是否落在某个目录下（按分隔符比，避免 `/Volumes/盘2` 命中 `/Volumes/盘`） */
export const isPathWithin = (filePath: string, dir: string): boolean =>
  filePath === dir ||
  filePath.startsWith(dir.endsWith(path.sep) ? dir : `${dir}${path.sep}`);

const forget = (filePath: string, stream: ReadStream): void => {
  const streams = openStreams.get(filePath);

  if (streams === undefined) {
    return;
  }

  streams.delete(stream);

  if (streams.size === 0) {
    openStreams.delete(filePath);
  }
};

/** 打开一个读流并登记；流结束 / 出错 / 被销毁后自动销号 */
export const openTrackedStream = (
  filePath: string,
  range?: TrackedStreamRange,
): ReadStream => {
  const known = openStreams.get(filePath) ?? new Set<ReadStream>();
  const stream = createReadStream(filePath, range);

  known.add(stream);
  openStreams.set(filePath, known);
  stream.on('close', () => forget(filePath, stream));

  return stream;
};

/** 这一卷（挂载点）下还有多少条读流没关 */
export const countStreamsUnder = (mountPoint: string): number => {
  let count = 0;

  for (const [filePath, streams] of openStreams) {
    if (isPathWithin(filePath, mountPoint)) {
      count += streams.size;
    }
  }

  return count;
};

/**
 * 销毁这一卷下所有读流，并等到它们真的关掉（最多等 2 秒）后返回销毁条数。
 * 等不到也照常返回：卸载本身会再被系统拦一次，这里只是尽量缩短那个窗口。
 */
export const releaseStreamsUnder = async (
  mountPoint: string,
): Promise<number> => {
  const pending: Promise<void>[] = [];
  let released = 0;

  for (const [filePath, streams] of [...openStreams]) {
    if (!isPathWithin(filePath, mountPoint)) {
      continue;
    }

    for (const stream of [...streams]) {
      released += 1;
      pending.push(
        new Promise((resolve) => {
          if (stream.closed) {
            resolve();

            return;
          }

          stream.once('close', () => resolve());
          stream.destroy();
        }),
      );
    }
  }

  if (pending.length > 0) {
    // 等到它们真的关掉，但最多等 2 秒：关不掉的那条留给卸载时的系统检查去报
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 2000);

      void Promise.all(pending).then(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  return released;
};
