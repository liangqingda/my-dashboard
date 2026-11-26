/**
 * 图片预览弹窗：`FreeModal`（外壳）+ `ImageStage`（整图）+ `ImageListMenu`（header 里的图片列表）。
 *
 * 与视频预览同形，但更朴素——没有播放器，也就没有播放 / 快进 / 截图那一套：
 *
 * - header 是毛玻璃浮层、**默认藏着**（先看整幅图）：鼠标一动浮出、静止 1 秒收起；
 *   点一下图片把 header 固定住，再点一下解除（解除后当场收起，动鼠标才再浮出）；
 * - 图片列表不常驻：header 里的图标按钮点开一层（按钮正下方），列当前目录的全部图片，
 *   点一张切过去并收起；弹层开着时 header 恒可见，此时点图片只收弹层、不切固定态；
 * - 翻篇（按钮 / 列表 / 键盘都算）后左上角浮出一下「3 / 12」，1 秒后自己收掉（`PreviewCounter`）；
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
import { useBrowserFullscreen } from '@/hooks/useBrowserFullscreen';
import FreeModal from '@/components/modals/FreeModal';

import ImageListMenu from './ImageListMenu';
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
  onRequestDelete,
  onRequestWallpaper,
  onSelect,
  opened,
}: ImagePreviewModalProps) => {
  const { active: fullscreen, exit, toggle } = useBrowserFullscreen({
    autoEnter: opened && defaultFullscreen,
  });

  /** header 是否被点击固定：固定期间不自动收起，再点一次画面解除 */
  const [pinned, setPinned] = useState(false);
  /** 图片列表弹层是否展开：开着时 header 恒可见 */
  const [listOpen, setListOpen] = useState(false);
  /** header 自动隐藏的轮次：解除固定时加一，已亮着的那一轮作废——当场收起 */
  const [revealToken, setRevealToken] = useState(0);
  /** 翻过几次：每切一张加一，左上角的计数浮标据此浮出再自动收掉 */
  const [switchTick, setSwitchTick] = useState(0);
  /**
   * 按下画面那一刻列表弹层是否开着：点外部的收起在指针按下时就发生，`click` 读到的状态已经翻过，
   * 只能按这次手势的起点判断「这一下是收弹层，还是切固定态」。
   */
  const listOpenAtDown = useRef(false);

  /**
   * 关窗：先退出整屏全屏，再真正关闭，避免弹窗没了页面还停在全屏；
   * 顺手清掉固定态与列表弹层，下次打开先看整幅图。
   */
  const requestClose = () => {
    setPinned(false);
    setListOpen(false);
    setRevealToken((prev) => prev + 1);

    if (document.fullscreenElement === null) {
      onClose();

      return;
    }

    void exit().then(onClose);
  };

  const index = items.findIndex((item) => item.id === activeId);
  const activeItem = index >= 0 ? items[index] : null;

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

  /** 翻篇与列表点选共用一个入口：顺手让计数浮标闪一下 */
  const selectItem = (id: string) => {
    setSwitchTick((prev) => prev + 1);
    onSelect(id);
  };

  /** 点画面：列表弹层开着时只收弹层；否则切换 header 的固定态，解除时当场收起 */
  const handleStageClick = () => {
    if (listOpenAtDown.current) {
      return;
    }

    if (pinned) {
      setPinned(false);
      setRevealToken((prev) => prev + 1);

      return;
    }

    setPinned(true);
  };

  /** 画面这颗大按钮此刻在做什么：列表开着先收列表，否则说固定 / 解除固定 */
  let stageLabel = pinned ? '取消固定标题栏' : '固定标题栏';

  if (listOpen) {
    stageLabel = '收起图片列表';
  }

  return (
    <FreeModal
      closeOnEscape={!fullscreen && !blocked}
      closeOnSpace={!blocked}
      fullscreen={{ active: fullscreen, onToggle: toggle }}
      headerActions={
        <ImageListMenu
          activeId={activeItem.id}
          items={items}
          onChangeOpened={setListOpen}
          onSelect={selectItem}
          opened={listOpen}
          tipDark
        />
      }
      /*
       * header 是浮层：列表弹层与删除确认开着时暂停自动隐藏（恒可见），
       * 其余时候打开即收起、鼠标一动浮出、静止 1s 收起；点画面固定 / 解除。
       */
      headerAutoHide={{
        pinned,
        resetToken: revealToken,
        suspended: listOpen || blocked,
      }}
      headerTail={
        onRequestDelete || onRequestWallpaper ? (
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
        ) : undefined
      }
      nav={{
        index: index + 1,
        nextLabel: '下一张图片（]）',
        onNext: nextItem ? () => selectItem(nextItem.id) : null,
        onPrevious: previousItem ? () => selectItem(previousItem.id) : null,
        previousLabel: '上一张图片（[）',
        shortcutHint: '[ · ← · →]',
        total: items.length,
      }}
      onClose={requestClose}
      onRequestDelete={onRequestDelete ?? null}
      opened={opened}
      overlayTone="dark"
      shortcutsEnabled={!blocked}
      tipDark
      title={activeItem.name}
      trapFocus={!blocked}
    >
      <UnstyledButton
        aria-label={stageLabel}
        className={styles.stage}
        onClick={handleStageClick}
        onPointerDown={() => {
          listOpenAtDown.current = listOpen;
        }}
        type="button"
      >
        <ImageStage key={activeItem.id} name={activeItem.name} src={activeItem.src} />
        <PreviewCounter index={index + 1} tick={switchTick} total={items.length} />
      </UnstyledButton>
    </FreeModal>
  );
};

export default ImagePreviewModal;
