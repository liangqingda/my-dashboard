import { test, expect } from '@playwright/test';

const fixture = () =>
  ['my-dashboard', 'study-lab', 'postgres', 'redis'].map((id, index) => ({
    id,
    name: id,
    description: ['个人工作台', '全栈学习工作台', 'PostgreSQL 18', 'Redis'][
      index
    ],
    cwd: `/projects/${id}`,
    port: [3000, 3001, 5432, 6379][index],
    portLabel: null,
    extraPorts: index === 1 ? [{ port: 3002, label: '后端' }] : [],
    url: index < 2 ? `http://localhost:${3000 + index}` : null,
    deployedUrl: index === 1 ? 'https://study-lab.example.com/' : null,
    repo: index < 2 ? `https://github.com/example/${id}` : null,
    autoStart: index === 0,
    canDeploy: index === 1,
    deploying: false,
    deployOutcome: null,
    lastDeployAt: null,
    running: true,
    pids: [123],
    build: 'ok',
    lastStartedAt: null,
    lastExit: null,
    startCmd: [],
    stopCmd: [],
  }));

async function mock(page) {
  const state = {
    services: fixture(),
    online: true,
    stopSucceeds: true,
    stops: 0,
    deploys: 0,
    tokens: 0,
    expireToken: false,
    logs: 0,
    serviceRequests: 0,
    serviceDelay: 0,
    legacyAgent: false,
    agentStarts: 0,
    commandRequests: 0,
  };
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const json = (data, status = 200) => route.fulfill({ json: data, status });
    if (pathname === '/api/agent/start') {
      state.agentStarts++;
      state.legacyAgent = false;
      state.online = true;
      return json({ started: true });
    }
    if (!state.online) return json({ message: 'offline' }, 503);
    if (pathname === '/api/session') {
      state.tokens++;
      if (state.legacyAgent) return json({ message: '接口不存在' }, 404);
      return json({ token: `token-${state.tokens}` });
    }
    if (route.request().method() === 'POST' && state.expireToken) {
      state.expireToken = false;
      return json({ code: 'INVALID_TOKEN' }, 403);
    }
    if (pathname === '/api/services') {
      state.serviceRequests++;
      if (state.serviceDelay) {
        await new Promise((resolve) => setTimeout(resolve, state.serviceDelay));
      }
      return json(state.services);
    }
    if (pathname === '/api/cli-commands') {
      state.commandRequests++;
      return json({
        commands: [
          {
            name: 'pg status',
            desc: '查看 PostgreSQL 状态',
            group: 'postgres',
            type: 'function',
          },
        ],
        source: '~/.zshrc',
      });
    }
    if (pathname.endsWith('/log')) {
      state.logs++;
      return json({ log: `ready\nupdate ${state.logs}`, lines: 2 });
    }
    if (pathname.endsWith('/log/clear')) return json({ cleared: true });
    if (pathname.endsWith('/stop')) {
      state.stops++;
      return json({
        stopped: state.stopSucceeds,
        remaining: state.stopSucceeds ? [] : [123],
      });
    }
    if (pathname.endsWith('/deploy')) {
      state.deploys++;
      state.services[1].deploying = true;
      setTimeout(() => {
        state.services[1].deploying = false;
        state.services[1].deployOutcome = 'success';
        state.services[1].lastDeployAt = new Date().toISOString();
      }, 300);
      return json({ deploying: true });
    }
    return json({ started: true });
  });
  await page.goto('/services');
  await expect(page.getByText('共 4 个服务')).toBeVisible();
  return state;
}

test('service tools stay hidden until their dialogs are opened', async ({
  page,
  context,
}) => {
  const state = await mock(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('服务操作和部署结果会记录在这里。')).toHaveCount(
    0,
  );
  await expect(page.getByText('pg status', { exact: true })).toHaveCount(0);
  expect(state.commandRequests).toBe(0);

  const activityButton = page.getByRole('button', {
    name: '最近操作',
    exact: true,
  });
  await activityButton.focus();
  await page.keyboard.press('Enter');
  const activity = page.getByRole('dialog', { name: '最近操作', exact: true });
  await expect(activity).toContainText('服务操作和部署结果会记录在这里。');
  await page.keyboard.press('Escape');
  await expect(activity).toHaveCount(0);
  await expect(activityButton).toBeFocused();

  await page.getByRole('button', { name: '全局快捷命令', exact: true }).click();
  const commands = page.getByRole('dialog', {
    name: '全局快捷命令',
    exact: true,
  });
  await expect(commands.getByText('pg status', { exact: true })).toBeVisible();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await commands.getByRole('button', { name: /pg status/ }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'pg status',
  );
  const beforeRefresh = state.commandRequests;
  await commands.getByRole('button', { name: '刷新快捷命令' }).click();
  await expect.poll(() => state.commandRequests).toBe(beforeRefresh + 1);
  await commands.getByRole('button', { name: '关闭全局快捷命令' }).click();
  await expect(commands).toHaveCount(0);
});

test('a running legacy agent is upgraded before service actions', async ({
  page,
}) => {
  const state = await mock(page);
  state.legacyAgent = true;
  await page
    .getByRole('button', { name: '停止 my-dashboard', exact: true })
    .click();
  await expect(page.getByText('「my-dashboard」停止成功')).toBeVisible();
  expect(state.agentStarts).toBe(1);
  expect(state.tokens).toBe(2);
  expect(state.stops).toBe(1);
  await expect(page.getByText('无法建立本机会话，请重新连接')).toHaveCount(0);
});

test('rapid page refreshes merge in-flight requests and keep the nav icon in place', async ({
  page,
}) => {
  const state = await mock(page);
  const button = page.getByRole('button', {
    name: '刷新当前页面',
    exact: true,
  });
  await expect(button).toBeVisible();
  const initialBounds = await button.boundingBox();

  state.serviceDelay = 500;
  const before = state.serviceRequests;
  await button.click();
  for (let index = 0; index < 5; index++) await button.dispatchEvent('click');
  // 请求仍在飞行中：并发点击合并成一次请求，不会叠加
  await expect.poll(() => state.serviceRequests).toBe(before + 1);
  expect(await button.boundingBox()).toEqual(initialBounds);

  state.serviceDelay = 0;
  for (let index = 0; index < 3; index++) {
    const count = state.serviceRequests;
    await button.click();
    await expect.poll(() => state.serviceRequests).toBeGreaterThan(count);
  }

  // 页面重新可见时走同一条刷新路径，补一次最新状态
  const beforeBackground = state.serviceRequests;
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect
    .poll(() => state.serviceRequests)
    .toBeGreaterThan(beforeBackground);

  await expect(button).toBeVisible();
  expect(await button.boundingBox()).toEqual(initialBounds);
});

test('keyboard log toggle stays on page and expanded logs update', async ({
  page,
}) => {
  const state = await mock(page);
  let popups = 0;
  page.on('popup', () => {
    popups++;
  });
  const row = page.getByRole('article', { name: 'my-dashboard', exact: true });
  const button = row.getByRole('button', { name: '日志', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(row.getByLabel('my-dashboard 运行日志内容')).toContainText(
    'update',
  );
  await expect.poll(() => state.logs).toBeGreaterThan(1);
  expect(popups).toBe(0);
  await button.click();
  const count = state.logs;
  await page.waitForTimeout(2500);
  expect(state.logs).toBe(count);
});

test('stop failure never shows success and expired session is renewed', async ({
  page,
}) => {
  const state = await mock(page);
  state.stopSucceeds = false;
  await page
    .getByRole('button', { name: '停止 my-dashboard', exact: true })
    .click();
  await expect(
    page.getByText('服务仍在运行，请检查日志后重试', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('「my-dashboard」停止成功')).toHaveCount(0);
  state.stopSucceeds = true;
  state.expireToken = true;
  await page
    .getByRole('button', { name: '停止 my-dashboard', exact: true })
    .click();
  await expect(page.getByText('「my-dashboard」停止成功')).toBeVisible();
  expect(state.tokens).toBe(2);
  expect(state.stops).toBe(2);
});

test('deployment completion releases button and reports result', async ({
  page,
}) => {
  const state = await mock(page);
  const button = page.getByRole('button', {
    name: '部署 study-lab',
    exact: true,
  });
  await button.click();
  await expect(page.getByText('部署成功', { exact: true })).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(page.getByText(/最近部署成功/)).toBeVisible();
  expect(state.deploys).toBe(1);
  await page.getByRole('button', { name: '最近操作', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '最近操作' })).toContainText(
    '部署完成',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: '最近操作' })).toHaveCount(0);
});

test('offline status disables actions and reconnect reloads commands', async ({
  page,
}) => {
  const state = await mock(page);
  state.online = false;
  // 停掉后台轮询后，状态只靠侧边栏刷新图标取数，用它手动切到离线态
  await page
    .getByRole('button', { name: '刷新当前页面', exact: true })
    .click();
  await expect(page.getByText('本机服务连接中断')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '停止 my-dashboard', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: '全局快捷命令', exact: true }).click();
  await expect(page.getByText('连接恢复后显示快捷命令。')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '恢复连接', exact: true }).click();
  await expect(page.getByText('本机服务连接中断')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '停止 my-dashboard', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: '全局快捷命令', exact: true }).click();
  await expect(page.getByText('pg status', { exact: true })).toBeVisible();
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`layout at ${width}px keeps content visible and navigation usable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.screenshot({
      path: `test-results/services-${width}.png`,
      fullPage: true,
    });
    const main = page.getByRole('main');
    await expect(main.getByText('个人工作台', { exact: true })).toBeVisible();
    const hit = await main
      .getByText('个人工作台', { exact: true })
      .evaluate((element) => {
        const box = element.getBoundingClientRect();
        return (
          document.elementFromPoint(box.x + 2, box.y + 2)?.closest('main') !==
          null
        );
      });
    expect(hit).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const name of ['最近操作', '全局快捷命令']) {
      await page.getByRole('button', { name, exact: true }).click();
      const dialog = page.getByRole('dialog', { name, exact: true });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
    if (width < 768) {
      await page.getByRole('button', { name: '展开导航' }).click();
      await page.getByRole('link', { name: '英语', exact: true }).click();
      await expect(
        page.getByRole('button', { name: '展开导航' }),
      ).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/english-${width}.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: '展开导航' }).click();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: '展开导航' }),
      ).toBeVisible();
    }
  });
}

test('theme persists and all services stay listed in dark mode', async ({
  page,
}) => {
  await mock(page);
  const unnamed = await page
    .locator('button')
    .evaluateAll(
      (buttons) =>
        buttons.filter(
          (button) =>
            !button.textContent.trim() &&
            !button.getAttribute('aria-label') &&
            !button.getAttribute('aria-labelledby'),
        ).length,
    );
  expect(unnamed).toBe(0);
  await page.getByRole('button', { name: '切换到暗色主题' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute(
    'data-mantine-color-scheme',
    'dark',
  );
  await page.screenshot({
    path: 'test-results/services-dark.png',
    fullPage: true,
  });
  for (const id of ['my-dashboard', 'study-lab', 'postgres', 'redis']) {
    await expect(
      page.getByRole('article', { name: id, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText('3000', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: '切换到亮色主题' }).click();
  await page.screenshot({
    path: 'test-results/services-light.png',
    fullPage: true,
  });
});
