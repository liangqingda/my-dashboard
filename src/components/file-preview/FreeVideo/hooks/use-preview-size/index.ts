/**
 * 进度条悬停预览框的尺寸：舞台尺寸或画面比例一变就重算（窗口缩放、换屏、竖屏视频都靠这次计算）。
 *
 * 观察器挂在舞台上而不是 window：舞台矩形本身就是结果，弹窗尺寸变了它也会变，多挂一层窗口事件
 * 只会多一次重排。宽高没变时不写回状态——拖动窗口的每一帧都会回调，但预览框只在跨过像素时才变。
 *
 * 量的是**布局尺寸**（`clientWidth` / `clientHeight`），不用 `getBoundingClientRect`：
 * 程序坞窗口打开时整扇框体会被 `transform: scale()` 从图标那一点放大（`growWindowFromDock`），
 * 那一刻量到的是缩放后的盒子，预览框就一直停在最小宽度；缩放不改变布局盒、也不再触发
 * `ResizeObserver`，量错一次就再也改不回来。布局尺寸跟视觉缩放无关，量出来才是设置里那个比例
 * 该对应的大小。
 *
 * 为什么单独一个 hook：这段只有「量矩形 → 算尺寸」一件事，留在播放器里会和播放、抽帧的
 * 一堆状态挤在同一个组件里；换成 `@mantine/hooks` 的尺寸 hook 又会把整份 rect 一起进状态。
 */

import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

import { VIDEO_FALLBACK_ASPECT } from '../../constants';
import { seekPreviewSize } from '../../utils/preview-size';
import type { SeekPreviewSize } from '../../utils/preview-size';

type UsePreviewSizeOptions = {
  /** 视频画面宽高比；还没解出元数据时传 0 */
  aspect: number;
  /** 预览框宽度占画面宽度的比例 */
  scale: number;
  /** 舞台节点：预览框贴着画面显示区，尺寸以它为基准 */
  stageRef: RefObject<HTMLDivElement | null>;
};

export const usePreviewSize = ({
  aspect,
  scale,
  stageRef,
}: UsePreviewSizeOptions): SeekPreviewSize => {
  const [size, setSize] = useState<SeekPreviewSize>(() =>
    seekPreviewSize({
      aspect: VIDEO_FALLBACK_ASPECT,
      scale,
      stageHeight: 0,
      stageWidth: 0,
    }),
  );

  useEffect(() => {
    const stage = stageRef.current;

    if (stage === null) {
      return;
    }

    const measure = () => {
      const next = seekPreviewSize({
        aspect,
        scale,
        stageHeight: stage.clientHeight,
        stageWidth: stage.clientWidth,
      });

      /* 宽高都没变就不写回：拖动窗口时观察器每帧都回调，状态不该跟着抖 */
      setSize((previous) =>
        previous.height === next.height && previous.width === next.width
          ? previous
          : next,
      );
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(stage);

    return () => observer.disconnect();
  }, [aspect, scale, stageRef]);

  return size;
};
