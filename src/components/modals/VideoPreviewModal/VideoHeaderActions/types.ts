/** 视频预览 header 第一组操作（目录 / 截图 / 导出音频 / 外部打开）的入参 */

/** header 第一组操作的入参 */
export type VideoHeaderActionsProps = {
  /** 侧栏当前是否显示：决定目录按钮的图标与 tip */
  sidebarVisible: boolean;
  /** 截图正在落盘：相机按钮转圈 */
  capturing: boolean;
  /** 音频正在抽取 / 落盘：导出按钮转圈 */
  exportingAudio: boolean;
  /** 显示 / 隐藏视频列表（与 `S` 键同一口径） */
  onToggleSidebar: () => void;
  /** 截当前一帧（与 `Enter` 同一口径） */
  onCapture: () => void;
  /** 请求导出音频：只开二次确认，不直接开跑；不传则没有这颗按钮 */
  onRequestExportAudio?: () => void;
  /** 用外部播放器打开当前视频；不传则没有这颗按钮 */
  onOpenExternal?: () => void;
};
