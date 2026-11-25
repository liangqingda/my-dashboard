/**
 * 悬停预览浮层的入参：帧图、尺寸与落点都由父组件给，浮层不自己算时间也不抽帧。
 */

/** 悬停预览浮层入参 */
export type SeekPreviewProps = {
  /** 这一处的帧图（JPEG data URL）；还没抽到或抽失败时为 null，浮层显示等待 */
  frame: string | null;
  /** 浮层中心相对进度条容器左沿的像素位置（已夹在容器内） */
  left: number;
  /** 浮层宽度（CSS px）：跟着视频画面大小走 */
  width: number;
  /** 浮层高度（CSS px） */
  height: number;
  /** 这一处的时间（秒）：时间标签显示它，与帧图的取帧时间同源 */
  time: number;
};
