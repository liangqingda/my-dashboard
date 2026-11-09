/**
 * 服务页常量。
 */

import type { PrimaryServiceAction } from './types';

/** 主操作按钮色调：停止用灰、启动用青、重启用蓝 */
export const PRIMARY_ACTION_TONES: Record<PrimaryServiceAction, string> = {
  start: 'teal',
  stop: 'gray',
  restart: 'blue',
};

/** 展开日志面板后的刷新间隔（毫秒）：只在用户展开时轮询，收起即停 */
export const LOG_REFRESH_INTERVAL = 2000;

/** 单次读取的日志行数 */
export const LOG_TAIL_LINES = 120;
