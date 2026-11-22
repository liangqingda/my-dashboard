/**
 * 播放器控制栏：播放 / 暂停、进度、时间、静音与音量。
 *
 * 进度条拖到哪就 seek 到哪（拖动过程连续 seek，松手不额外跳一次）；
 * 时长还没解出来时进度条禁用，避免 0 上限的滑块把当前时间压成 0。
 */

import { Slider } from '@mantine/core';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

import { formatDuration, formatProgressLabel } from '../../utils/format-duration';

import type { VideoControlsProps } from './types';

import styles from './index.scss';

/** 控制栏图标的尺寸与线宽：与弹窗 header 图标同一档 */
const ICON_SIZE = 16;
const ICON_STROKE = 1.8;

const VideoControls = ({
  currentTime,
  duration,
  enabled,
  muted,
  onSeek,
  onToggleMute,
  onTogglePlay,
  onVolumeChange,
  playing,
  volume,
}: VideoControlsProps) => (
  <div className={styles.controls}>
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

    <FreeIconAction
      disabled={!enabled}
      label={muted ? '取消静音' : '静音'}
      onClick={onToggleMute}
    >
      {muted ? (
        <IconVolumeOff size={ICON_SIZE} stroke={ICON_STROKE} />
      ) : (
        <IconVolume size={ICON_SIZE} stroke={ICON_STROKE} />
      )}
    </FreeIconAction>

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
);

export default VideoControls;
