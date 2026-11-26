/**
 * 播放：实心三角（B 站风格），尖角略收窄，视觉重心压在左侧；填充用 `currentColor`。
 */

import type { PlayerIconProps } from '../types';

const PlayerPlayIcon = ({ size = 16 }: PlayerIconProps) => (
  <svg
    aria-hidden
    fill="currentColor"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l11.02-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
  </svg>
);

export default PlayerPlayIcon;
