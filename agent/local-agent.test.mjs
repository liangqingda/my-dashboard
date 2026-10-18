import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { localAgent } from '../scripts/vite/local-agent.ts';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}
const close = (server) =>
  new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });

for (const scenario of [
  'legacy',
  'authenticated',
  'handoff-reset',
  'busy',
  'current',
]) {
  test(`agent bootstrap: ${scenario}`, { timeout: 10000 }, async () => {
    let version = scenario === 'current' ? 1 : undefined;
    let restarts = 0;
    const backend = http.createServer((req, res) => {
      const json = (body, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.url === '/api/health')
        return json({ ok: true, protocolVersion: version });
      if (req.url === '/api/session')
        return scenario === 'authenticated'
          ? json({ token: 'existing-token' })
          : json({ message: 'missing' }, 404);
      if (req.url === '/api/agent/restart') {
        restarts++;
        if (scenario === 'authenticated')
          assert.equal(req.headers['x-dashboard-token'], 'existing-token');
        if (scenario === 'busy') return json({ message: 'agent 正忙' }, 409);
        version = 1;
        if (scenario === 'handoff-reset') return req.socket.destroy();
        return setTimeout(() => json({ restarted: true }), 30);
      }
      json({}, 404);
    });
    const port = await listen(backend);
    let middleware;
    localAgent('/unused-fixture', port).configureServer({
      middlewares: {
        use(pathname, handler) {
          assert.equal(pathname, '/api/agent/start');
          middleware = handler;
        },
      },
    });
    const frontend = http.createServer(
      (req, res) => void middleware(req, res, () => res.writeHead(404).end()),
    );
    const frontendPort = await listen(frontend);
    const base = `http://127.0.0.1:${frontendPort}`;
    const headers = { Origin: base, 'X-Dashboard-Request': '1' };
    try {
      assert.equal(
        (
          await fetch(base, {
            method: 'POST',
            headers: { ...headers, Origin: 'https://foreign.example' },
          })
        ).status,
        403,
      );
      assert.equal(restarts, 0);
      const results = await Promise.all([
        fetch(base, { method: 'POST', headers }),
        fetch(base, { method: 'POST', headers }),
      ]);
      for (const response of results) {
        assert.equal(response.status, scenario === 'busy' ? 503 : 200);
        const body = await response.json();
        if (scenario === 'busy') assert.equal(body.message, 'agent 正忙');
        else assert.equal(body.started, true);
      }
      assert.equal(restarts, scenario === 'current' ? 0 : 1);
    } finally {
      await close(frontend);
      await close(backend);
    }
  });
}
