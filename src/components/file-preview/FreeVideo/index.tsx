/**
 * 视频播放器：`<video>` + 项目自己的控制栏（翻篇 / 播放 / 进度 / 时间 / 静音与音量）。
 *
 * 与「在哪预览」无关：调用方给一个地址就能播，不读路由、不弹窗、不做全屏与列表；
 * 需要取当前帧或从外部驱动播放时传 `videoRef`，组件会与内部 ref 合并后交给 `<video>`。
 *
 * 不用浏览器自带 `controls`：原生控制栏样式跟着系统走，且自带一个「网页元素全屏」按钮，
 * 与整屏预览的交互不是同一件事。
 *
 * 控制栏跟画面走：暂停恒显示，播放中指针一停就收起（1s），指针在控制栏上时始终显示。
 *
 * 换片由调用方用 `key` 重挂（每个视频一个实例），不在这里监听 `src` 变化清状态。
 */

import { useEffect, useRef, useState } from 'react';
import { IconAlertTriangleFilled } from '@tabler/icons-react';
import { Loader } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';

import { cx } from '@/utils/cx';

import { CONTROLS_HIDE_DELAY } from './constants';
import { useVideoFrames } from './hooks/use-video-frames';
import VideoControls from './VideoControls';
import type { FreeVideoProps } from './types';

import styles from './index.scss';

/** 播放状态：loading 还没解出画面，ready 可播，error 浏览器解不了 */
type PlayerStatus = 'loading' | 'ready' | 'error';

const FreeVideo = ({ className, nav, src, videoRef }: FreeVideoProps) => {
  const ownRef = useRef<HTMLVideoElement | null>(null);
  /** 抽帧探针：不进画面、不接指针，只给进度条悬停预览取帧 */
  const probeRef = useRef<HTMLVideoElement | null>(null);
  const mergedRef = useMergedRef(ownRef, videoRef);
  const { frameSpan, frames } = useVideoFrames({ probeRef, src });
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [buffering, setBuffering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  /** 控制栏是否可见：暂停恒显示，播放中指针静止一会儿就收起 */
  const [controlsVisible, setControlsVisible] = useState(true);
  /** 收起计时器：每次指针活动都重置 */
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 播放状态与「指针是否停在控制栏上」的即时副本：计时器回调读不到渲染期的 state */
  const playingRef = useRef(false);
  const hoveringControlsRef = useRef(false);

  /** 停掉收起计时（收起计时只在不该收时才会被拦住，所以先清干净） */
  const clearHideTimer = () => {
    if (hideTimerRef.current === null) {
      return;
    }

    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  /** 排一次收起：播放中、且指针不在控制栏上才真的收 */
  const scheduleHide = () => {
    clearHideTimer();

    if (!playingRef.current || hoveringControlsRef.current) {
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY);
  };

  /** 指针动一下就把控制栏亮出来，并重新开始计时 */
  const revealControls = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  /** 暂停 / 播完：控制栏常驻，不再计时收起 */
  const showControlsForPaused = () => {
    playingRef.current = false;
    setPlaying(false);
    clearHideTimer();
    setControlsVisible(true);
  };

  /** 开播：控制栏先留着，指针一停再收 */
  const handlePlaying = () => {
    playingRef.current = true;
    setPlaying(true);
    setBuffering(false);
    scheduleHide();
  };

  /** 卸载时清掉挂着的计时器 */
  useEffect(
    () => () => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    },
    [],
  );

  /** 播放 / 暂停：用户手势里调用，失败（编码不支持）由 error 事件接管 */
  const togglePlay = () => {
    const element = ownRef.current;

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
    const element = ownRef.current;

    if (!element) {
      return;
    }

    element.currentTime = seconds;
    setCurrentTime(seconds);
  };

  /** 音量：调到非零时自动取消静音（用户拉音量就是想听见） */
  const changeVolume = (next: number) => {
    const element = ownRef.current;

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
    const element = ownRef.current;

    if (!element) {
      return;
    }

    element.muted = !element.muted;
  };

  return (
    <div
      className={cx(styles.player, className)}
      onPointerLeave={() => scheduleHide()}
      onPointerMove={() => revealControls()}
    >
      <div className={styles.stage}>
        <video
          className={styles.video}
          disablePictureInPicture
          onCanPlay={() => setStatus('ready')}
          onClick={togglePlay}
          onEnded={showControlsForPaused}
          onError={() => setStatus('error')}
          onLoadedData={() => {
            setStatus('ready');
            setBuffering(false);
          }}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration);
            setStatus('ready');
          }}
          onPause={showControlsForPaused}
          onPlaying={handlePlaying}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onVolumeChange={(event) => {
            setMuted(event.currentTarget.muted);
            setVolume(event.currentTarget.muted ? 0 : event.currentTarget.volume);
          }}
          onWaiting={() => setBuffering(true)}
          playsInline
          preload="auto"
          ref={mergedRef}
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

        {buffering && status === 'ready' ? (
          <div className={styles.overlay}>
            <Loader color="gray" size="sm" />
          </div>
        ) : null}
      </div>

      {/*
        控制栏浮层：收起只是淡出下移、不接收指针（不移出流，画面尺寸不跟着跳）。
        `data-video-controls` 让 header 的自动隐藏知道「指针在这块上」，划过播放条不再唤出 header。
      */}
      <div
        className={cx(
          styles.controlsLayer,
          !controlsVisible && styles.controlsLayerHidden,
        )}
        data-video-controls=""
        onPointerEnter={() => {
          hoveringControlsRef.current = true;
          clearHideTimer();
          setControlsVisible(true);
        }}
        onPointerLeave={() => {
          hoveringControlsRef.current = false;
          scheduleHide();
        }}
      >
        <VideoControls
          currentTime={currentTime}
          duration={duration}
          enabled={status === 'ready'}
          frameSpan={frameSpan}
          frames={frames}
          muted={muted}
          nav={nav}
          onSeek={seek}
          onToggleMute={toggleMute}
          onTogglePlay={togglePlay}
          onVolumeChange={changeVolume}
          playing={playing}
          volume={volume}
        />
      </div>

      {/*
        抽帧探针：同源同地址的第二支 `<video>`，只拿元数据、按需 seek 取帧；
        1px + 透明 + 不接指针，看不见也不参与布局。用正在播的那支会把它 seek 走。
      */}
      <video
        aria-hidden="true"
        className={styles.frameProbe}
        preload="metadata"
        ref={probeRef}
        src={src}
        tabIndex={-1}
      />
    </div>
  );
};

export default FreeVideo;
