/**
 * 图片预览弹窗：`FreeModal`（外壳）+ `ImageStage`（整图）+ `ImageListMenu`（header 里的图片列表）。
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
import { useSingleOrDoubleClick } from '@/hooks/useSingleOrDoubleClick';
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

  /** header 是否显示：只由点画面开合，不打 hover 那套自动显隐 */
  const [headerVisible, setHeaderVisible] = useState(false);
  /** 图片列表弹层是否展开：开着时 header 恒可见 */
  const [listOpen, setListOpen] = useState(false);
  /** 翻过几次：每切一张加一，左上角的计数浮标据此浮出再自动收掉 */
  const [switchTick, setSwitchTick] = useState(0);
  /**
   * 按下画面那一刻列表弹层是否开着：点外部的收起在指针按下时就发生，`click` 读到的状态已经翻过，
   * 只能按这次手势的起点判断「这一下是收弹层，还是切 header 显隐」。
   */
  const listOpenAtDown = useRef(false);

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
      if (blocked) {
        return;
      }

      toggle();
    },
  );

  /**
   * 关窗：先退出整屏全屏，再真正关闭，避免弹窗没了页面还停在全屏；
   * 顺手收起 header、列表弹层与还没生效的单点计时，下次打开先看整幅图。
   */
  const requestClose = () => {
    cancelStageClick();
    setHeaderVisible(false);
    setListOpen(false);

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

  /**
   * 点画面：列表弹层开着时只收弹层；否则等一个双击窗口——没等到第二下才切 header 显隐，
   * 等到了就交给双击（只切全屏，header 一动不动）。
   */
  const handleStageClick = () => {
    if (listOpenAtDown.current) {
      return;
    }

    clickStage();
  };

  /** 画面这颗大按钮此刻在做什么：列表开着先收列表，否则说开 / 合 header */
  let stageLabel = headerVisible ? '收起标题栏' : '显示标题栏';

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
       * header 是浮层：只认点画面开合，指针移动不参与；
       * 列表弹层与删除确认开着时恒可见（那两种状态下要操作的就是 header 上的东西）。
       */
      headerOverlay={{
        suspended: listOpen || blocked,
        trigger: 'click',
        visible: headerVisible,
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
        onDoubleClick={doubleClickStage}
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
