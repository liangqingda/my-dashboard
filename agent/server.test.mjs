import assert from 'node:assert/strict';
import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function freePort() {
  const server = http.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test(
  'isolated HTTP agent enforces security and service lifecycle boundaries',
  { timeout: 30000 },
  async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'dashboard-http-test-'));
    const project = path.join(dir, 'fixture-project');
    await mkdir(project);
    const port = await freePort();
    const servicePort = await freePort();
    const agentPort = `http://127.0.0.1:${port}`;
    const fixture = path.join(project, 'service.mjs');
    await writeFile(
      fixture,
      `import http from 'node:http'; http.createServer((req,res)=>res.end('fixture')).listen(${servicePort},'127.0.0.1',()=>console.log('ready'));`,
    );
    const configFile = path.join(dir, 'services.json');
    const config = {
      id: 'fixture',
      name: 'Fixture',
      cwd: project,
      port: servicePort,
      startCmd: [process.execPath, fixture],
      stopCmd: [],
      successMarkers: ['ready'],
      failMarkers: ['error'],
      deployCmd: [
        process.execPath,
        '-e',
        "setTimeout(()=>console.log('deployed'),500)",
      ],
    };
    await writeFile(configFile, JSON.stringify([config]));
    const child = fork(new URL('./server.mjs', import.meta.url), [], {
      env: {
        ...process.env,
        AGENT_PORT: String(port),
        AGENT_CONFIG_FILE: configFile,
        AGENT_LOG_DIR: path.join(dir, 'logs'),
        AGENT_START_TIMEOUT: '5000',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const exited = once(child, 'exit');
    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    let token;
    const post = (action, headers = {}) =>
      fetch(`${agentPort}/api/services/fixture/${action}`, {
        method: 'POST',
        headers: { 'x-dashboard-token': token, ...headers },
      });
    try {
      await Promise.race([
        once(child, 'message'),
        exited.then(() => {
          throw new Error(stderr || 'Agent exited before readiness');
        }),
      ]);
      assert.equal(
        (
          await fetch(`${agentPort}/api/health`, {
            headers: { origin: 'null' },
          })
        ).status,
        403,
      );
      const health = await fetch(`${agentPort}/api/health`);
      assert.equal(health.status, 200);
      assert.equal((await health.json()).protocolVersion, 1);
      token = (await (await fetch(`${agentPort}/api/session`)).json()).token;
      assert.equal(
        (await post('start', { origin: 'https://foreign.example' })).status,
        403,
      );
      assert.equal(
        (await post('start', { 'x-dashboard-token': 'invalid' })).status,
        403,
      );
      const attempts = await Promise.all([post('start'), post('start')]);
      assert.deepEqual(
        attempts.map((response) => response.status).sort(),
        [200, 409],
      );
      const list = await (await fetch(`${agentPort}/api/services`)).json();
      assert.equal(list[0].running, true);
      assert.equal(list[0].build, 'ok');
      const deploys = await Promise.all([post('deploy'), post('deploy')]);
      assert.deepEqual(
        deploys.map((response) => response.status).sort(),
        [200, 409],
      );
      await new Promise((resolve) => setTimeout(resolve, 800));
      const completed = await (await fetch(`${agentPort}/api/services`)).json();
      assert.equal(completed[0].deploying, false);
      assert.equal(completed[0].deployOutcome, 'success');
      assert.equal(completed[0].build, 'ok');
      const deployLog = await (
        await fetch(`${agentPort}/api/services/fixture/log?kind=deploy`)
      ).json();
      assert.match(deployLog.log, /deployed/);
      assert.equal((await post('restart')).status, 200);
      assert.equal((await post('stop')).status, 200);
      assert.equal(
        (await (await fetch(`${agentPort}/api/services`)).json())[0].running,
        false,
      );
    } finally {
      if (token && child.exitCode === null) await post('stop').catch(() => {});
      child.kill();
      await exited;
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test(
  'a project on another cwd is never considered this service',
  { timeout: 15000 },
  async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'dashboard-owner-test-'));
    const other = path.join(dir, 'other');
    await mkdir(other);
    const port = await freePort();
    const script = `require('node:http').createServer((q,s)=>s.end()).listen(${port},'127.0.0.1',()=>console.log('ready'))`;
    const foreign = spawn(process.execPath, ['-e', script], {
      cwd: other,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      await once(foreign.stdout, 'data');
      const { findServiceProcesses } = await import('./processes.mjs');
      assert.deepEqual(
        await findServiceProcesses({ cwd: path.join(dir, 'intended'), port }),
        [],
      );
      assert.equal(
        (await findServiceProcesses({ cwd: other, port }))[0].pid,
        foreign.pid,
      );
    } finally {
      foreign.kill();
      await once(foreign, 'exit');
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test(
  'external dev launcher is identified through its listener ancestry',
  { timeout: 15000 },
  async () => {
    const dir = await mkdtemp(
      path.join(os.tmpdir(), 'dashboard-launcher-test-'),
    );
    await mkdir(path.join(dir, 'scripts'));
    const port = await freePort();
    const serviceFile = path.join(dir, 'service.mjs');
    const launcherFile = path.join(dir, 'scripts/dev.mjs');
    await writeFile(
      serviceFile,
      `import http from 'node:http'; http.createServer((q,s)=>s.end()).listen(${port},'127.0.0.1',()=>console.log('ready'));`,
    );
    await writeFile(
      launcherFile,
      `import {spawn} from 'node:child_process'; spawn(process.execPath,[${JSON.stringify(serviceFile)}],{stdio:'inherit'});`,
    );
    const launcher = spawn(process.execPath, ['scripts/dev.mjs'], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = once(launcher, 'exit');
    let owned;
    try {
      await once(launcher.stdout, 'data');
      const { findServiceProcesses, findServiceRoot, terminateTree } =
        await import('./processes.mjs');
      const config = { cwd: dir, port, launcherScript: 'scripts/dev.mjs' };
      [owned] = await findServiceProcesses(config);
      assert.notEqual(owned.pid, launcher.pid);
      const root = await findServiceRoot(owned, config);
      assert.equal(root.pid, launcher.pid);
      await terminateTree(root.pid, root.identity);
      await exited;
      assert.deepEqual(await findServiceProcesses(config), []);
    } finally {
      if (launcher.exitCode === null && !launcher.signalCode) launcher.kill();
      if (owned) {
        const { terminateTree } = await import('./processes.mjs');
        await terminateTree(owned.pid, owned.identity);
      }
      await exited;
      await rm(dir, { recursive: true, force: true });
    }
  },
);
