/**
 * 图片舞台：一张图居中「装进去」显示，带加载与失败提示，可捏合缩放、可两指滑动平移。
 *
 * 单独成组件的原因只有一个——换图要重置加载态与倍率；调用方用 `key` 换实例即可，
 * 不必在弹窗里为一个图片状态写 effect。
 *
 * 手势口径见同目录 `hooks/use-image-zoom-pan/README.md`：捏合与平移都走 `wheel` 一族事件，
 * 收在那份 hook 里，舞台只负责把节点接上。
 *
 * 裁剪把同一块画面切成「只拖选框」：缩放 / 平移先让位并复位到 1 倍，选框按未缩放的布局尺寸叠上去。
 *
 * 整屏全屏时图片撑到舞台大小（仍按比例，`contain`），像素小于屏幕的图也铺满，不在四周留一圈黑。
 */

import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import { Loader } from '@mantine/core';
import { IconPhotoOff } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import ImageCropOverlay from '../ImageCropOverlay';
import { DEFAULT_CROP_RECT } from '../utils';
import type { CropRect } from '../utils';

import { useImageZoomPan } from './hooks/use-image-zoom-pan';

import styles from './index.scss';

/** 图片舞台的入参 */
export type ImageStageProps = {
  /** 文件名（alt 与失败提示都用它） */
  name: string;
  /** 图片地址 */
  src: string;
  /** 外部要拿这张图去裁剪时传进来；不传则舞台自己持有图片节点 */
  imageRef?: RefObject<HTMLImageElement | null>;
  /** 正在裁剪：缩放 / 平移让位，选框叠在图上 */
  cropping?: boolean;
  /** 整屏全屏：画面按比例撑满舞台，小图也放大到贴边（裁剪态不要传，选框按布局尺寸量） */
  fullscreen?: boolean;
  /** 当前选框（比例）；裁剪态必传，缺省用居中默认框 */
  cropRect?: CropRect;
  /** 拖动选框后回传（不传则不显示裁剪层） */
  onCropRectChange?: (rect: CropRect) => void;
  /** 图片解出固有尺寸时回传（普通窗按它收框，画面填满不留黑边） */
  onIntrinsicSize?: (width: number, height: number) => void;
};

const IMAGE_ICON_SIZE = 28;

const ImageStage = ({
  cropping = false,
  cropRect,
  fullscreen = false,
  imageRef: externalImageRef,
  name,
  onCropRectChange,
  onIntrinsicSize,
  src,
}: ImageStageProps) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const { imageRef, imageStyle, reset, stageRef } = useImageZoomPan({
    enabled: status === 'ready' && !cropping,
    imageRef: externalImageRef,
  });

  /** 进裁剪前先回 1 倍：选框按布局尺寸量，放大后的画面会让选框对不上 */
  useLayoutEffect(() => {
    if (cropping) {
      reset();
    }
  }, [cropping, reset]);

  return (
    <div className={styles.stage} ref={stageRef}>
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
      {/* 加载中先压暗，避免半张图闪一下再撑开；`draggable` 关掉，按住拖不出浏览器的原生图片拖影 */}
      <img
        alt={name}
        className={cx(
          styles.image,
          status !== 'ready' && styles.imagePending,
          fullscreen && styles.imageFill,
        )}
        draggable={false}
        onError={() => setStatus('error')}
        onLoad={(event) => {
          const { naturalHeight, naturalWidth } = event.currentTarget;

          setStatus('ready');

          if (naturalWidth > 0 && naturalHeight > 0) {
            onIntrinsicSize?.(naturalWidth, naturalHeight);
          }
        }}
        ref={imageRef}
        src={src}
        style={imageStyle}
      />
      {cropping && status === 'ready' && onCropRectChange !== undefined ? (
        <ImageCropOverlay
          imageRef={imageRef}
          onChange={onCropRectChange}
          rect={cropRect ?? DEFAULT_CROP_RECT}
          stageRef={stageRef}
        />
      ) : null}
    </div>
  );
};

export default ImageStage;
