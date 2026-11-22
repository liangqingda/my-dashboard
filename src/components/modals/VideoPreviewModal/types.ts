/**
 * 视频预览弹窗的契约：弹窗只认「一组可播放条目 + 当前条目 + 截图能力」，
 * 目录语义与截图落到哪里由调用方决定。
 */

/** 弹窗里可切换的一条视频 */
export type VideoPreviewItem = {
  /** 条目唯一标识（页面用文件路径） */
  id: string;
  /** 展示名（文件名） */
  name: string;
  /** 视频地址（浏览器可直接播放的 URL） */
  src: string;
};

/** 截图落盘成功后的回执：文案由调用方拼（它才知道存到了哪里） */
export type VideoPreviewCaptureReceipt = {
  /** 成功提示的正文 */
  message: string;
};

/** 视频预览弹窗的入参 */
export type VideoPreviewModalProps = {
  /** 是否打开 */
  opened: boolean;
  /** 当前目录里的视频列表：header 计数与翻篇、侧栏都按这份算 */
  items: readonly VideoPreviewItem[];
  /** 当前条目的 id；不在列表里时不渲染内容 */
  activeId: string | null;
  /** 切换条目（侧栏点选、翻篇都走它） */
  onSelect: (id: string) => void;
  /** 关闭 */
  onClose: () => void;
  /** 截图当前视频帧：入参是 PNG data URL，返回原名或落盘后的回执 */
  onCapture: (dataUrl: string) => Promise<VideoPreviewCaptureReceipt>;
};
