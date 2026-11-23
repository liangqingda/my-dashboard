/**
 * 视频预览弹窗：`FreeModal`（外壳）+ `FreeVideo`（播放器）的组合，左侧列当前目录的视频。
 *
 * - header：翻篇 / 计数 / 文件名（外壳）+ 目录显隐、截图、设置、删除（本组件）；
 *   标题与右侧操作组之间恒留 20px，标题不换行、放不下才省略；
 * - 键盘：空格切播放 / 暂停（`FreeModal` 的 `media`），`m` / `M` 静音、`s` / `S` 显隐目录列，
 *   `[` / `]` 翻篇，`←` / `→` 默认按设置里的步长快进 / 后退（可在设置面板改成翻篇），
 *   `Delete` 触发删除确认；设置面板打开或删除确认开着时整组收掉；
 * - 设置面板：快进 / 后退步长、方向键去向、截图存放目录（默认桌面），并把全部键位列一遍；
 * - 翻篇按钮排在播放器控制栏里、播放键左右两侧（与控制栏一起显隐）；
 * - 全屏走浏览器 Fullscreen API：侧栏收起时 header 浮在画面上、鼠标静止 1s 收起；
 *   侧栏唤出后 header 回到普通流（否则会盖住侧栏）；指针在控制栏上时不唤出 header；
 * - `Esc` 在全屏里交给浏览器退出全屏，非全屏才是关窗。
 */

import { useCallback, useRef, useState } from 'react';
import {
  IconCamera,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconTrash,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeVideo from '@/components/file-preview/FreeVideo';
import { CONTROLS_SELECTOR } from '@/components/file-preview/FreeVideo/constants';
import FreeModal from '@/components/modals/FreeModal';
import type { FreeModalSeekDirection } from '@/components/modals/FreeModal/types';

import { HEADER_HIDE_DELAY } from './constants';
import { useAutoHideHeader } from './hooks/useAutoHideHeader';
import { useFrameCapture } from './hooks/useFrameCapture';
import { useVideoFullscreen } from './hooks/useVideoFullscreen';
import { useVideoSettings } from './hooks/useVideoSettings';
import type { VideoPreviewModalProps } from './types';
import VideoSettingsPopover from './VideoSettingsPopover';
import VideoSidebar from './VideoSidebar';

import styles from './index.scss';

/** header 图标的尺寸与线宽：与外壳那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

const VideoPreviewModal = ({
  activeId,
  blocked = false,
  items,
  onCapture,
  onClose,
  onPickCaptureDir,
  onRequestDelete,
  onSelect,
  opened,
  storageScope,
}: VideoPreviewModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** 常规尺寸下侧栏是否显示：默认显示 */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  /** 全屏下侧栏是否显示：进全屏默认收起（与常规尺寸各记一份，来回切不互相覆盖） */
  const [sidebarOpenInFullscreen, setSidebarOpenInFullscreen] = useState(false);
  /** 设置面板是否展开：开着手动隐藏 header、并收掉整组快捷键 */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { active: fullscreen, exit, toggle } = useVideoFullscreen();
  const { setArrowMode, setCaptureDir, setSeekStep, settings } =
    useVideoSettings(storageScope);

  const sidebarVisible = fullscreen ? sidebarOpenInFullscreen : sidebarOpen;

  /**
   * header 只在「全屏 + 侧栏收起」时做浮层：侧栏一旦唤出，浮层会把侧栏顶部盖住，
   * 这时回到普通流，让侧栏从头到尾完整可见（代价是画面让出一行高度）。
   */
  const headerOverlay = fullscreen && !sidebarVisible;
  const headerVisible = useAutoHideHeader(
    headerOverlay && !settingsOpen && !blocked,
    HEADER_HIDE_DELAY,
    CONTROLS_SELECTOR,
  );

  /** `←` / `→`：按设置的步长快进 / 后退；方向键交给它之后翻篇只剩方括号 */
  const seekBy = (direction: FreeModalSeekDirection) => {
    const element = videoRef.current;

    if (element === null) {
      return;
    }

    const duration = Number.isFinite(element.duration) ? element.duration : 0;
    const delta = direction === 'forward' ? settings.seekStep : -settings.seekStep;
    /** 时长还没解出来时不设上界，只保证不落到负数 */
    const upper = duration > 0 ? duration : Number.POSITIVE_INFINITY;

    element.currentTime = Math.min(
      upper,
      Math.max(0, element.currentTime + delta),
    );
  };

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

  /** `m` / `M`：直接翻 `<video>` 的静音位，图标与音量条由元素自己的 `volumechange` 同步 */
  const toggleMute = () => {
    const element = videoRef.current;

    if (element === null) {
      return;
    }

    element.muted = !element.muted;
  };

  /** 进全屏一律先收起侧栏（规格：全屏默认隐藏），退出全屏回到常规尺寸那份开关 */
  const toggleFullscreen = () => {
    if (!fullscreen) {
      setSidebarOpenInFullscreen(false);
    }

    toggle();
  };

  /** `s` / `S` 与 header 的列表按钮共用 */
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

  const previousItem = index > 0 ? items[index - 1] : null;
  const nextItem = index < items.length - 1 ? items[index + 1] : null;
  /** 方向键快进时翻篇只剩方括号；tooltip 跟着改口径 */
  const navShortcutHint =
    settings.arrowMode === 'seek' ? '[ · ]' : '[ / ← · ] / →';

  return (
    <FreeModal
      closeOnEscape={!fullscreen && !settingsOpen && !blocked}
      closeOnSpace={false}
      fullscreen={{ active: fullscreen, onToggle: toggleFullscreen }}
      headerActions={
        <>
          <FreeIconAction
            label={sidebarVisible ? '隐藏视频列表（S）' : '显示视频列表（S）'}
            onClick={toggleSidebar}
          >
            {sidebarVisible ? (
              <IconLayoutSidebarLeftCollapse size={ICON_SIZE} stroke={ICON_STROKE} />
            ) : (
              <IconLayoutSidebarLeftExpand size={ICON_SIZE} stroke={ICON_STROKE} />
            )}
          </FreeIconAction>
          <FreeIconAction
            label="截图当前画面（存到设置的目录）"
            loading={capturing}
            onClick={() => void capture(settings.captureDir)}
          >
            <IconCamera size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
          <VideoSettingsPopover
            arrowMode={settings.arrowMode}
            captureDir={settings.captureDir}
            onArrowModeChange={setArrowMode}
            onCaptureDirChange={setCaptureDir}
            onChangeOpened={setSettingsOpen}
            onPickCaptureDir={onPickCaptureDir}
            onSeekStepChange={setSeekStep}
            opened={settingsOpen}
            seekStep={settings.seekStep}
          />
        </>
      }
      headerHidden={headerOverlay && !headerVisible}
      headerOverlay={headerOverlay}
      headerTail={
        onRequestDelete ? (
          <FreeIconAction
            label="删除这个视频（Delete）"
            onClick={onRequestDelete}
            tone="danger"
          >
            <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
        ) : undefined
      }
      media={{ onToggleMute: toggleMute, onTogglePlay: togglePlay }}
      nav={{
        index: index + 1,
        onNext: nextItem ? () => onSelect(nextItem.id) : null,
        onPrevious: previousItem ? () => onSelect(previousItem.id) : null,
        shortcutHint: navShortcutHint,
        total: items.length,
      }}
      onClose={requestClose}
      onRequestDelete={onRequestDelete ?? null}
      onSeek={settings.arrowMode === 'seek' ? seekBy : undefined}
      onToggleSidebar={toggleSidebar}
      opened={opened}
      shortcutsEnabled={!blocked && !settingsOpen}
      title={activeItem.name}
      trapFocus={!blocked}
    >
      <div className={styles.layout}>
        {sidebarVisible ? (
          <VideoSidebar
            activeId={activeItem.id}
            items={items}
            onSelect={onSelect}
          />
        ) : null}
        <FreeVideo
          key={activeItem.id}
          nav={{
            onNext: nextItem ? () => onSelect(nextItem.id) : null,
            onPrevious: previousItem ? () => onSelect(previousItem.id) : null,
          }}
          src={activeItem.src}
          videoRef={videoRef}
        />
      </div>
    </FreeModal>
  );
};

export default VideoPreviewModal;
