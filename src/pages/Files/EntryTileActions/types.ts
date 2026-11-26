/**
 * 瓦片右上角操作按钮组的 props。
 */

/** 条目类型：决定按钮 tooltip 与确认弹窗文案 */
export type EntryTileKind = 'folder' | 'file' | 'app';

/** 操作按钮组的入参 */
export type EntryTileActionsProps = {
  /** 条目类型：文件夹 / 文件 / 应用 */
  kind: EntryTileKind;
  /** 重命名本条；应用不给改名入口，不传就不画 */
  onEdit?: () => void;
  /** 请求删除本条（先弹二次确认）；应用是「卸载」 */
  onRequestDelete: () => void;
  /** 请求把这张图片设为桌面墙纸（先弹二次确认）；只有图片条目会传，不传就不画 */
  onSetWallpaper?: () => void;
  /** 外壳追加的 class，用于挂瓦片自己的 hover 显隐规则 */
  className?: string;
};
