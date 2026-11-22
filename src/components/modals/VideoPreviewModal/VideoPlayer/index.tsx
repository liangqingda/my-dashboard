/**
 * 视频播放器：`<video>` + 项目自己的控制栏（播放 / 进度 / 时间 / 静音 / 音量）。
 *
 * 不用浏览器自带 `controls`：原生控制栏样式跟着系统走，且自带一个「网页元素全屏」按钮，
 * 与本弹窗「整屏全屏 + header 自动隐藏」的交互不是同一件事。播放进度、音量与键盘动作
 * 都由这里驱动，视频元素本身只用 `ref` 交给弹窗（截图取当前帧、空格切播放）。
 *
 * 换片由调用方用 `key` 重挂（每个视频一个实例），不在这里监听 `src` 变化清状态。
 */

import { useState } from 'react';
import { IconAlertTriangleFilled, IconPlayerPlayFilled } from '@tabler/icons-react';
import { Loader, UnstyledButton } from '@mantine/core';

import VideoControls from './VideoControls';
import type { VideoPlayerProps } from './types';

import styles from './index.scss';

/** 播放状态：loading 还没解出画面，ready 可播，error 浏览器解不了 */
type PlayerStatus = 'loading' | 'ready' | 'error';

const VideoPlayer = ({ src, videoRef }: VideoPlayerProps) => {
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [buffering, setBuffering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  /** 播放 / 暂停：用户手势里调用，失败（编码不支持）由 error 事件接管 */
  const togglePlay = () => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    if (element.paused) {
      void element.play().catch(() => undefined);

      return;
    }

    element.pause();
  };

  /** 拖进度条：连续 seek，时间文本跟着走，不等 `timeupdate` */
  const seek = (seconds: number) => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    element.currentTime = seconds;
    setCurrentTime(seconds);
  };

  /** 音量：调到非零时自动取消静音（用户拉音量就是想听见） */
  const changeVolume = (next: number) => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    element.volume = next;

    if (next > 0 && element.muted) {
      element.muted = false;
    }
  };

  /** 静音开关 */
  const toggleMute = () => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    element.muted = !element.muted;
  };

  const showPlayOverlay = status === 'ready' && !playing && !buffering;

  return (
    <div className={styles.player}>
      <div className={styles.stage}>
        <video
          className={styles.video}
          disablePictureInPicture
          onCanPlay={() => setStatus('ready')}
          onClick={togglePlay}
          onEnded={() => setPlaying(false)}
          onError={() => setStatus('error')}
          onLoadedData={() => {
            setStatus('ready');
            setBuffering(false);
          }}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration);
            setStatus('ready');
          }}
          onPause={() => setPlaying(false)}
          onPlaying={() => {
            setPlaying(true);
            setBuffering(false);
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onVolumeChange={(event) => {
            setMuted(event.currentTarget.muted);
            setVolume(event.currentTarget.muted ? 0 : event.currentTarget.volume);
          }}
          onWaiting={() => setBuffering(true)}
          playsInline
          preload="auto"
          ref={videoRef}
          src={src}
        />

        {status === 'loading' ? (
          <div className={styles.overlay}>
            <Loader color="gray" size="sm" />
            <span className={styles.overlayText}>正在读取视频…</span>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className={styles.overlay}>
            <IconAlertTriangleFilled className={styles.errorIcon} size={28} />
            <span className={styles.overlayText}>
              无法播放这个视频：浏览器不支持该文件格式或编码
            </span>
          </div>
        ) : null}

        {showPlayOverlay ? (
          <UnstyledButton
            aria-label="播放"
            className={styles.bigPlay}
            onClick={togglePlay}
            type="button"
          >
            <IconPlayerPlayFilled size={26} />
          </UnstyledButton>
        ) : null}

        {buffering && status === 'ready' ? (
          <div className={styles.overlay}>
            <Loader color="gray" size="sm" />
          </div>
        ) : null}
      </div>

      <VideoControls
        currentTime={currentTime}
        duration={duration}
        enabled={status === 'ready'}
        muted={muted}
        onSeek={seek}
        onToggleMute={toggleMute}
        onTogglePlay={togglePlay}
        onVolumeChange={changeVolume}
        playing={playing}
        volume={volume}
      />
    </div>
  );
};

export default VideoPlayer;
