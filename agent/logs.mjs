import { open, stat, copyFile, rename, truncate } from 'node:fs/promises';

export const MAX_LOG_BYTES = 5 * 1024 * 1024;
const locks = new Map();

export function normalizeLines(value, fallback = 60) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number > 0
    ? Math.min(number, 1000)
    : fallback;
}

/** Read backwards in bounded blocks, never loading an entire historical log. */
export async function readTail(file, lines = 60, maxBytes = 256 * 1024) {
  let handle;
  try {
    handle = await open(file, 'r');
    const { size } = await handle.stat();
    let position = size;
    let bytes = 0;
    let newlines = 0;
    const chunks = [];
    while (position > 0 && bytes < maxBytes && newlines <= lines) {
      const length = Math.min(8192, position, maxBytes - bytes);
      position -= length;
      const buffer = Buffer.alloc(length);
      const result = await handle.read(buffer, 0, length, position);
      const chunk = buffer.subarray(0, result.bytesRead);
      chunks.unshift(chunk);
      bytes += result.bytesRead;
      for (const byte of chunk) if (byte === 10) newlines++;
    }
    let text = Buffer.concat(chunks).toString('utf8');
    if (position > 0) text = text.slice(text.indexOf('\n') + 1);
    return text.replace(/\n$/, '').split('\n').slice(-lines).join('\n');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  } finally {
    await handle?.close();
  }
}

/** Copy/truncate preserves the inode used by a running child's O_APPEND descriptor. */
export async function rotateLog(file, maxBytes = MAX_LOG_BYTES, retained = 3) {
  if (locks.has(file)) return locks.get(file);
  const work = (async () => {
    try {
      if ((await stat(file)).size <= maxBytes) return false;
      for (let index = retained - 1; index >= 1; index--) {
        try {
          await rename(`${file}.${index}`, `${file}.${index + 1}`);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      await copyFile(file, `${file}.1`);
      await truncate(file, 0);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  })();
  locks.set(file, work);
  try {
    return await work;
  } finally {
    locks.delete(file);
  }
}
