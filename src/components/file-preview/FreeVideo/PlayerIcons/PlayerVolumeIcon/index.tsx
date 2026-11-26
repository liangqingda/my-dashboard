/**
 * 喇叭三态：`level` 决定振铃弧线——`off` 静音（斜杠 + 单声道壶身）、
 * `low` 一条弧线、`high` 两条弧线（B 站风格）。壶身填充、弧线描边，颜色走 `currentColor`。
 */

import type { PlayerIconProps } from '../types';

export type PlayerVolumeLevel = 'off' | 'low' | 'high';

type PlayerVolumeIconProps = PlayerIconProps & {
  /** 音量档：静音 / 低 / 高 */
  level: PlayerVolumeLevel;
};

const PlayerVolumeIcon = ({ level, size = 16, stroke = 1.8 }: PlayerVolumeIconProps) => (
  <svg
    aria-hidden
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={stroke}
    viewBox="0 0 24 24"
    width={size}
  >
    {/* 壶身：填充，方向朝右 */}
    <path
      d="M6 15H4.5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1H6l3.4-4.2a.8.8 0 0 1 1.4.5v13.4a.8.8 0 0 1-1.4.5L6 15Z"
      fill="currentColor"
      stroke="none"
    />

    {level === 'low' ? (
      <path d="M15 9.5a4 4 0 0 1 0 5" />
    ) : null}

    {level === 'high' ? (
      <>
        <path d="M15 9.5a4 4 0 0 1 0 5" />
        <path d="M17.6 6.8a8 8 0 0 1 0 10.4" />
      </>
    ) : null}

    {level === 'off' ? <path d="M16 9.5l5 5m0-5l-5 5" /> : null}
  </svg>
);

export default PlayerVolumeIcon;
