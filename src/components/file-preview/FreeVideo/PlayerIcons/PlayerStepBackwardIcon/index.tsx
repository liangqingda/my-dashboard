/**
 * 上一条 / 后退：实心竖条 + 实心左三角（B 站风格翻篇键），填充用 `currentColor`。
 */

import type { PlayerIconProps } from '../types';

const PlayerStepBackwardIcon = ({ size = 16 }: PlayerIconProps) => (
  <svg
    aria-hidden
    fill="currentColor"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M17.6 5.14v13.72a1 1 0 0 1-1.53.85l-8.52-5.3a1 1 0 0 1 0-1.7l8.52-5.3a1 1 0 0 1 1.53.85Z" />
    <path d="M5.6 5h1.6a.9.9 0 0 1 .9.9v12.2a.9.9 0 0 1-.9.9H5.6a.9.9 0 0 1-.9-.9V5.9a.9.9 0 0 1 .9-.9Z" />
  </svg>
);

export default PlayerStepBackwardIcon;
