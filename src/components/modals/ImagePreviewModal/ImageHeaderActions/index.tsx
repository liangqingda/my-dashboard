/**
 * 图片预览 header 的操作组：图片列表、设为桌面墙纸、加入 / 移出待拖拽区、裁剪、裁剪设置；
 * 进入裁剪后只剩取消 / 保存。
 *
 * 两层弹层的开合归这里持有（列表与设置互斥，开一层就收另一层），再向上报一个
 * 「有没有弹层开着」——弹窗据此让 header 恒可见、并决定遮罩点击的语义。
 * 裁剪写盘归弹窗（它持有图片节点），这里只负责入口与两颗按钮。
 */

import { useState } from 'react';
import { IconCheck, IconCrop, IconDragDrop, IconWallpaper, IconX } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

import type { UseImageCropResult } from '../hooks/use-image-crop';
import ImageCropSettings from '../ImageCropSettings';
import ImageListMenu from '../ImageListMenu';
import type { ImageCropMode, ImagePreviewItem } from '../types';

/** 与 header 那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** header 操作组的入参 */
export type ImageHeaderActionsProps = {
  /** 当前图片 id（列表里高亮） */
  activeId: string;
  /** 当前目录的图片（列表内容与张数） */
  items: readonly ImagePreviewItem[];
  /** 列表点选 */
  onSelect: (id: string) => void;
  /** 有没有写盘实现：没有就不出裁剪与设置入口 */
  canCrop: boolean;
  /** 裁剪会话（入口状态与开始 / 取消） */
  crop: Pick<
    UseImageCropResult,
    'active' | 'cancel' | 'saving' | 'start' | 'supported'
  >;
  /** 当前保存方式 */
  cropMode: ImageCropMode;
  /** 改保存方式 */
  onCropModeChange: (mode: ImageCropMode) => void;
  /** 保存裁剪（真正编码与写盘在弹窗） */
  onSaveCrop: () => void;
  /** 设为桌面墙纸：排在裁剪左边，不传则没有这颗按钮 */
  onRequestWallpaper?: () => void;
  /** 加入 / 移出待拖拽区：紧挨墙纸右边，再点一次就是移出；不传则没有这颗按钮 */
  onToggleBatch?: () => void;
  /** 当前这张已经在待拖拽区：按钮亮成强调色，提示改成「从待拖拽区移出」 */
  batched?: boolean;
  /** 弹层层级：程序坞窗口里抬到窗口之上 */
  popoverZIndex?: number;
  /** 任一弹层开合：弹窗据此让 header 恒可见 */
  onOverlayChange: (open: boolean) => void;
  /** tip 固定深底浅字 */
  tipDark?: boolean;
};

export const ImageHeaderActions = ({
  activeId,
  batched = false,
  canCrop,
  crop,
  cropMode,
  items,
  onCropModeChange,
  onOverlayChange,
  onRequestWallpaper,
  onSaveCrop,
  onSelect,
  onToggleBatch,
  popoverZIndex,
  tipDark = false,
}: ImageHeaderActionsProps) => {
  const [listOpen, setListOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /** 两层弹层互斥：开一层就把另一层收掉，header 只该有一个「正在操作」的弹层 */
  const changeListOpen = (next: boolean) => {
    setListOpen(next);

    if (next) {
      setSettingsOpen(false);
    }

    onOverlayChange(next || settingsOpen);
  };

  const changeSettingsOpen = (next: boolean) => {
    setSettingsOpen(next);

    if (next) {
      setListOpen(false);
    }

    onOverlayChange(next || listOpen);
  };

  /** 进裁剪：能不能裁由入口的禁用态表达，这里只负责收掉弹层、开始会话 */
  const startCrop = () => {
    setListOpen(false);
    setSettingsOpen(false);
    onOverlayChange(false);
    crop.start();
  };

  if (crop.active) {
    return (
      <>
        <FreeIconAction
          disabled={crop.saving}
          label="取消裁剪（Esc）"
          onClick={crop.cancel}
          tipDark={tipDark}
        >
          <IconX size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
        <FreeIconAction
          label="保存裁剪（Enter）"
          loading={crop.saving}
          onClick={onSaveCrop}
          tipDark={tipDark}
          tone="accent"
        >
          <IconCheck size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      </>
    );
  }

  return (
    <>
      <ImageListMenu
        activeId={activeId}
        items={items}
        onChangeOpened={changeListOpen}
        onSelect={onSelect}
        opened={listOpen}
        tipDark={tipDark}
        zIndex={popoverZIndex}
      />
      {onRequestWallpaper ? (
        <FreeIconAction
          label="设为桌面墙纸"
          onClick={onRequestWallpaper}
          tipDark={tipDark}
        >
          <IconWallpaper size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}
      {onToggleBatch ? (
        <FreeIconAction
          label={batched ? '从待拖拽区移出' : '加入待拖拽区（随后可整批拖走）'}
          onClick={onToggleBatch}
          tipDark={tipDark}
          tone={batched ? 'accent' : 'normal'}
        >
          <IconDragDrop size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}
      {canCrop ? (
        <>
          <FreeIconAction
            disabled={!crop.supported}
            label="裁剪这张图片"
            onClick={startCrop}
            tipDark={tipDark}
            tooltipLabel={
              crop.supported
                ? undefined
                : '只支持 PNG / JPEG / WebP，这张图片不能裁剪'
            }
          >
            <IconCrop size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
          <ImageCropSettings
            mode={cropMode}
            onChangeMode={onCropModeChange}
            onChangeOpened={changeSettingsOpen}
            opened={settingsOpen}
            tipDark={tipDark}
            zIndex={popoverZIndex}
          />
        </>
      ) : null}
    </>
  );
};

export default ImageHeaderActions;
