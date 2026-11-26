/**
 * 暂停：两根等宽圆角竖条（B 站风格），填充用 `currentColor`。
 */

import type { PlayerIconProps } from '../types';

const PlayerPauseIcon = ({ size = 16 }: PlayerIconProps) => (
  <svg
    aria-hidden
    fill="currentColor"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M7 5h2.6a1.4 1.4 0 0 1 1.4 1.4v11.2a1.4 1.4 0 0 1-1.4 1.4H7a1.4 1.4 0 0 1-1.4-1.4V6.4A1.4 1.4 0 0 1 7 5Z" />
    <path d="M14.4 5H17a1.4 1.4 0 0 1 1.4 1.4v11.2a1.4 1.4 0 0 1-1.4 1.4h-2.6a1.4 1.4 0 0 1-1.4-1.4V6.4A1.4 1.4 0 0 1 14.4 5Z" />
  </svg>
);

export default PlayerPauseIcon;
