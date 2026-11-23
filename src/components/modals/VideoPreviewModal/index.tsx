/**
 * 视频预览弹窗：`FreeModal`（外壳）+ `FreeVideo`（播放器）的组合，左侧列当前目录的视频。
 *
 * - header：翻篇 / 计数 / 文件名（外壳）+ 目录显隐与截图（本组件）；
 * - 全屏走浏览器 Fullscreen API（整块屏幕），全屏时 header 浮在画面上、鼠标静止 3s 收起，
 *   鼠标一动再浮出；侧栏进全屏默认收起，由 header 的图标按钮唤出；
 * - `Esc` 在全屏里交给浏览器退出全屏，非全屏才是关窗；
 * - 空格切播放 / 暂停（`FreeModal` 的 `media` 能力），不关窗。
 */

import { useCallback, useRef, useState } from 'react';
import {
  IconCamera,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeVideo from '@/components/file-preview/FreeVideo';
import FreeModal from '@/components/modals/FreeModal';

import { useAutoHideHeader } from './hooks/useAutoHideHeader';
import { useFrameCapture } from './hooks/useFrameCapture';
import { useVideoFullscreen } from './hooks/useVideoFullscreen';
import type { VideoPreviewModalProps } from './types';
import VideoSidebar from './VideoSidebar';

import styles from './index.scss';

/** header 图标的尺寸与线宽：与外壳那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

const VideoPreviewModal = ({
  activeId,
  items,
  onCapture,
  onClose,
  onSelect,
  opened,
}: VideoPreviewModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** 常规尺寸下侧栏是否显示：默认显示 */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  /** 全屏下侧栏是否显示：进全屏默认收起（与常规尺寸各记一份，来回切不互相覆盖） */
  const [sidebarOpenInFullscreen, setSidebarOpenInFullscreen] = useState(false);
  const { active: fullscreen, exit, toggle } = useVideoFullscreen();
  const headerVisible = useAutoHideHeader(fullscreen);
  const { capture, capturing } = useFrameCapture(videoRef, onCapture);

  /** 空格 / header 按钮共用：视频还没解出画面时按了不动 */
  const togglePlay = useCallback(() => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    if (element.paused) {
      void element.play().catch(() => undefined);

      return;
    }

    element.pause();
  }, []);

  /** 进全屏一律先收起侧栏（规格：全屏默认隐藏），退出全屏回到常规尺寸那份开关 */
  const toggleFullscreen = () => {
    if (!fullscreen) {
      setSidebarOpenInFullscreen(false);
    }

    toggle();
  };

  const toggleSidebar = () => {
    if (fullscreen) {
      setSidebarOpenInFullscreen((prev) => !prev);

      return;
    }

    setSidebarOpen((prev) => !prev);
  };

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

  const sidebarVisible = fullscreen ? sidebarOpenInFullscreen : sidebarOpen;
  const previousItem = index > 0 ? items[index - 1] : null;
  const nextItem = index < items.length - 1 ? items[index + 1] : null;

  return (
    <FreeModal
      closeOnEscape={!fullscreen}
      closeOnSpace={false}
      fullscreen={{ active: fullscreen, onToggle: toggleFullscreen }}
      headerActions={
        <>
          <FreeIconAction
            label={sidebarVisible ? '隐藏视频列表' : '显示视频列表'}
            onClick={toggleSidebar}
          >
            {sidebarVisible ? (
              <IconLayoutSidebarLeftCollapse size={ICON_SIZE} stroke={ICON_STROKE} />
            ) : (
              <IconLayoutSidebarLeftExpand size={ICON_SIZE} stroke={ICON_STROKE} />
            )}
          </FreeIconAction>
          <FreeIconAction
            label="截图当前画面（保存到桌面）"
            loading={capturing}
            onClick={() => void capture()}
          >
            <IconCamera size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
        </>
      }
      headerHidden={fullscreen && !headerVisible}
      headerOverlay={fullscreen}
      media={{ onTogglePlay: togglePlay }}
      nav={{
        index: index + 1,
        onNext: nextItem ? () => onSelect(nextItem.id) : null,
        onPrevious: previousItem ? () => onSelect(previousItem.id) : null,
        total: items.length,
      }}
      onClose={requestClose}
      opened={opened}
      title={activeItem.name}
    >
      <div className={styles.layout}>
        {sidebarVisible ? (
          <VideoSidebar
            activeId={activeItem.id}
            items={items}
            onSelect={onSelect}
          />
        ) : null}
        <FreeVideo key={activeItem.id} src={activeItem.src} videoRef={videoRef} />
      </div>
    </FreeModal>
  );
};

export default VideoPreviewModal;
