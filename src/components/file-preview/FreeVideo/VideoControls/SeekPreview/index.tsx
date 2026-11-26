/**
 * 进度条悬停预览浮层：这一处的帧图 + 时间。
 *
 * 位置与尺寸由父组件算好（`left` 是浮层中心的像素位置，已夹在进度条容器内；
 * 宽高跟着视频画面大小走），这里只管画。`frame` 为 null 时显示转圈——
 * 只会在第一帧还没到的时候发生：换位置的间隙父组件继续给上一张（连同它自己的时间），
 * 所以不会出现「先一张、再换一张」的闪动。
 */

import { Loader } from '@mantine/core';

import { formatDuration } from '../../utils/format-duration';

import type { SeekPreviewProps } from './types';

import styles from './index.scss';

const SeekPreview = ({ frame, height, left, time, width }: SeekPreviewProps) => (
  <div className={styles.preview} style={{ height, left, width }}>
    {frame === null ? (
      <span className={styles.placeholder}>
        <Loader color="gray" size={16} />
      </span>
    ) : (
      <img alt="" className={styles.image} src={frame} />
    )}
    <span className={styles.time}>{formatDuration(time)}</span>
  </div>
);

export default SeekPreview;
