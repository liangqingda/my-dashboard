/**
 * 播放时长文案：秒数转 `mm:ss`，超过一小时补上小时位。
 * 与 `@/utils/format` 的「时刻」不是一回事：那个按本地钟点格式化日期，
 * 这里只把一段秒数摊成时:分:秒。非法值（NaN、负数）按 0 处理，避免出现 `NaN:NaN`。
 */
export const formatDuration = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) {
    return '00:00';
  }

  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (part: number) => String(part).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

/** 进度条的 label 文案：拖到某一秒时显示该位置的时间 */
export const formatProgressLabel = (value: number): string =>
  formatDuration(value);
