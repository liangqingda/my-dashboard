/**
 * 文件浏览页的纯函数：文件大小格式化、路径分段。不依赖 React。
 */

/** 字节数 → 可读体积（B / KB / MB / GB）；负数与 NaN 按 0 处理 */
export const formatFileSize = (bytes: number): string => {
  const size = Number.isFinite(bytes) && bytes >= 0 ? bytes : 0;

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ['KB', 'MB', 'GB'] as const;
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
};

/** 面包屑的一段：目录名 + 该段对应的绝对路径 */
export type PathSegment = {
  label: string;
  path: string;
};

/** 把绝对路径拆成可点击的分段；空串返回空数组 */
export const splitPathSegments = (dir: string): PathSegment[] => {
  const parts = dir.split('/').filter(Boolean);

  return parts.map((part, index) => ({
    label: part,
    path: `/${parts.slice(0, index + 1).join('/')}`,
  }));
};

/** 目录计数文案：文件夹数与文件数拼成一行；都为 0 时提示空目录 */
export const summarizeCount = (folders: number, files: number): string => {
  const parts = [
    folders > 0 ? `${folders} 个文件夹` : null,
    files > 0 ? `${files} 个文件` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(' · ') : '空目录';
};
