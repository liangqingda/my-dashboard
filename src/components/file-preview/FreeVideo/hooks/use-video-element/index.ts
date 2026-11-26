/**
 * 主视频元素上的动作与事件同步：播放 / 暂停、seek、音量、静音与各状态回调都收在这里，
 * 播放器主体只把 `<video>` 的事件挂上来，不再逐段判断「元素存不存在、播没解出来」。
 */

import type { RefObject, ReactEventHandler } from 'react';

/** 出参：播放器把这些动作挂到控制栏与 `<video>` 事件上 */
export type VideoElementApi = {
  /** 切播放 / 暂停；失败（编码不支持）交给 error 事件接管 */
  togglePlay: () => void;
  /** 拖到某一秒：连续 seek，时间文本跟着走 */
  seek: (seconds: number) => void;
  /** 调音量：调到非零时自动取消静音 */
  changeVolume: (next: number) => void;
  /** 切静音位 */
  toggleMute: () => void;
  /** 元数据 / 加载 / 出错 / 缓冲等事件处理，逐个对齐 `<video>` 的同名事件 */
  handleCanPlay: ReactEventHandler<HTMLVideoElement>;
  handleError: ReactEventHandler<HTMLVideoElement>;
  handleLoadedData: ReactEventHandler<HTMLVideoElement>;
  handleLoadedMetadata: ReactEventHandler<HTMLVideoElement>;
  /** 暂停 / 播完：只记成未播放，控制栏的显隐不跟着变（与浮层 header 同一套自动收起） */
  handlePause: ReactEventHandler<HTMLVideoElement>;
  /** 开播：记成在播、清掉缓冲转圈 */
  handlePlaying: ReactEventHandler<HTMLVideoElement>;
  handleTimeUpdate: ReactEventHandler<HTMLVideoElement>;
  handleVolumeChange: ReactEventHandler<HTMLVideoElement>;
  handleWaiting: ReactEventHandler<HTMLVideoElement>;
};

/** 入参：元素引用 + 各状态的 setter，hook 不自己持有播放器状态 */
export type UseVideoElementOptions = {
  /** 主视频元素引用 */
  elementRef: RefObject<HTMLVideoElement | null>;
  onStatus: (status: 'loading' | 'ready' | 'error') => void;
  onBuffering: (buffering: boolean) => void;
  onPlaying: (playing: boolean) => void;
  onCurrentTime: (seconds: number) => void;
  onDuration: (seconds: number) => void;
  onMuted: (muted: boolean) => void;
  onVolume: (volume: number) => void;
  /** 元数据拿到后再解出画面：避免加载态一直挂着 */
  onReady: () => void;
  /** 元数据拿到后写回画面比例（宽 / 高） */
  onAspect: (ratio: number) => void;
};

export const useVideoElement = ({
  elementRef,
  onAspect,
  onBuffering,
  onCurrentTime,
  onDuration,
  onMuted,
  onPlaying,
  onReady,
  onStatus,
  onVolume,
}: UseVideoElementOptions): VideoElementApi => {
  const togglePlay = () => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    if (element.paused) {
      void element.play().catch(() => undefined);

      return;
    }

    element.pause();
  };

  const seek = (seconds: number) => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    element.currentTime = seconds;
    onCurrentTime(seconds);
  };

  const changeVolume = (next: number) => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    element.volume = next;

    if (next > 0 && element.muted) {
      element.muted = false;
    }
  };

  const toggleMute = () => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    element.muted = !element.muted;
  };

  const handlePause: ReactEventHandler<HTMLVideoElement> = () => {
    onPlaying(false);
  };

  const handlePlaying: ReactEventHandler<HTMLVideoElement> = () => {
    onPlaying(true);
    onBuffering(false);
  };

  const handleCanPlay: ReactEventHandler<HTMLVideoElement> = () => {
    onReady();
  };

  const handleError: ReactEventHandler<HTMLVideoElement> = () => {
    onStatus('error');
  };

  const handleLoadedData: ReactEventHandler<HTMLVideoElement> = () => {
    onReady();
  };

  const handleLoadedMetadata: ReactEventHandler<HTMLVideoElement> = () => {
    const element = elementRef.current;

    if (element === null) {
      return;
    }

    onDuration(element.duration);
    onReady();

    if (element.videoWidth > 0 && element.videoHeight > 0) {
      onAspect(element.videoWidth / element.videoHeight);
    }
  };

  const handleTimeUpdate: ReactEventHandler<HTMLVideoElement> = (event) => {
    onCurrentTime(event.currentTarget.currentTime);
  };

  const handleVolumeChange: ReactEventHandler<HTMLVideoElement> = (event) => {
    onMuted(event.currentTarget.muted);
    onVolume(event.currentTarget.muted ? 0 : event.currentTarget.volume);
  };

  const handleWaiting: ReactEventHandler<HTMLVideoElement> = () => {
    onBuffering(true);
  };

  return {
    changeVolume,
    handleCanPlay,
    handleError,
    handleLoadedData,
    handleLoadedMetadata,
    handlePause,
    handlePlaying,
    handleTimeUpdate,
    handleVolumeChange,
    handleWaiting,
    seek,
    toggleMute,
    togglePlay,
  };
};
