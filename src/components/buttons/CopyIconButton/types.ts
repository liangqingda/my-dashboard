/**
 * 复制图标按钮的 props。
 */

/** 复制图标按钮的入参 */
export type CopyIconButtonProps = {
  /** 要写进剪贴板的文本 */
  text: string;
  /** 按钮含义，tooltip 与 aria-label 用同一句人话 */
  label: string;
  /** 复制成功后的 tooltip 文案 */
  copiedLabel?: string;
  /** 按钮尺寸；表格与标题栏用 sm，字段行里贴着文字用 xs，需要放大时传 lg */
  size?: 'xs' | 'sm' | 'lg';
  /** 图标像素尺寸，默认与标题栏同档 */
  iconSize?: number;
  /** 附加 class，供调用方补布局（如表格单元格里居中） */
  className?: string;
};
