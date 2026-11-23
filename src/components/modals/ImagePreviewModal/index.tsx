/**
 * 图片预览弹窗：`FreeModal`（外壳）+ `PreviewSidebar`（左侧图片列表）+ `ImageStage`（右侧整图）。
 *
 * 与视频预览同形，但更朴素——没有播放器，也就没有播放 / 快进 / 截图那一套：
 *
 * - header 与侧栏默认常驻；点一下图片把它们一起收起，再看整幅图，再点一下回来
 *   （不做「鼠标静止自动隐藏」，收起只由点击决定）；
 * - 键盘：`[` / `]` 与 `←` / `→` 都翻篇，`F` 全屏，`Esc` 退出 / 关窗，`Delete` 触发删除确认，
 *   空格关窗（与其它弹窗一致，只有视频弹窗把空格让给了播放）；删除确认开着时整组快捷键收掉；
 * - 全屏走浏览器 Fullscreen API，与视频预览同一份 `useBrowserFullscreen`。
 */

import { useState } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconPhoto, IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
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
  items,
  onClose,
  onRequestDelete,
  onSelect,
  opened,
}: ImagePreviewModalProps) => {
  const { active: fullscreen, exit, toggle } = useBrowserFullscreen();
  /** header 与侧栏是否展示：点图片切换，收起后舞台能看满整幅 */
  const [chromeVisible, setChromeVisible] = useState(true);

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

  return (
    <FreeModal
      closeOnClickOutside={false}
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
        onNext: nextItem ? () => onSelect(nextItem.id) : null,
        onPrevious: previousItem ? () => onSelect(previousItem.id) : null,
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
        </UnstyledButton>
      </div>
    </FreeModal>
  );
};

export default ImagePreviewModal;
