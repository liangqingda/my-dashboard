#!/usr/bin/env bash
# my-dashboard 开机自启：同时拉起服务管理 agent 与 Vite 页面。
# 由 LaunchAgent（com.mydashboard.dashboard）在 GUI 会话中调用。
set -u
cd /Users/lqd/projects/my-dashboard || exit 1

# 1) agent：服务管理后端（127.0.0.1:8787），未运行才启动
if ! pgrep -f 'agent/server.mjs' >/dev/null 2>&1; then
  nohup node agent/server.mjs >/tmp/my-dashboard-agent.log 2>&1 &
fi

# 2) Vite dev：页面（localhost:3000），端口未监听才启动
if ! lsof -iTCP:3000 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  nohup pnpm dev >/tmp/my-dashboard-dev.log 2>&1 &
fi

exit 0
