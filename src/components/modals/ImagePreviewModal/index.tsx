/**
 * 图片预览弹窗：`FreeModal`（外壳）+ `ImageStage`（整图）+ `ImageHeaderActions`（header 操作组）+ 裁剪。
 *
 * 与视频预览同形，但更朴素——没有播放器，也就没有播放 / 快进 / 截图那一套：
 *
 * - header 是毛玻璃浮层、**默认藏着**（先看整幅图）：鼠标一动浮出、静止 1s 收起，
 *   指针停在 header 上不收起；弹层 / 删除确认 / 裁剪开着时恒可见；
 * - **双击切全屏**：双击画面进出整屏（与 `F` 同一档）；单击不再开合 header，也不抢双击，
 *   所以双击即刻换尺寸，不隔一个 300ms 的单击等待窗口；
 * - 图片列表不常驻：header 里的图标按钮点开一层（按钮正下方），列当前目录的全部图片，
 *   点一张切过去并收起；弹层开着时 header 恒可见，此时点图片只收弹层，不再切 header 的显隐；
 * - 换图（按钮 / 列表 / 键盘翻篇，以及删掉当前这张后顺位切到下一条都算）后左上角浮出一下「3 / 12」，
 *   1 秒后自己收掉（`PreviewCounter`）；
 * - **可放大、可平移**：捏合（Safari 的 `gesture*` 与其余浏览器的 `ctrlKey` + `wheel` 都接）缩放到
 *   1–5 倍，放大后两指滑动（滚轮同一条路径）平移画面；手势口径在 `ImageStage/hooks/use-image-zoom-pan/`；
 *   只认 `wheel` 一族手势，不做指针拖拽；双击只切全屏，不兼做缩放开关；
 * - **裁剪**：header 的裁剪图标进入裁剪态——画面回 1 倍、叠一层可拖动的选框，header 只留「取消 / 保存」，
 *   翻篇 / 全屏 / 删除 / 空格 / 点遮罩全部让位；`Esc` 先退裁剪（由外壳 `onRequestEscape` 接管）、
 *   `Enter` 保存。真正写盘（覆盖源文件 / 另存到「- 裁剪」目录）归调用方 `onCrop`；
 * - 裁剪设置：header 的设置图标开一层，只有一档选择「保存方式」，偏好按页面存进 localStorage；
 * - 键盘：`[` / `]` 与 `←` / `→` 都翻篇，`F` 全屏，`Esc` 退出 / 关窗，`Delete` 触发删除确认，
 *   空格关窗（与其它弹窗一致，只有视频弹窗把空格让给了播放）；删除确认开着时整组快捷键收掉；
 * - header 的「设为桌面墙纸」只打开二次确认层，真正改系统背景归页面的确认层；
 * - 全屏走浏览器 Fullscreen API，与视频预览同一份 `useBrowserFullscreen`。
 */

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import PreviewCounter from '@/components/feedback/PreviewCounter';
import FreeModal from '@/components/modals/FreeModal';
import type { FreeModalDock } from '@/components/modals/FreeModal/types';
import { useBrowserFullscreen } from '@/hooks/useBrowserFullscreen';
import { useStoredField } from '@/hooks/useStoredField';
import { DOCK_POPOVER_Z_INDEX } from '@/dock/constants';
import { scopedStorageKey } from '@/utils/page-storage';

import {
  CROP_MODE_CODEC,
  CROP_MODE_FIELD,
  IMAGE_PREVIEW_CAPABILITY,
} from './constants';
import { useImageCrop } from './hooks/use-image-crop';
import { ImageHeaderActions } from './ImageHeaderActions';
import ImageStage from './ImageStage';
import type { ImagePreviewModalProps } from './types';

import styles from './index.scss';

/** header 图标的尺寸与线宽：与外壳那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

const ImagePreviewModal = ({
  activeId,
  batched = false,
  blocked = false,
  defaultFullscreen = false,
  dockId,
  dockOrigin = 'page',
  items,
  onClose,
  onCrop,
  onRequestDelete,
  onRequestWallpaper,
  onSelect,
  onToggleBatch,
  opened,
  storageScope,
  switchTick,
}: ImagePreviewModalProps) => {
  const { active: fullscreen, exit, toggle } = useBrowserFullscreen({
    autoEnter: opened && defaultFullscreen,
  });

  /** 程序坞窗口层级 1000，图片列表 / 裁剪设置弹层要抬到它上面 */
  const popoverZIndex = DOCK_POPOVER_Z_INDEX;

  /** header 的弹层（图片列表 / 裁剪设置）是否开着：开着时 header 恒可见 */
  const [actionsOpen, setActionsOpen] = useState(false);
  /**
   * 最近一次量到的图片固有比例（宽 / 高）：普通窗按它收框，画面正好填满、上下左右不再留黑底。
   * 换图时**保留上一张的比例**，等新图 `load` 再报一次——先回到默认大框再缩回来会闪一下；
   * 比例对不上时最多多撑一张图的时间，比整窗跳一次小得多。
   */
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  /** 裁剪编码要重新读这张图的原始像素：节点由弹窗持有，舞台只用它 */
  const imageRef = useRef<HTMLImageElement | null>(null);

  /** 裁剪保存方式：按页面持久化，默认替换源文件 */
  const [cropMode, setCropMode] = useStoredField(
    scopedStorageKey(storageScope, IMAGE_PREVIEW_CAPABILITY),
    CROP_MODE_FIELD,
    CROP_MODE_CODEC,
  );

  const index = items.findIndex((item) => item.id === activeId);
  const activeItem = index >= 0 ? items[index] : null;

  const crop = useImageCrop({
    mode: cropMode,
    name: activeItem?.name ?? '',
    onCrop,
    path: activeItem?.id ?? '',
  });
  const cropping = crop.active;

  /** 双击画面切全屏：单击不挂动作，也就没有「等第二下」的延迟 */
  const handleStageDoubleClick = () => {
    if (blocked || cropping) {
      return;
    }

    toggle();
  };

  /**
   * 关窗：先退出整屏全屏，再真正关闭，避免弹窗没了页面还停在全屏；
   * 顺手收起弹层，下次打开先看整幅图。
   */
  const requestClose = () => {
    setActionsOpen(false);

    if (document.fullscreenElement === null) {
      onClose();

      return;
    }

    void exit().then(onClose);
  };

  if (activeItem === null) {
    return null;
  }

  /*
   * 翻篇首尾相接：最后一张再往后回到第一张，第一张往前回到最后一张。
   * 只有一张时不循环（否则「下一张」会原地重开，等于按了没反应）。
   */
  const canCycle = items.length > 1;
  const previousItem = canCycle
    ? items[(index - 1 + items.length) % items.length]
    : null;
  const nextItem = canCycle ? items[(index + 1) % items.length] : null;

  /*
   * 普通窗按图片固有比例收框：宽度与高度都从同一个比例算，画面正好填满框体。
   * 整屏全屏要的是铺满屏幕，不参与收框。比例沿用上一张量到的值，新图 `load` 后再更新，
   * 换图时不会退回默认大框再缩回来（那一下就是弹窗闪的根源）。
   */
  const aspectFrame = !fullscreen && imageAspect !== null;

  const saveCrop = () => {
    void crop.save(imageRef.current);
  };

  /**
   * 程序坞描述：列表与当前张都进快照，换页 / 刷新后仍能重开这一组图；
   * 裁剪与删除确认开着时不让收；全屏时允许收，收起前先退全屏。
   */
  const dock: FreeModalDock = {
    disabled: cropping || blocked,
    id: dockId ?? `image-preview:${storageScope}:${activeItem.id}`,
    kind: 'image-preview',
    origin: dockOrigin,
    snapshot: {
      activeId: activeItem.id,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        src: item.src,
      })),
      storageScope,
    },
    title: activeItem.name,
  };

  return (
    <FreeModal
      beforeMinimize={exit}
      closeButton={!cropping}
      closeOnClickOutside={!cropping}
      closeOnEscape={!fullscreen && !blocked && !cropping}
      closeOnSpace={!blocked && !cropping}
      contentClassName={aspectFrame ? styles.contentAspect : undefined}
      contentStyle={
        imageAspect === null
          ? undefined
          : ({ '--image-aspect': String(imageAspect) } as CSSProperties)
      }
      dock={dock}
      extraKeys={cropping ? { enter: saveCrop } : undefined}
      fullscreen={{
        active: fullscreen,
        onToggle: cropping ? undefined : toggle,
        showToggle: !cropping,
      }}
      headerActions={
        <ImageHeaderActions
          activeId={activeItem.id}
          batched={batched}
          canCrop={onCrop !== undefined}
          crop={crop}
          cropMode={cropMode}
          items={items}
          onCropModeChange={setCropMode}
          onOverlayChange={setActionsOpen}
          onRequestWallpaper={
            onRequestWallpaper
              ? () => onRequestWallpaper(activeItem.id, activeItem.name)
              : undefined
          }
          onSaveCrop={saveCrop}
          onSelect={onSelect}
          onToggleBatch={
            onToggleBatch ? () => onToggleBatch(activeItem.id) : undefined
          }
          popoverZIndex={popoverZIndex}
          tipDark
        />
      }
      /*
       * header 是浮层：鼠标一动浮出、静止 1s 收起，与视频预览同一套节奏；
       * 弹层、删除确认与裁剪开着时恒可见（那几种状态下要操作的就是 header 上的东西）。
       */
      headerOverlay={{
        suspended: actionsOpen || blocked || cropping,
      }}
      headerTail={
        cropping || !onRequestDelete ? undefined : (
          <FreeIconAction
            label="删除这张图片（Delete）"
            onClick={() => onRequestDelete(activeItem.id)}
            tipDark
            tone="danger"
          >
            <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
        )
      }
      nav={{
        disabled: cropping,
        index: index + 1,
        nextLabel: '下一张图片（]）',
        onNext: nextItem ? () => onSelect(nextItem.id) : null,
        onPrevious: previousItem ? () => onSelect(previousItem.id) : null,
        previousLabel: '上一张图片（[）',
        shortcutHint: '[ · ← · →]',
        total: items.length,
      }}
      onClose={requestClose}
      onRequestDelete={
        cropping || !onRequestDelete
          ? null
          : () => onRequestDelete(activeItem.id)
      }
      onRequestEscape={cropping ? crop.cancel : undefined}
      opened={opened}
      overlayTone="dark"
      shortcutsEnabled={!blocked}
      tipDark
      title={activeItem.name}
      trapFocus={!blocked}
    >
      <div
        className={styles.stage}
        onDoubleClick={handleStageDoubleClick}
      >
        <ImageStage
          cropRect={crop.rect}
          cropping={cropping}
          fullscreen={fullscreen && !cropping}
          imageRef={imageRef}
          key={activeItem.src}
          name={activeItem.name}
          onCropRectChange={crop.setRect}
          onIntrinsicSize={(width, height) =>
            setImageAspect(width / height)
          }
          src={activeItem.src}
        />
        <PreviewCounter
          index={index + 1}
          tick={switchTick}
          total={items.length}
        />
      </div>
    </FreeModal>
  );
};

export default ImagePreviewModal;
