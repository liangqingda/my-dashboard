/**
 * 进度条悬停预览浮层：这一处的帧图 + 时间。
 *
 * 位置由父组件算好（`left` 是浮层中心的像素位置，已夹在进度条容器内），这里只管画；
 * 尺寸走 `FreeVideo/constants.ts`，与抽帧分辨率同源，不在这里再写一份宽高。
 */

import { SEEK_PREVIEW_HEIGHT, SEEK_PREVIEW_WIDTH } from '../../constants';
import { formatDuration } from '../../utils/format-duration';

import type { SeekPreviewProps } from './types';

import styles from './index.scss';

/** 取最近的可用帧：抽帧中途某格为空时向前找已抽出的那一帧，免得浮层空一块 */
const frameAt = (frames: (string | null)[], index: number): string | null =>
  frames.slice(0, index + 1).findLast((frame) => frame !== null) ?? null;

const SeekPreview = ({ frames, preview }: SeekPreviewProps) => {
  const url = frameAt(frames, preview.index);

  return (
    <div
      className={styles.preview}
      style={{
        height: SEEK_PREVIEW_HEIGHT,
        left: preview.left,
        width: SEEK_PREVIEW_WIDTH,
      }}
    >
      {url !== null ? <img alt="" className={styles.image} src={url} /> : null}
      <span className={styles.time}>{formatDuration(preview.time)}</span>
    </div>
  );
};

export default SeekPreview;
