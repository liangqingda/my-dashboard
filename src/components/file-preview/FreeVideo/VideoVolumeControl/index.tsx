/**
 * 喇叭按钮 + 悬停竖向音量条：B 站式——指针停在喇叭上，上方浮出竖向滑杆，松开收起。
 * 音量档由当前音量与静音位决定图标（off / low / high）；数字百分比贴在滑杆左下。
 */

import { Slider } from '@mantine/core';

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
  volume,
}: VideoVolumeControlProps) => {
  const level = volumeLevel(muted, volume);

  return (
    <div className={styles.wrap}>
      <FreeIconAction
        disabled={!enabled}
        label={muted ? '取消静音' : '静音'}
        onClick={onToggleMute}
        tooltip="none"
      >
        <PlayerVolumeIcon level={level} size={ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>

      <div className={styles.popover}>
        <div className={styles.panel}>
          <Slider
            aria-label="音量"
            disabled={!enabled}
            /* 自带浮标贴着滑杆右侧，靠弹窗边缘会被裁掉：数字改由下面的百分比出 */
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
          <span className={styles.value}>
            {Math.round((muted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoVolumeControl;
