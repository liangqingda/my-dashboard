import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';

/** 只观察本次启动新增的日志；不定时请求或读取服务状态。 */
export function waitForStartup({ child, logPath, logOffset, config, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let watcher;
    let timer;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      watcher?.close();
      clearTimeout(timer);
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
    const check = async () => {
      try {
        const log = (await readFile(logPath)).subarray(logOffset).toString('utf8');
        const ignored = (config.failIgnorePatterns ?? []).map((pattern) => new RegExp(pattern, 'i'));
        const lines = log.split('\n').filter((line) => !ignored.some((pattern) => pattern.test(line)));
        const contains = (text, marker) => {
          const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'i').test(text);
        };
        if (config.failMarkers.some((marker) => lines.some((line) => contains(line, marker)))) {
          finish(new Error('服务启动失败，详见服务日志'));
        } else if (config.successMarkers.some((marker) => contains(log, marker))) {
          finish();
        }
      } catch (error) {
        finish(error);
      }
    };

    child.once('exit', onExit);
    child.once('error', onError);
    try {
      watcher = watch(logPath, () => void check());
      watcher.once('error', onError);
      timer = setTimeout(() => finish(new Error('启动超时：未收到服务就绪日志')), timeoutMs);
      if (child.exitCode !== null || child.signalCode) onExit(child.exitCode, child.signalCode);
      else void check();
    } catch (error) {
      finish(error);
    }
  });
}
