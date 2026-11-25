/**
 * 分组标题的 props。
 */

/** 列表分组标题的入参 */
export type EntryGroupHeaderProps = {
  /** 分组名（文件夹 / 应用 / 视频 / 图片 …） */
  label: string;
  /** 这一组是否已收起 */
  collapsed: boolean;
  /** 点击整行切换展开 / 收起 */
  onToggle: () => void;
  /** 标题对齐：网格段左对齐，表格分组行整行居中；默认左对齐 */
  align?: 'center' | 'left';
};
