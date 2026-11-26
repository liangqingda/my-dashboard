/**
 * 播放器控制栏：双层排布——上层独占进度条，下层左侧是前后 / 播放 / 时间，右侧是调用方
 * 塞进来的操作组（喇叭、选集、截图、外部打开、设置、全屏这类；B 站式排布）。
 *
 * 翻篇箭头排在播放键两侧（常见播放器的位置），是因为「上一条 / 下一条」在这里就是前后两格；
 * 这两颗箭头的 tip 只在指上去的 1.5s 内出现，之后自己收掉，免得压在进度条上。
 *
 * 进度条拖到哪就 seek 到哪（拖动过程连续 seek，松手不额外跳一次）；
 * 时长还没解出来时进度条禁用，避免 0 上限的滑块把当前时间压成 0。
 *
 * 进度条悬停预览：指针停在进度条上，上方浮出「那一秒的画面 + 时间」。
 * 浮出（在一处停住 300ms）与换帧（停稳 150ms）的时序、手抖容差都收在
 * `hooks/use-seek-preview`：划过进度条不出现，移动中保留上一张帧。这里只管把指针位置
 * 摊成落点（`seekPreviewAt`）与画浮层。
 */

import { type PointerEvent as ReactPointerEvent } from 'react';
import { Slider } from '@mantine/core';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import { cx } from '@/utils/cx';

import PlayerPauseIcon from '../PlayerIcons/PlayerPauseIcon';
import PlayerPlayIcon from '../PlayerIcons/PlayerPlayIcon';
import PlayerStepBackwardIcon from '../PlayerIcons/PlayerStepBackwardIcon';
import PlayerStepForwardIcon from '../PlayerIcons/PlayerStepForwardIcon';
import { useSeekPreview } from '../hooks/use-seek-preview';
import { formatDuration, formatProgressLabel } from '../utils/format-duration';

import SeekPreview from './SeekPreview';
import type { VideoControlsProps } from './types';
import { seekPreviewAt } from './utils';

import styles from './index.scss';

/** 播放键图标尺寸；前后箭头同档 */
const PLAY_ICON_SIZE = 21;
const STEP_ICON_SIZE = 19;

/** 播放键与前后箭头的按钮边长（px）：比普通 sm 大一圈，但不撑成 lg 那种大容器 */
const CONTROL_BUTTON_SIZE = 34;

/** 翻篇箭头的 tip 只亮这么久就自己收掉：常挂在播放条上会挡住进度 */
const STEP_TIP_DURATION = 1000;

const VideoControls = ({
  actions,
  currentTime,
  duration,
  enabled,
  nav,
  onPreviewFrameChange,
  onSeek,
  onTogglePlay,
  playing,
  previewHeight,
  previewReady,
  previewWidth,
  requestFrame,
  tipDark = false,
}: VideoControlsProps) => {
  /** 悬停预览的时序与状态交给 hook：浮出门槛、停稳换帧、手抖容差都在那边 */
  const {
    down: handlePreviewDown,
    frame: shownFrame,
    leave: handlePreviewLeave,
    move: movePreview,
    preview,
  } = useSeekPreview({
    onPreviewFrameChange,
    previewReady,
    requestFrame,
  });

  /**
   * 指针横向位置 → 时间与浮层位置，再交给 hook 排浮出 / 换帧的时序。
   * 这里只管事件本身：没有 hover 的触屏、按着键的拖动、还没解出时长的情况都不出预览。
   */
  const handlePreviewMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 时长没解出来时位置摊不成时间
    if (duration <= 0) {
      return;
    }

    // 触屏没有 hover，拖进度条时不出预览
    if (event.pointerType === 'touch') {
      return;
    }

    // 按着键拖进度条：拖动过程不出预览（数字与画面都在时间那一栏看）
    if (event.buttons !== 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    movePreview(
      seekPreviewAt({
        clientX: event.clientX,
        containerLeft: rect.left,
        containerWidth: rect.width,
        duration,
        previewWidth,
      }),
      event.clientX,
    );
  };

  return (
    <div className={styles.controls}>
      {/* 上层：进度条独占一行，悬停预览浮层以它为定位祖先 */}
      <div
        className={styles.progressWrap}
        onPointerDown={handlePreviewDown}
        onPointerLeave={handlePreviewLeave}
        onPointerMove={handlePreviewMove}
      >
        <Slider
          aria-label="播放进度"
          className={styles.progress}
          classNames={{
            bar: styles.bar,
            label: cx(tipDark && styles.labelDark),
            track: styles.track,
          }}
          disabled={!enabled || duration <= 0}
          /* 预览可用时数字浮标让位给帧浮层，免两套浮层叠在一起 */
          label={previewReady ? null : formatProgressLabel}
          max={duration > 0 ? duration : 1}
          onChange={onSeek}
          size="md"
          step={0.1}
          thumbLabel="播放进度"
          value={Math.min(currentTime, duration > 0 ? duration : 1)}
        />

        {preview !== null ? (
          <SeekPreview
            frame={shownFrame?.url ?? null}
            height={previewHeight}
            left={preview.left}
            time={preview.time}
            width={previewWidth}
          />
        ) : null}
      </div>

      {/* 下层：左侧前后 / 播放 / 时间，右侧调用方操作组 */}
      <div className={styles.row}>
        <div className={styles.left}>
          {nav ? (
            <FreeIconAction
              disabled={nav.onPrevious === null}
              label={nav.previousLabel ?? '上一个视频'}
              onClick={nav.onPrevious ?? undefined}
              size={CONTROL_BUTTON_SIZE}
              tipDark={tipDark}
              tipDuration={STEP_TIP_DURATION}
            >
              <PlayerStepBackwardIcon size={STEP_ICON_SIZE} />
            </FreeIconAction>
          ) : null}

          <FreeIconAction
            disabled={!enabled}
            label={playing ? '暂停（空格）' : '播放（空格）'}
            onClick={onTogglePlay}
            size={CONTROL_BUTTON_SIZE}
            tipDark={tipDark}
          >
            {playing ? (
              <PlayerPauseIcon size={PLAY_ICON_SIZE} />
            ) : (
              <PlayerPlayIcon size={PLAY_ICON_SIZE} />
            )}
          </FreeIconAction>

          {nav ? (
            <FreeIconAction
              disabled={nav.onNext === null}
              label={nav.nextLabel ?? '下一个视频'}
              onClick={nav.onNext ?? undefined}
              size={CONTROL_BUTTON_SIZE}
              tipDark={tipDark}
              tipDuration={STEP_TIP_DURATION}
            >
              <PlayerStepForwardIcon size={STEP_ICON_SIZE} />
            </FreeIconAction>
          ) : null}

          <span className={styles.time}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        <div className={styles.right}>{actions}</div>
      </div>
    </div>
  );
};

export default VideoControls;
