/**
 * 图片舞台：一张图居中「装进去」显示，带加载与失败提示，可捏合缩放、可两指滑动平移。
 *
 * 只锁「把一张图正确显示出来」这一件事，不认业务语义：裁剪、标记、对比这类叠在画面上的层
 * 从 `overlay` 进来（回调里给图片盒子，叠层按同一坐标系摆位，不用自己量 DOM），并且只在
 * 画面就绪后挂载；要按布局尺寸精确量的状态（裁剪）传 `interactive={false}`，舞台会先回到 1 倍再让位。
 *
 * 换图即重置：调用方用 `key` 换实例，加载态与倍率一起归零，不必为这件事再写 effect。
 *
 * 手势口径见同目录 `hooks/use-image-zoom-pan/README.md`：捏合与平移都走 `wheel` 一族事件。
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Loader } from '@mantine/core';
import { IconPhotoOff } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import { useImageZoomPan } from './hooks/use-image-zoom-pan';
import type { ImageBox } from './types';

import styles from './index.scss';

/** 图片舞台的入参 */
export type FreeImageProps = {
  /** 图片地址 */
  src: string;
  /** 文件名：alt 与失败提示都用它 */
  name: string;
  /** iCloud 云端占位：取图前要先下载到本机，加载提示按「正在下载」文案给 */
  cloudPlaceholder?: boolean;
  /** 整屏：图片盒子撑到舞台大小再按比例装下，像素比舞台小的图也放大到贴边 */
  fill?: boolean;
  /** 缩放 / 平移是否可用（默认可用）；传 false 先复位到 1 倍，裁剪这类按布局尺寸量的层要关掉 */
  interactive?: boolean;
  /**
   * 叠在画面上的层：画面就绪后调用，入参是图片在舞台里的布局矩形（px）；
   * 不需要盒子就忽略参数。不传就没有叠加层。
   */
  overlay?: (box: ImageBox) => ReactNode;
  /** 外部要拿这张图去编码 / 测量时传进来；不传则组件自己持有图片节点 */
  imageRef?: RefObject<HTMLImageElement | null>;
  /** 图片解出固有尺寸时回传（调用方按它收框） */
  onIntrinsicSize?: (width: number, height: number) => void;
};

const IMAGE_ICON_SIZE = 28;

const FreeImage = ({
  cloudPlaceholder = false,
  fill = false,
  imageRef: externalImageRef,
  interactive = true,
  name,
  onIntrinsicSize,
  overlay,
  src,
}: FreeImageProps) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const { imageRef, imageStyle, reset, stageRef } = useImageZoomPan({
    enabled: status === 'ready' && interactive,
    imageRef: externalImageRef,
  });

  /** 图片在舞台里的布局矩形：叠加层按它摆位；量的是布局尺寸，缩放（transform）不影响 */
  const [imageBox, setImageBox] = useState<ImageBox | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    const stage = stageRef.current;

    if (status !== 'ready' || image === null || stage === null) {
      setImageBox(null);

      return undefined;
    }

    const measure = () => {
      const next: ImageBox = {
        height: image.offsetHeight,
        left: image.offsetLeft,
        top: image.offsetTop,
        width: image.offsetWidth,
      };

      setImageBox((prev) =>
        prev !== null &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(image);
    observer.observe(stage);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [imageRef, stageRef, status]);

  /** 不让缩放了先回 1 倍：叠加层（裁剪选框）按未缩放的布局尺寸量，放大后的画面会让它错位 */
  useLayoutEffect(() => {
    if (!interactive) {
      reset();
    }
  }, [interactive, reset]);

  return (
    <div className={styles.stage} ref={stageRef}>
      {status === 'loading' ? (
        <div className={styles.hint}>
          <Loader color="gray" size="sm" />
          {cloudPlaceholder ? (
            <span className={styles.hintText}>正在从 iCloud 下载…</span>
          ) : null}
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
          fill && styles.imageFill,
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
      {status === 'ready' && imageBox !== null && overlay !== undefined
        ? overlay(imageBox)
        : null}
    </div>
  );
};

export default FreeImage;
