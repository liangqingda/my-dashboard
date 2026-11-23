/**
 * 播放器控制栏：翻篇 / 播放 / 进度 / 时间 / 静音与音量。
 *
 * 翻篇箭头排在播放键两侧（常见播放器的位置），是因为「上一条 / 下一条」在这里就是前后两格；
 * 音量条平时不占地方，指针停在喇叭上才往上浮出——把横向宽度让给进度条。
 *
 * 进度条拖到哪就 seek 到哪（拖动过程连续 seek，松手不额外跳一次）；
 * 时长还没解出来时进度条禁用，避免 0 上限的滑块把当前时间压成 0。
 */

import { Slider } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

import { formatDuration, formatProgressLabel } from '../utils/format-duration';

import type { VideoControlsProps } from './types';

import styles from './index.scss';

/** 控制栏图标的尺寸与线宽：与弹窗 header 图标同一档 */
const ICON_SIZE = 16;
const ICON_STROKE = 1.8;

/** 翻篇箭头比播放键略大一圈：一左一右夹着播放键，要看得出是「前后两格」 */
const STEP_ICON_SIZE = 18;

const VideoControls = ({
  currentTime,
  duration,
  enabled,
  muted,
  nav,
  onSeek,
  onToggleMute,
  onTogglePlay,
  onVolumeChange,
  playing,
  volume,
}: VideoControlsProps) => (
  <div className={styles.controls}>
    {nav ? (
      <FreeIconAction
        disabled={nav.onPrevious === null}
        label="上一个视频（[）"
        onClick={nav.onPrevious ?? undefined}
      >
        <IconChevronLeft size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>
    ) : null}

    <FreeIconAction
      disabled={!enabled}
      label={playing ? '暂停（空格）' : '播放（空格）'}
      onClick={onTogglePlay}
    >
      {playing ? (
        <IconPlayerPauseFilled size={ICON_SIZE} />
      ) : (
        <IconPlayerPlayFilled size={ICON_SIZE} />
      )}
    </FreeIconAction>

    {nav ? (
      <FreeIconAction
        disabled={nav.onNext === null}
        label="下一个视频（]）"
        onClick={nav.onNext ?? undefined}
      >
        <IconChevronRight size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>
    ) : null}

    <Slider
      aria-label="播放进度"
      className={styles.progress}
      disabled={!enabled || duration <= 0}
      label={formatProgressLabel}
      max={duration > 0 ? duration : 1}
      onChange={onSeek}
      size="xs"
      step={0.1}
      thumbLabel="播放进度"
      value={Math.min(currentTime, duration > 0 ? duration : 1)}
    />

    <span className={styles.time}>
      {formatDuration(currentTime)} / {formatDuration(duration)}
    </span>

    {/*
      音量：喇叭键 + 悬停浮出的横向音量条。tip 关掉（`tooltip="none"`），
      否则提示会正好落在浮出的音量条上，两套浮层互相挡。
    */}
    <div className={styles.volumeWrap}>
      <FreeIconAction
        disabled={!enabled}
        label={muted ? '取消静音' : '静音'}
        onClick={onToggleMute}
        tooltip="none"
      >
        {muted ? (
          <IconVolumeOff size={ICON_SIZE} stroke={ICON_STROKE} />
        ) : (
          <IconVolume size={ICON_SIZE} stroke={ICON_STROKE} />
        )}
      </FreeIconAction>
      <div className={styles.volumePopover}>
        <div className={styles.volumePanel}>
          <Slider
            aria-label="音量"
            className={styles.volume}
            disabled={!enabled}
            label={(value: number) => `${Math.round(value * 100)}%`}
            max={1}
            onChange={onVolumeChange}
            size="xs"
            step={0.01}
            thumbLabel="音量"
            value={muted ? 0 : volume}
          />
        </div>
      </div>
    </div>
  </div>
);

export default VideoControls;
