/**
 * 图片舞台：一张图居中「装进去」显示，带加载与失败提示。
 *
 * 单独成组件的原因只有一个——换图要重置加载态；调用方用 `key` 换实例即可，
 * 不必在弹窗里为一个图片状态写 effect。
 */

import { useState } from 'react';
import { Loader } from '@mantine/core';
import { IconPhotoOff } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import styles from './index.scss';

/** 图片舞台的入参 */
export type ImageStageProps = {
  /** 文件名（alt 与失败提示都用它） */
  name: string;
  /** 图片地址 */
  src: string;
};

const IMAGE_ICON_SIZE = 28;

const ImageStage = ({ name, src }: ImageStageProps) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <div className={styles.stage}>
      {status === 'loading' ? (
        <div className={styles.hint}>
          <Loader color="gray" size="sm" />
        </div>
      ) : null}
      {status === 'error' ? (
        <div className={styles.hint}>
          <IconPhotoOff size={IMAGE_ICON_SIZE} stroke={1.4} />
          <span className={styles.hintText}>这张图片无法显示</span>
        </div>
      ) : null}
      {/* 加载中先压暗，避免半张图闪一下再撑开 */}
      <img
        alt={name}
        className={cx(styles.image, status !== 'ready' && styles.imagePending)}
        onError={() => setStatus('error')}
        onLoad={() => setStatus('ready')}
        src={src}
      />
    </div>
  );
};

export default ImageStage;
