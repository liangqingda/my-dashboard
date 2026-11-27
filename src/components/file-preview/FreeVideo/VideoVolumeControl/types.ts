/**
 * 喇叭按钮 + 竖向音量浮层的契约：音量与静音状态由播放器持有，这里只展示与回调。
 */

/** 音量控件入参 */
export type VideoVolumeControlProps = {
  /** 当前音量（0–1） */
  volume: number;
  /** 是否静音 */
  muted: boolean;
  /** 视频是否已解析完成（loading / error 时禁用） */
  enabled: boolean;
  /** 静音 / 取消静音 */
  onToggleMute: () => void;
  /** 调整音量（0–1）；调到非零由调用方负责取消静音 */
  onVolumeChange: (volume: number) => void;
  /** 固定深底浅字：按钮取媒体浮层浅字档，压在画面上不随主题反转 */
  tipDark?: boolean;
};
