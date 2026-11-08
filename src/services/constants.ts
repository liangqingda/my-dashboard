/**
 * 本机服务模块的常量。
 */

import type { ServiceAction } from '@/services/types';

/** 操作文案：通知标题、最近操作记录共用 */
export const ACTION_LABELS: Record<ServiceAction, string> = {
  start: '启动',
  stop: '停止',
  restart: '重启',
  deploy: '部署',
};

/** 最近操作在 sessionStorage 里的键 */
export const ACTIVITY_STORAGE_KEY = 'dashboard-activity';

/** 最近操作最多保留的条数 */
export const ACTIVITY_LIMIT = 8;

/**
 * 有操作、部署或启动进行中时的跟踪刷新间隔（毫秒）。
 * 空闲状态不轮询：页面进入、窗口重新获得焦点、侧边栏刷新图标都会触发一次读取。
 */
export const TRACKING_REFRESH_INTERVAL = 1000;
