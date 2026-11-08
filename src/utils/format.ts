/**
 * 时间格式化：页面里所有「时刻 / 日期时间」都走这里，保证全站格式一致。
 */

const CLOCK_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  second: '2-digit',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** 接受 ISO 字符串、时间戳或 Date，统一转成 Date */
const toDate = (value: string | number | Date): Date => new Date(value);

/** 时分，如 10:23（用于「已保存・10:23」这类短提示） */
export const formatClock = (value: string | number | Date): string =>
  CLOCK_FORMATTER.format(toDate(value));

/** 时分秒，如 10:23:45（用于「上次更新」） */
export const formatTime = (value: string | number | Date): string =>
  TIME_FORMATTER.format(toDate(value));

/** 完整日期时间，如 2026/11/08 10:23（用于最近启动、最近操作） */
export const formatDateTime = (value: string | number | Date): string =>
  DATE_TIME_FORMATTER.format(toDate(value));
