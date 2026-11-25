/**
 * 图片预览弹窗：`FreeModal`（外壳）+ `PreviewSidebar`（左侧图片列表）+ `ImageStage`（右侧整图）。
 *
 * 与视频预览同形，但更朴素——没有播放器，也就没有播放 / 快进 / 截图那一套：
 *
 * - header 与侧栏**默认藏着**（看整幅图优先）；点一下图片把它们一起展开，再点一下收起
 *   （不做「鼠标静止自动隐藏」，显隐只由点击决定）；
 * - 翻篇（按钮 / 侧栏 / 键盘都算）后左上角浮出一下「3 / 12」，1 秒后自己收掉（`PreviewCounter`）；
 * - 键盘：`[` / `]` 与 `←` / `→` 都翻篇，`F` 全屏，`Esc` 退出 / 关窗，`Delete` 触发删除确认，
 *   空格关窗（与其它弹窗一致，只有视频弹窗把空格让给了播放）；删除确认开着时整组快捷键收掉；
 * - 全屏走浏览器 Fullscreen API，与视频预览同一份 `useBrowserFullscreen`。
 */

import { useState } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconPhoto, IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import PreviewCounter from '@/components/feedback/PreviewCounter';
import { useBrowserFullscreen } from '@/hooks/useBrowserFullscreen';
import FreeModal from '@/components/modals/FreeModal';
import PreviewSidebar from '@/components/modals/PreviewSidebar';

import ImageStage from './ImageStage';
import type { ImagePreviewModalProps } from './types';

import styles from './index.scss';

/** header 图标的尺寸与线宽：与外壳那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 侧栏条目的图标：与 header 同一档 */
const SIDEBAR_ICON_SIZE = 15;
const SIDEBAR_ICON_STROKE = 1.6;

const ImagePreviewModal = ({
  activeId,
  blocked = false,
  defaultFullscreen = false,
  items,
  onClose,
  onRequestDelete,
  onSelect,
  opened,
}: ImagePreviewModalProps) => {
  const { active: fullscreen, exit, toggle } = useBrowserFullscreen({
    autoEnter: opened && defaultFullscreen,
  });

  /** header 与侧栏是否展示：默认藏起来看整幅图，点图片展开，再点一下收起 */
  const [chromeVisible, setChromeVisible] = useState(false);
  /** 翻过几次：每切一张加一，左上角的计数浮标据此浮出再自动收掉 */
  const [switchTick, setSwitchTick] = useState(0);

  /** 关窗：先退出整屏全屏，再真正关闭，避免弹窗没了页面还停在全屏 */
  const requestClose = () => {
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

  /** 翻篇与侧栏点选共用一个入口：顺手让计数浮标闪一下 */
  const selectItem = (id: string) => {
    setSwitchTick((prev) => prev + 1);
    onSelect(id);
  };

  return (
    <FreeModal
      closeOnEscape={!fullscreen && !blocked}
      closeOnSpace={!blocked}
      fullscreen={{ active: fullscreen, onToggle: toggle }}
      headerHidden={!chromeVisible}
      headerOverlay={!chromeVisible}
      headerTail={
        onRequestDelete ? (
          <FreeIconAction
            label="删除这张图片（Delete）"
            onClick={onRequestDelete}
            tone="danger"
          >
            <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
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
      shortcutsEnabled={!blocked}
      title={activeItem.name}
      trapFocus={!blocked}
    >
      <div className={styles.layout}>
        {chromeVisible ? (
          <PreviewSidebar
            activeId={activeItem.id}
            icon={<IconPhoto size={SIDEBAR_ICON_SIZE} stroke={SIDEBAR_ICON_STROKE} />}
            items={items}
            onSelect={onSelect}
            title="当前目录图片"
          />
        ) : null}
        <UnstyledButton
          aria-label={chromeVisible ? '隐藏标题与图片列表' : '显示标题与图片列表'}
          className={styles.stageButton}
          onClick={() => setChromeVisible((prev) => !prev)}
          type="button"
        >
          <ImageStage key={activeItem.id} name={activeItem.name} src={activeItem.src} />
          <PreviewCounter index={index + 1} tick={switchTick} total={items.length} />
        </UnstyledButton>
      </div>
    </FreeModal>
  );
};

export default ImagePreviewModal;
