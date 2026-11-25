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
 * 进度条悬停预览：帧图按指针位置现抽（见 `hooks/use-video-frames`）。预览框宽度取
 * 视频**画面实际显示区域**的 60%（不是舞台宽度，竖屏视频两侧黑边不算在内），
 * 高度按画面比例算并受舞台高度约束；帧图分辨率跟着预览框 × 设备像素比走，窗口越大越清。
 *
 * 换片由调用方用 `key` 重挂（每个视频一个实例），不在这里监听 `src` 变化清状态。
 */

import { useEffect, useRef, useState } from 'react';
import { IconAlertTriangleFilled } from '@tabler/icons-react';
import { Loader } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';

import { cx } from '@/utils/cx';

import {
  CONTROLS_HIDE_DELAY,
  SEEK_PREVIEW_DPR_CAP,
  VIDEO_FALLBACK_ASPECT,
} from './constants';
import { useControlsVisibility } from './hooks/use-controls-visibility';
import { useVideoFrames } from './hooks/use-video-frames';
import { seekPreviewSize, type SeekPreviewSize } from './utils/preview-size';
import VideoControls from './VideoControls';
import type { FreeVideoProps } from './types';

import styles from './index.scss';

/** 播放状态：loading 还没解出画面，ready 可播，error 浏览器解不了 */
type PlayerStatus = 'loading' | 'ready' | 'error';

const FreeVideo = ({ className, nav, src, videoRef }: FreeVideoProps) => {
  const ownRef = useRef<HTMLVideoElement | null>(null);
  /** 舞台引用：预览框尺寸按它和视频画面比例算 */
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** 抽帧探针：不进画面、不接指针，只给进度条悬停预览取帧 */
  const probeRef = useRef<HTMLVideoElement | null>(null);
  const mergedRef = useMergedRef(ownRef, videoRef);
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [buffering, setBuffering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  /** 视频画面比例：竖屏 / 宽幅视频的预览框高矮靠它 */
  const [videoAspect, setVideoAspect] = useState(VIDEO_FALLBACK_ASPECT);
  /** 预览框尺寸：跟着舞台与视频比例变化 */
  const [previewSize, setPreviewSize] = useState<SeekPreviewSize>(() =>
    seekPreviewSize({ aspect: VIDEO_FALLBACK_ASPECT, stageHeight: 0, stageWidth: 0 }),
  );
  /** 控制栏显隐：暂停恒显示，播放中指针静止一会儿收起 */
  const {
    enterControls,
    hold: holdControls,
    leaveControls,
    leavePlayer,
    resume: resumeControls,
    reveal,
    visible: controlsVisible,
  } = useControlsVisibility(CONTROLS_HIDE_DELAY);

  /** 帧图最长边：预览框宽 × 设备像素比（封顶 2 倍），窗口越大帧图越清 */
  const frameLongestEdge = Math.round(
    previewSize.width * Math.min(window.devicePixelRatio, SEEK_PREVIEW_DPR_CAP),
  );
  const { ready: previewReady, requestFrame } = useVideoFrames({
    frameLongestEdge,
    probeRef,
    src,
  });

  /** 舞台尺寸或画面比例变化时重算预览框：窗口缩放、换屏、竖屏视频都靠这次计算 */
  useEffect(() => {
    const stage = stageRef.current;

    if (stage === null) {
      return;
    }

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const next = seekPreviewSize({
        aspect: videoAspect,
        stageHeight: rect.height,
        stageWidth: rect.width,
      });

      setPreviewSize((previous) =>
        previous.height === next.height && previous.width === next.width
          ? previous
          : next,
      );
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(stage);

    return () => observer.disconnect();
  }, [videoAspect]);

  /** 暂停 / 播完：控制栏常驻，不再计时收起 */
  const showControlsForPaused = () => {
    setPlaying(false);
    holdControls();
  };

  /** 开播：控制栏先留着，指针一停再收 */
  const handlePlaying = () => {
    setPlaying(true);
    setBuffering(false);
    resumeControls();
  };

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
      onPointerLeave={leavePlayer}
      onPointerMove={reveal}
    >
      <div className={styles.stage} ref={stageRef}>
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
            const { duration: total, videoHeight, videoWidth } = event.currentTarget;

            setDuration(total);
            setStatus('ready');

            if (videoWidth > 0 && videoHeight > 0) {
              setVideoAspect(videoWidth / videoHeight);
            }
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
        onPointerEnter={enterControls}
        onPointerLeave={leaveControls}
      >
        <VideoControls
          currentTime={currentTime}
          duration={duration}
          enabled={status === 'ready'}
          muted={muted}
          nav={nav}
          onSeek={seek}
          onToggleMute={toggleMute}
          onTogglePlay={togglePlay}
          onVolumeChange={changeVolume}
          playing={playing}
          previewHeight={previewSize.height}
          previewReady={previewReady}
          previewWidth={previewSize.width}
          requestFrame={requestFrame}
          volume={volume}
        />
      </div>

      {/*
        抽帧探针：同源同地址的第二支 `<video>`，只按需 seek 取帧；
        1px + 透明 + 不接指针，看不见也不参与布局。用正在播的那支会把它 seek 走。
        `preload="auto"`：按需抽帧要的就是「seek 后立刻有画面」，先拉点数据比事后临时请求快；
        探针本身不播、不出声，多下的数据不影响主视频（同一地址走同一份缓存）。
      */}
      <video
        aria-hidden="true"
        className={styles.frameProbe}
        preload="auto"
        ref={probeRef}
        src={src}
        tabIndex={-1}
      />
    </div>
  );
};

export default FreeVideo;
