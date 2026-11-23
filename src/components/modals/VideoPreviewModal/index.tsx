/**
 * 视频预览弹窗：`FreeModal`（外壳）+ `FreeVideo`（播放器）的组合，左侧列当前目录的视频。
 *
 * - header：翻篇 / 计数 / 文件名（外壳）+ 目录显隐、截图、外部打开、设置、删除（本组件）；
 *   「外部打开」把视频交给 IINA（没装回落到系统默认播放器）——浏览器解不动的编码、
 *   或只是要更快起播时，走这条路比在弹窗里等软解划算；
 *   标题与右侧操作组之间恒留 20px，标题不换行、放不下才省略；
 * - 键盘：空格按设置切播放 / 暂停或关窗（`FreeModal` 的 `media` / `closeOnSpace`），
 *   `Enter` 截当前帧、`m` / `M` 静音、`s` / `S` 显隐目录列，
 *   `[` / `]` 翻篇，`←` / `→` 默认按设置里的步长快进 / 后退（可在设置面板改成翻篇），
 *   `Delete` 触发删除确认；设置面板打开或删除确认开着时整组收掉；
 * - 设置面板：快进 / 后退步长、方向键去向、截图存放目录（默认桌面），并把全部键位列一遍；
 * - 控制栏的两颗箭头在播放键左右两侧，去向跟着「方向键去向」设置：快进 / 后退，或翻篇；
 * - 全屏走浏览器 Fullscreen API：侧栏收起时 header 浮在画面上、鼠标静止 1s 收起；
 *   侧栏唤出后 header 回到普通流（否则会盖住侧栏）；指针在控制栏上时不唤出 header；
 * - `Esc` 在全屏里交给浏览器退出全屏，非全屏才是关窗。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconCamera,
  IconExternalLink,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconTrash,
  IconVideo,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeVideo from '@/components/file-preview/FreeVideo';
import { CONTROLS_SELECTOR } from '@/components/file-preview/FreeVideo/constants';
import { useBrowserFullscreen } from '@/hooks/useBrowserFullscreen';
import FreeModal, { MODAL_HEADER_SELECTOR } from '@/components/modals/FreeModal';
import type { FreeModalSeekDirection } from '@/components/modals/FreeModal/types';
import PreviewSidebar from '@/components/modals/PreviewSidebar';

import { HEADER_HIDE_DELAY } from './constants';
import { useAutoHideHeader } from './hooks/useAutoHideHeader';
import { useFrameCapture } from './hooks/useFrameCapture';
import { useVideoSettings } from './hooks/useVideoSettings';
import type { VideoPreviewModalProps } from './types';
import VideoSettingsPopover from './VideoSettingsPopover';

import styles from './index.scss';

/** header 图标的尺寸与线宽：与外壳那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 侧栏条目的图标：与 header 同一档 */
const SIDEBAR_ICON_SIZE = 15;
const SIDEBAR_ICON_STROKE = 1.6;

const VideoPreviewModal = ({
  activeId,
  blocked = false,
  items,
  onCapture,
  onClose,
  onOpenExternal,
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
  const { active: fullscreen, exit, toggle } = useBrowserFullscreen();
  const { setArrowMode, setCaptureDir, setSeekStep, setSpaceMode, settings } =
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
    MODAL_HEADER_SELECTOR,
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

  /** 删除确认开着期间先暂停；取消后按原来的状态恢复：之前就在放才继续放 */
  const pausedForDelete = useRef(false);

  useEffect(() => {
    if (blocked || !pausedForDelete.current) {
      return;
    }

    pausedForDelete.current = false;

    const element = videoRef.current;

    if (element?.isConnected) {
      void element.play().catch(() => undefined);
    }
  }, [blocked]);

  /**
   * 请求删除当前视频：删除确认层会盖住画面，先把片子停下来；
   * 取消后若是我们停的，再续上（原本就是暂停的保持不变）。
   */
  const requestDelete = () => {
    const element = videoRef.current;

    if (element !== null && !element.paused) {
      pausedForDelete.current = true;
      element.pause();
    }

    onRequestDelete?.();
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
  /** 控制栏那两颗箭头与实体方向键同一套去向：seek 模式快进 / 后退，nav 模式翻篇 */
  const stepSeek = settings.arrowMode === 'seek';
  const navBackward = previousItem ? () => onSelect(previousItem.id) : null;
  const navForward = nextItem ? () => onSelect(nextItem.id) : null;
  const stepBackward = stepSeek ? () => seekBy('backward') : navBackward;
  const stepForward = stepSeek ? () => seekBy('forward') : navForward;
  const stepPreviousLabel = stepSeek
    ? `后退 ${settings.seekStep} 秒（←）`
    : '上一个视频（[）';
  const stepNextLabel = stepSeek
    ? `前进 ${settings.seekStep} 秒（→）`
    : '下一个视频（]）';

  return (
    <FreeModal
      closeOnClickOutside={false}
      closeOnEscape={!fullscreen && !settingsOpen && !blocked}
      closeOnSpace={settings.spaceMode === 'close' && !settingsOpen && !blocked}
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
          {onOpenExternal ? (
            <FreeIconAction
              label="用外部播放器打开（IINA 优先；浏览器解不动或想更快起播时用）"
              onClick={() => onOpenExternal(activeItem.id)}
            >
              <IconExternalLink size={ICON_SIZE} stroke={ICON_STROKE} />
            </FreeIconAction>
          ) : null}
          <VideoSettingsPopover
            arrowMode={settings.arrowMode}
            captureDir={settings.captureDir}
            onArrowModeChange={setArrowMode}
            onCaptureDirChange={setCaptureDir}
            onChangeOpened={setSettingsOpen}
            onPickCaptureDir={onPickCaptureDir}
            onSeekStepChange={setSeekStep}
            onSpaceModeChange={setSpaceMode}
            opened={settingsOpen}
            seekStep={settings.seekStep}
            spaceMode={settings.spaceMode}
          />
        </>
      }
      headerHidden={headerOverlay && !headerVisible}
      headerOverlay={headerOverlay}
      headerTail={
        onRequestDelete ? (
          <FreeIconAction
            label="删除这个视频（Delete）"
            onClick={requestDelete}
            tone="danger"
          >
            <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
        ) : undefined
      }
      media={{
        onToggleMute: toggleMute,
        onTogglePlay: settings.spaceMode === 'play' ? togglePlay : undefined,
      }}
      nav={{
        index: index + 1,
        onNext: nextItem ? () => onSelect(nextItem.id) : null,
        onPrevious: previousItem ? () => onSelect(previousItem.id) : null,
        shortcutHint: navShortcutHint,
        total: items.length,
      }}
      onCapture={() => void capture(settings.captureDir)}
      onClose={requestClose}
      onRequestDelete={onRequestDelete ? requestDelete : null}
      onSeek={settings.arrowMode === 'seek' ? seekBy : undefined}
      onToggleSidebar={toggleSidebar}
      opened={opened}
      shortcutsEnabled={!blocked && !settingsOpen}
      title={activeItem.name}
      trapFocus={!blocked}
    >
      <div className={styles.layout}>
        {sidebarVisible ? (
          <PreviewSidebar
            activeId={activeItem.id}
            icon={<IconVideo size={SIDEBAR_ICON_SIZE} stroke={SIDEBAR_ICON_STROKE} />}
            items={items}
            onSelect={onSelect}
            title="当前目录视频"
          />
        ) : null}
        <FreeVideo
          key={activeItem.id}
          nav={{
            nextLabel: stepNextLabel,
            onNext: stepForward,
            onPrevious: stepBackward,
            previousLabel: stepPreviousLabel,
          }}
          src={activeItem.src}
          videoRef={videoRef}
        />
      </div>
    </FreeModal>
  );
};

export default VideoPreviewModal;
