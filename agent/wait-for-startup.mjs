import { watch } from 'node:fs';
import { open } from 'node:fs/promises';
import { classifyBuild } from './build-state.mjs';

/** Observe only this launch’s output; optionally verify that the configured port is listening. */
export function waitForStartup({
  child,
  logPath,
  logOffset,
  config,
  timeoutMs,
  isReady,
}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let watcher;
    let timer;
    let poll;
    let offset = logOffset;
    let tail = '';
    let checking;
    let checkAgain = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      watcher?.close();
      clearTimeout(timer);
      clearInterval(poll);
      child.off('exit', onExit);
      child.off('error', onError);
      if (error) reject(error);
      else resolve();
    };
    const onExit = async (code, signal) => {
      // brew 等启动命令成功后会正常退出，先检查最后写入的就绪日志。
      await check();
      finish(new Error(`服务在就绪前退出（${signal ?? code}）`));
    };
    const onError = (error) => finish(error);
    const read = async () => {
      let handle;
      try {
        if (settled) return;
        handle = await open(logPath, 'r');
        const { size } = await handle.stat();
        if (size < offset) {
          offset = 0;
          tail = '';
        }
        const length = Math.min(size - offset, 256 * 1024);
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(
          buffer,
          0,
          length,
          Math.max(offset, size - length),
        );
        offset = size;
        tail = (tail + buffer.subarray(0, bytesRead).toString('utf8')).slice(
          -256 * 1024,
        );
        const state = classifyBuild(config, tail, true);
        if (state === 'fail') {
          finish(new Error('服务启动失败，详见服务日志'));
        } else if (isReady ? await isReady() : state === 'ok') {
          finish();
        }
      } catch (error) {
        finish(error);
      } finally {
        await handle?.close();
      }
    };
    const check = () => {
      if (checking) {
        checkAgain = true;
        return checking;
      }
      checking = (async () => {
        do {
          checkAgain = false;
          await read();
        } while (checkAgain && !settled);
      })().finally(() => {
        checking = undefined;
      });
      return checking;
    };

    child.once('exit', onExit);
    child.once('error', onError);
    try {
      watcher = watch(logPath, () => void check());
      watcher.once('error', onError);
      timer = setTimeout(
        () => finish(new Error('启动超时：未收到服务就绪日志')),
        timeoutMs,
      );
      if (isReady) poll = setInterval(() => void check(), 500);
      if (child.exitCode !== null || child.signalCode)
        onExit(child.exitCode, child.signalCode);
      else void check();
    } catch (error) {
      finish(error);
    }
  });
}
