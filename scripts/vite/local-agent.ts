import { fork } from 'node:child_process';
import path from 'node:path';

import type { Plugin } from 'vite';

/** Vite 提供启动入口，即使 agent 离线也可以接收请求。 */
export const localAgent = (root: string, port = 8787): Plugin => {
  const base = `http://127.0.0.1:${port}`;
  let starting: Promise<void> | undefined;
  const start = async () => {
    let health: { ok?: boolean; protocolVersion?: number } | undefined;

    try {
      const response = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) {
        health = (await response.json()) as typeof health;
      }
    } catch {
      // agent 离线，启动新进程。
    }

    if (health?.ok) {
      if (health.protocolVersion === 1) {
        return;
      }

      // A reachable legacy agent may serve reads but lack the session endpoint.
      // Restart through its own lifecycle API; running services remain detached.
      const sessionResponse = await fetch(`${base}/api/session`, {
        signal: AbortSignal.timeout(5000),
      });
      const headers = new Headers();

      if (sessionResponse.ok) {
        const session = (await sessionResponse.json()) as { token?: string };

        if (!session.token) {
          throw new Error('本机会话无效，请重启 agent');
        }
        headers.set('X-Dashboard-Token', session.token);
      } else if (sessionResponse.status !== 404) {
        throw new Error('无法读取本机会话，请稍后重试');
      }

      headers.set('Connection', 'close');
      let response: Response | undefined;

      try {
        response = await fetch(`${base}/api/agent/restart`, {
          method: 'POST',
          headers,
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        // A legacy process can close its socket during handoff. Confirm readiness
        // with read-only probes instead of replaying the restart command.
      }

      if (response && !response.ok) {
        const body = (await response.json()) as { message?: string };

        throw new Error(body.message ?? '本机服务更新失败，请重启 agent');
      }

      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          const current = await fetch(`${base}/api/health`, {
            signal: AbortSignal.timeout(1000),
            headers: { Connection: 'close' },
          });
          const updated = (await current.json()) as {
            ok?: boolean;
            protocolVersion?: number;
          };

          if (current.ok && updated.ok && updated.protocolVersion === 1) {
            return;
          }
        } catch {
          /* The replacement process may still be binding its port. */
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      throw new Error('本机服务版本仍不兼容，请重启 agent');
    }

    await new Promise<void>((resolve, reject) => {
      const child = fork(path.join(root, 'agent/server.mjs'), [], {
        cwd: root,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        env: {
          ...process.env,
          AGENT_HOST: '127.0.0.1',
          AGENT_PORT: String(port),
        },
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
      child.once('exit', () =>
        fail(new Error('agent 启动失败，请检查配置或端口占用')),
      );
      child.once('message', (message: unknown) => {
        if (
          !message ||
          typeof message !== 'object' ||
          !('type' in message) ||
          message.type !== 'ready'
        ) {
          return;
        }

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
        if (req.method !== 'POST' || (req.url !== '/' && req.url !== '')) {
          return next();
        }

        // 只允许当前页面发起本机进程操作。
        if (
          req.headers.origin !== `http://${req.headers.host}` ||
          req.headers['x-dashboard-request'] !== '1' ||
          req.headers['sec-fetch-site'] === 'cross-site'
        ) {
          res.writeHead(403).end();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        try {
          starting ??= start().finally(() => {
            starting = undefined;
          });
          await starting;
          res.end(JSON.stringify({ started: true }));
        } catch (error) {
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              message:
                error instanceof Error ? error.message : 'agent 启动失败',
            }),
          );
        }
      });
    },
  };
};
