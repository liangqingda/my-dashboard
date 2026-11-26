/**
 * 图片预览弹窗：`FreeModal`（外壳）+ `ImageStage`（整图）+ `ImageHeaderActions`（header 操作组）+ 裁剪。
 *
 * 与视频预览同形，但更朴素——没有播放器，也就没有播放 / 快进 / 截图那一套：
 *
 * - header 是毛玻璃浮层、**默认藏着**（先看整幅图）：点一下图片浮出，再点一下收起；
 *   指针怎么移动都不参与——header 只在点击时开合，不在 hover 时自己浮出 / 自己藏起来；
 * - **双击切全屏**：双击画面进出整屏（与 `F` 同一档）。header 的显隐只认单点——单点会等一个
 *   双击窗口再开合，第二下到来就把这次开合作废，所以双击只换尺寸、header 一动不动
 *   （单击 / 双击的区分走公共的 `useSingleOrDoubleClick`，视频预览双击全屏也是它）；
 * - 图片列表不常驻：header 里的图标按钮点开一层（按钮正下方），列当前目录的全部图片，
 *   点一张切过去并收起；弹层开着时 header 恒可见，此时点图片只收弹层、不切 header 的显隐；
 * - 翻篇（按钮 / 列表 / 键盘都算）后左上角浮出一下「3 / 12」，1 秒后自己收掉（`PreviewCounter`）；
 * - **可放大、可拖着看**：捏合（Safari 的 `gesture*` 与其余浏览器的 `ctrlKey` + `wheel` 都接）缩放到
 *   1–5 倍，放大后按住拖动（含 macOS「三指拖拽」）；手势口径在 `ImageStage/hooks/use-image-zoom-pan/`；
 *   拖完松手的那一次 click 被舞台吞掉，不会顺手把 header 开合一次；双击仍只切全屏，不兼做缩放开关；
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
import { UnstyledButton } from '@mantine/core';
import { IconTrash, IconWallpaper } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import PreviewCounter from '@/components/feedback/PreviewCounter';
import FreeModal from '@/components/modals/FreeModal';
import { useBrowserFullscreen } from '@/hooks/useBrowserFullscreen';
import { useSingleOrDoubleClick } from '@/hooks/useSingleOrDoubleClick';
import { useStoredField } from '@/hooks/useStoredField';
import { cx } from '@/utils/cx';
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
  blocked = false,
  defaultFullscreen = false,
  items,
  onClose,
  onCrop,
  onRequestDelete,
  onRequestWallpaper,
  onSelect,
  opened,
  storageScope,
}: ImagePreviewModalProps) => {
  const { active: fullscreen, exit, toggle } = useBrowserFullscreen({
    autoEnter: opened && defaultFullscreen,
  });

  /** header 是否显示：只由点画面开合，不打 hover 那套自动显隐 */
  const [headerVisible, setHeaderVisible] = useState(false);
  /** header 的弹层（图片列表 / 裁剪设置）是否开着：开着时 header 恒可见、点画面只收弹层 */
  const [actionsOpen, setActionsOpen] = useState(false);
  /** 翻过几次：每切一张加一，左上角的计数浮标据此浮出再自动收掉 */
  const [switchTick, setSwitchTick] = useState(0);
  /**
   * 按下画面那一刻弹层是否开着：点外部的收起在指针按下时就发生，`click` 读到的状态已经翻过，
   * 只能按这次手势的起点判断「这一下是收弹层，还是切 header 显隐」。
   */
  const actionsOpenAtDown = useRef(false);
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

  /**
   * 点画面：单击等一个双击窗口再开合 header，第二下到来就把这次开合作废（双击只切全屏）。
   * 走公共的 `useSingleOrDoubleClick`，计时器的清理与「最新动作」都在那一份里管。
   */
  const {
    cancel: cancelStageClick,
    onClick: clickStage,
    onDoubleClick: doubleClickStage,
  } = useSingleOrDoubleClick(
    () => setHeaderVisible((prev) => !prev),
    () => {
      if (blocked || cropping) {
        return;
      }

      toggle();
    },
  );

  /**
   * 关窗：先退出整屏全屏，再真正关闭，避免弹窗没了页面还停在全屏；
   * 顺手收起 header、弹层与还没生效的单点计时，下次打开先看整幅图。
   */
  const requestClose = () => {
    cancelStageClick();
    setHeaderVisible(false);
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

  /** 翻篇与列表点选共用一个入口：随手让计数浮标闪一下 */
  const selectItem = (id: string) => {
    setSwitchTick((prev) => prev + 1);
    onSelect(id);
  };

  const saveCrop = () => {
    void crop.save(imageRef.current);
  };

  /**
   * 点画面：裁剪中不切 header、弹层开着时只收弹层；
   * 否则等一个双击窗口——没等到第二下才切 header 显隐，等到了就交给双击。
   */
  const handleStageClick = () => {
    if (cropping || actionsOpenAtDown.current) {
      return;
    }

    clickStage();
  };

  /** 画面这颗大按钮此刻在做什么：裁剪 / 弹层开着先处理它们，否则说开 / 合 header */
  let stageLabel = headerVisible ? '收起标题栏' : '显示标题栏';

  if (cropping) {
    stageLabel = '裁剪中：拖动选框调整范围';
  } else if (actionsOpen) {
    stageLabel = '收起标题栏操作';
  }

  return (
    <FreeModal
      closeButton={!cropping}
      closeOnClickOutside={!cropping}
      closeOnEscape={!fullscreen && !blocked && !cropping}
      closeOnSpace={!blocked && !cropping}
      extraKeys={cropping ? { enter: saveCrop } : undefined}
      fullscreen={{
        active: fullscreen,
        onToggle: cropping ? undefined : toggle,
        showToggle: !cropping,
      }}
      headerActions={
        <ImageHeaderActions
          activeId={activeItem.id}
          canCrop={onCrop !== undefined}
          crop={crop}
          cropMode={cropMode}
          items={items}
          onCropModeChange={setCropMode}
          onOverlayChange={setActionsOpen}
          onSaveCrop={saveCrop}
          onSelect={selectItem}
          tipDark
        />
      }
      /*
       * header 是浮层：只认点画面开合，指针移动不参与；
       * 弹层、删除确认与裁剪开着时恒可见（那几种状态下要操作的就是 header 上的东西）。
       */
      headerOverlay={{
        suspended: actionsOpen || blocked || cropping,
        trigger: 'click',
        visible: headerVisible,
      }}
      headerTail={
        cropping || (!onRequestDelete && !onRequestWallpaper) ? undefined : (
          <>
            {onRequestWallpaper ? (
              <FreeIconAction
                label="设为桌面墙纸"
                onClick={onRequestWallpaper}
                tipDark
              >
                <IconWallpaper size={ICON_SIZE} stroke={ICON_STROKE} />
              </FreeIconAction>
            ) : null}
            {onRequestDelete ? (
              <FreeIconAction
                label="删除这张图片（Delete）"
                onClick={onRequestDelete}
                tipDark
                tone="danger"
              >
                <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
              </FreeIconAction>
            ) : null}
          </>
        )
      }
      nav={{
        disabled: cropping,
        index: index + 1,
        nextLabel: '下一张图片（]）',
        onNext: nextItem ? () => selectItem(nextItem.id) : null,
        onPrevious: previousItem ? () => selectItem(previousItem.id) : null,
        previousLabel: '上一张图片（[）',
        shortcutHint: '[ · ← · →]',
        total: items.length,
      }}
      onClose={requestClose}
      onRequestDelete={cropping ? null : (onRequestDelete ?? null)}
      onRequestEscape={cropping ? crop.cancel : undefined}
      opened={opened}
      overlayTone="dark"
      shortcutsEnabled={!blocked}
      tipDark
      title={activeItem.name}
      trapFocus={!blocked}
    >
      <UnstyledButton
        aria-label={stageLabel}
        className={cx(styles.stage, cropping && styles.stageCropping)}
        onClick={handleStageClick}
        onDoubleClick={doubleClickStage}
        onPointerDown={() => {
          actionsOpenAtDown.current = actionsOpen;
        }}
        type="button"
      >
        <ImageStage
          cropRect={crop.rect}
          cropping={cropping}
          imageRef={imageRef}
          key={activeItem.src}
          name={activeItem.name}
          onCropRectChange={crop.setRect}
          src={activeItem.src}
        />
        <PreviewCounter
          index={index + 1}
          tick={switchTick}
          total={items.length}
        />
      </UnstyledButton>
    </FreeModal>
  );
};

export default ImagePreviewModal;
