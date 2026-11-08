#!/usr/bin/env bash
# my-dashboard 起全套：同时拉起服务管理 agent 与 Vite 页面（pnpm start 与开机自启共用）。
# 幂等：端口已在监听就跳过，可以随时重复执行。
# 由 LaunchAgent（com.mydashboard.dashboard）在 GUI 会话中调用。
set -u
cd /Users/lqd/projects/my-dashboard || exit 1

# 1) agent：服务管理后端（127.0.0.1:8787），端口未监听才启动
if ! lsof -iTCP:8787 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  nohup node agent/server.mjs >/tmp/my-dashboard-agent.log 2>&1 &
fi

# 2) Vite dev：页面（localhost:3000），端口未监听才启动
if ! lsof -iTCP:3000 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  nohup pnpm dev >/tmp/my-dashboard-dev.log 2>&1 &
fi

exit 0
