/**
 * 网页全屏（框体铺满视口，不进浏览器 Fullscreen API）：B 站风格——小矩形（网页内容）
 * 四角各自一段对角箭头。`active` 为真时画「退出」态：矩形填满、箭头收回内侧。
 */

import type { PlayerIconProps } from '../types';

type ViewportFullscreenIconProps = PlayerIconProps & {
  /** 是否处于网页全屏 */
  active?: boolean;
};

const ViewportFullscreenIcon = ({
  active = false,
  size = 16,
  stroke = 1.8,
}: ViewportFullscreenIconProps) => (
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
    {active ? (
      <>
        {/* 退出：内收的对角箭头 + 填满的小矩形 */}
        <path d="M9 4.5V8H5.5" />
        <path d="M15 4.5V8h3.5" />
        <path d="M9 19.5V16H5.5" />
        <path d="M15 19.5V16h3.5" />
        <rect height="8" rx="1" width="8" x="8" y="8" />
      </>
    ) : (
      <>
        {/* 进入：小矩形 + 四角向外的对角箭头 */}
        <path d="M4.5 9V5.5H8" />
        <path d="M19.5 9V5.5H16" />
        <path d="M4.5 15v3.5H8" />
        <path d="M19.5 15v3.5H16" />
        <rect height="8" rx="1" width="8" x="8" y="8" />
      </>
    )}
  </svg>
);

export default ViewportFullscreenIcon;
