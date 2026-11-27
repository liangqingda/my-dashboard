/**
 * 喇叭按钮 + 悬停竖向音量条：B 站式——指针停在喇叭上，上方浮出竖向滑杆，松开收起。
 * 音量档由当前音量与静音位决定图标（off / low / high）；数字百分比贴在喇叭左侧，跟着浮出。
 */

import { useEffect, useState } from 'react';
import { Slider } from '@mantine/core';

import { cx } from '@/utils/cx';
import FreeIconAction from '@/components/buttons/FreeIconAction';

import PlayerVolumeIcon from '../PlayerIcons/PlayerVolumeIcon';
import type { PlayerVolumeLevel } from '../PlayerIcons/PlayerVolumeIcon';

import type { VideoVolumeControlProps } from './types';

import styles from './index.scss';

/** 图标尺寸与控制栏其它按钮同档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 竖向音量条高度：只够看刻度与拖动，不占横向宽度 */
const SLIDER_HEIGHT = 56;

/** 按音量与静音位选喇叭档 */
const volumeLevel = (muted: boolean, volume: number): PlayerVolumeLevel => {
  if (muted || volume === 0) {
    return 'off';
  }

  return volume < 0.5 ? 'low' : 'high';
};

const VideoVolumeControl = ({
  enabled,
  muted,
  onToggleMute,
  onVolumeChange,
  tipDark = false,
  volume,
}: VideoVolumeControlProps) => {
  const level = volumeLevel(muted, volume);
  /**
   * 拖动滑杆期间保持浮层：松手后指针离开才收起，避免拖一半被 hover 切走关掉。
   * 松手可能落在面板外，所以收尾挂在 window 的 pointerup / pointercancel 上，
   * 不依赖指针还停在面板里。
   */
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const release = () => setDragging(false);

    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [dragging]);

  return (
    <div className={styles.wrap}>
      <span className={cx(styles.value, dragging && styles.valueOpen)}>
        {Math.round((muted ? 0 : volume) * 100)}%
      </span>
      <FreeIconAction
        disabled={!enabled}
        label={muted ? '取消静音' : '静音'}
        onClick={onToggleMute}
        tipDark={tipDark}
        tooltip="none"
      >
        <PlayerVolumeIcon level={level} size={ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>

      <div
        className={cx(styles.popover, dragging && styles.popoverOpen)}
        onPointerDown={() => setDragging(true)}
      >
        <div className={styles.panel}>
          <Slider
            aria-label="音量"
            disabled={!enabled}
            /* 自带浮标贴着滑杆右侧，靠弹窗边缘会被裁掉：数字改由喇叭左侧的百分比出 */
            label={null}
            max={1}
            onChange={onVolumeChange}
            orientation="vertical"
            size="xs"
            step={0.01}
            /* 竖向滑杆高度只能走 styles 覆盖：Mantine 自己给竖版写死 200px */
            styles={{ root: { height: SLIDER_HEIGHT } }}
            value={muted ? 0 : volume}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoVolumeControl;
