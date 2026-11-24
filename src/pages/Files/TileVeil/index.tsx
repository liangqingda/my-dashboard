/**
 * 瓦片 hover 时盖在内容上的玻璃层，三种瓦片（文件 / 文件夹 / 应用）共用同一份观感：
 * 模糊底层画面 + 极淡冷色 + 一圈细高光，而不是压一块黑；文字与操作按钮压在它上面。
 *
 * 为什么不自己做 hover 显隐：显隐的触发选择器写在各自瓦片的 `.wrapper:hover` 上
 * （`.wrapper` 是各瓦片的私有类名），这里只按 `data-tile-veil` 被外部选中；
 * 透明度用 CSS 变量 `--veil-opacity` 从设置面板透传，本组件直接把它落在自己身上。
 */

import type { CSSProperties } from 'react';

import type { TileVeilProps } from './types';

import styles from './index.scss';

const TileVeil = ({ opacity = 100 }: TileVeilProps) => (
  <span
    aria-hidden="true"
    className={styles.veil}
    data-tile-veil=""
    style={{ '--veil-opacity': String(opacity / 100) } as CSSProperties}
  />
);

export default TileVeil;
