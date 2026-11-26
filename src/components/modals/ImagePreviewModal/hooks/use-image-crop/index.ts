/**
 * 图片裁剪的会话状态：进不进入裁剪、当前选框、保存中、把 canvas 结果交给调用方。
 *
 * 分工：选框几何在 `ImageCropOverlay`，编码在 `utils`，写盘在调用方的 `onCrop`；
 * 这里只收口「一次裁剪从开始到落盘」的时序与提示，避免弹窗文件里堆异步分支。
 */

import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { useMounted } from '@/hooks/useMounted';
import { getErrorMessage } from '@/utils/error';

import type { ImageCropMode, ImageCropRequest, ImageCropResult } from '../../types';
import { cropMimeForName, DEFAULT_CROP_RECT, renderCropDataUrl } from '../../utils';
import type { CropRect } from '../../utils';

/** 裁剪会话的入参 */
export type UseImageCropOptions = {
  /** 当前图片绝对路径：保存时原样交给调用方 */
  path: string;
  /** 当前文件名：决定支持不支持裁剪、按哪种格式编码 */
  name: string;
  /** 设置里的保存方式 */
  mode: ImageCropMode;
  /** 写盘实现；不传则裁剪入口不出现（弹窗按它判有无） */
  onCrop?: (request: ImageCropRequest) => Promise<ImageCropResult>;
};

/** 裁剪会话的出口 */
export type UseImageCropResult = {
  /** 是否处在裁剪模式 */
  active: boolean;
  /** 当前选框（比例） */
  rect: CropRect;
  /** 正在保存：按钮转圈、取消与 Esc 先停住 */
  saving: boolean;
  /** 这张图能不能裁（PNG / JPEG / WebP） */
  supported: boolean;
  /** 进入裁剪模式：选框回到默认大小 */
  start: () => void;
  /** 退出裁剪模式（保存中不动） */
  cancel: () => void;
  /** 拖拽回传的新选框 */
  setRect: (rect: CropRect) => void;
  /** 保存：从图片节点重新编码当前选框，交给 `onCrop` 落盘并提示结果 */
  save: (image: HTMLImageElement | null) => Promise<void>;
};

/** 保存失败时的整句提示标题，按保存方式分叉 */
const failTitleFor = (mode: ImageCropMode): string =>
  mode === 'replace' ? '替换源文件失败' : '保存裁剪图片失败';

export const useImageCrop = ({
  mode,
  name,
  onCrop,
  path,
}: UseImageCropOptions): UseImageCropResult => {
  const mounted = useMounted();
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<CropRect>(DEFAULT_CROP_RECT);
  const [saving, setSaving] = useState(false);
  const supported = cropMimeForName(name) !== null;

  const start = useCallback(() => {
    if (!supported) {
      return;
    }

    setRect(DEFAULT_CROP_RECT);
    setActive(true);
  }, [supported]);

  const cancel = useCallback(() => {
    setActive((current) => {
      if (!current) {
        return current;
      }

      return saving ? current : false;
    });
  }, [saving]);

  const save = async (image: HTMLImageElement | null) => {
    if (!active || saving || image === null || onCrop === undefined) {
      return;
    }

    const dataUrl = renderCropDataUrl(image, rect, name);

    if (dataUrl === null) {
      notifications.show({
        color: 'red',
        message: '这张图片没能重新编码，换一张再试',
        title: '裁剪失败',
      });

      return;
    }

    setSaving(true);

    try {
      const result = await onCrop({ dataUrl, mode, path });

      if (!mounted.current) {
        return;
      }

      setActive(false);
      notifications.show({
        autoClose: 4000,
        color: 'teal',
        message:
          result.mode === 'replace'
            ? `${result.name} 已覆盖为裁剪后的图`
            : `已另存到 ${result.dir}：${result.name}`,
        title: result.mode === 'replace' ? '已替换源文件' : '已另存裁剪图片',
      });
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      notifications.show({
        color: 'red',
        message: getErrorMessage(error, '请稍后重试'),
        title: failTitleFor(mode),
      });
    } finally {
      if (mounted.current) {
        setSaving(false);
      }
    }
  };

  return { active, cancel, rect, save, saving, setRect, start, supported };
};
