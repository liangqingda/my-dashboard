/**
 * iCloud 云端占位文件（evicted / dataless）的识别与按需下载。
 *
 * 放在 iCloud Drive（`~/Library/Mobile Documents/…`）里的文件可以只留一个云端占位：
 * 目录条目、大小、修改时间都在，真实字节没落地。这时普通 `readFile` / `sips` 读到的是
 * 空壳，表现为「缩略图转不出来、预览打不开」。这一层负责认出占位状态，并在预览 / 缩略图
 * 取数前把它拉回本地。
 *
 * 识别口径：`stat.blocks === 0`。占位文件 size 是远端逻辑大小，但本地块占用为 0；
 * 已落地的常规文件 blocks 恒大于 0。不读扩展属性——Node 的 `stat` 不暴露 macOS 的
 * `UF_DATALESS` 标志，块占用是跨平台可用的现成信号。
 */

import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** 触发下载后等待落地的轮询间隔：CloudDocs 接管下载，本地逐块写回 */
const POLL_INTERVAL_MS = 150;
/** 等待一个文件落地的上限：大图 / 慢速网络留出余量，超时按失败交给上层报错 */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/** 取一次文件的块占用；读不到按 null（上层按「读不到」处理，不判成占位） */
const blocksOf = async (target: string): Promise<number | null> => {
  try {
    return (await stat(target)).blocks;
  } catch {
    return null;
  }
};

/**
 * 这个文件是不是 iCloud 云端占位（真实字节不在本地）。
 * 读不到文件时返回 false：调用方自己会再走一遍存在性校验，这里不把「不存在」误判成占位。
 */
export const isCloudPlaceholder = async (target: string): Promise<boolean> => {
  const blocks = await blocksOf(target);

  return blocks !== null && blocks === 0;
};

/**
 * 触发 iCloud 把一个占位文件下载到本地，并等到字节真正落地。
 *
 * `brctl download <path>` 只是把请求交给 CloudDocs 守护进程，命令返回不代表写完；
 * 所以这里轮询块占用，直到 blocks > 0。已落地的文件直接返回，不重复触发。
 * 触发失败 / 超时都抛错，由路由壳归类成 HTTP 状态码，前端据此提示而不是假装能打开。
 */
export const ensureLocalDownloaded = async (target: string): Promise<void> => {
  if (!(await isCloudPlaceholder(target))) {
    return;
  }

  await execFileAsync('brctl', ['download', target]);

  const deadline = Date.now() + DOWNLOAD_TIMEOUT_MS;

  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const blocks = await blocksOf(target);

    if (blocks !== null && blocks > 0) {
      return;
    }

    if (Date.now() > deadline) {
      throw new Error('等待 iCloud 下载超时，请检查网络后重试');
    }
  }
};
