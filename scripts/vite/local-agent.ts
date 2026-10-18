import { fork } from 'node:child_process';
import path from 'node:path';

import type { Plugin } from 'vite';

/** Vite 提供启动入口，即使 agent 离线也可以接收请求。 */
export const localAgent = (root: string): Plugin => {
  let starting: Promise<void> | undefined;
  const start = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8787/api/health', {
        signal: AbortSignal.timeout(1500),
      });
      const health = await response.json() as { ok?: boolean };

      if (response.ok && health.ok) {return;}
    } catch {
      // agent 离线，启动新进程。
    }

    await new Promise<void>((resolve, reject) => {
      const child = fork(path.join(root, 'agent/server.mjs'), [], {
        cwd: root,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        env: { ...process.env, AGENT_HOST: '127.0.0.1', AGENT_PORT: '8787' },
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('启动超时，请检查 agent 配置'));
      }, 15_000);
      const fail = (error: Error) => {
        clearTimeout(timer);
        reject(error);
      };

      child.once('error', fail);
      child.once('exit', () => fail(new Error('agent 启动失败，请检查配置或端口占用')));
      child.once('message', (message: unknown) => {
        if (!message || typeof message !== 'object' || !('type' in message) || message.type !== 'ready') {return;}

        clearTimeout(timer);
        child.removeAllListeners('exit');
        child.disconnect();
        child.unref();
        resolve();
      });
    });
  };

  return {
    name: 'local-agent',
    configureServer(server) {
      server.middlewares.use('/api/agent/start', async (req, res, next) => {
        if (req.method !== 'POST' || (req.url !== '/' && req.url !== '')) {return next();}

        // 只允许当前页面发起本机进程操作。
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
          res.writeHead(403).end();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        try {
          starting ??= start().finally(() => { starting = undefined; });
          await starting;
          res.end(JSON.stringify({ started: true }));
        } catch (error) {
          res.statusCode = 503;
          res.end(JSON.stringify({ message: error instanceof Error ? error.message : 'agent 启动失败' }));
        }
      });
    },
  };
};
