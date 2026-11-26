/**
 * 视频预览弹窗：`FreeModal`（外壳）+ `FreeVideo`（播放器）的组合，B 站式布局——
 * 画面占满舞台，操作全部收进播放器底部控制栏：进度条独占上层，下层左侧前后 / 播放 / 时间，
 * 右侧选集（hover 弹层）、删除、截图、外部打开、设置、网页全屏、整屏全屏。
 *
 * - header 只留标题与外壳关闭按钮，不再放业务操作；翻篇计数浮在舞台左上角；
 * - 键盘：空格按设置切播放 / 暂停或关窗（`FreeModal` 的 `media` / `closeOnSpace`），
 *   `Enter` 截当前帧、`m` / `M` 静音，`[` / `]` 翻篇，`←` / `→` 默认按设置步长快进 / 后退
 *   （可在设置面板改成翻篇），`F` 整屏全屏；`Delete` 触发删除确认；设置面板或确认层开着时整组收掉；
 * - 设置面板：按「播放 / 截图 / 快捷键」分组，可改步长、方向键去向、空格去向、悬停预览帧大小
 *   与截图存放目录，全部键位双列列一遍；
 * - 控制栏的两颗箭头在播放键左右两侧，去向跟着「方向键去向」设置：快进 / 后退，或翻篇；
 * - **header 与控制栏默认藏着**：打开就看到画面，鼠标一动浮出，静止 1s 收起；设置里可让它「打开即全屏」；
 * - 翻篇（按钮 / 选集 / `[` `]` 都算）后左上角浮出一下「3 / 12」，1 秒后自己收掉（`PreviewCounter`）；
 * - `Esc` 在全屏里交给浏览器退出全屏，非全屏才是关窗。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import PreviewCounter from '@/components/feedback/PreviewCounter';
import FreeVideo from '@/components/file-preview/FreeVideo';
import { useBrowserFullscreen } from '@/hooks/useBrowserFullscreen';
import FreeModal, { MODAL_HEADER_SELECTOR } from '@/components/modals/FreeModal';
import type { FreeModalSeekDirection } from '@/components/modals/FreeModal/types';

import { HEADER_HIDE_DELAY } from './constants';
import { useAutoHideHeader } from './hooks/useAutoHideHeader';
import { useFrameCapture } from './hooks/useFrameCapture';
import { useVideoSettings } from './hooks/useVideoSettings';
import type { VideoPreviewModalProps } from './types';
import { seekTargetTime } from './utils/seek';
import VideoFooterActions from './VideoFooterActions';

import styles from './index.scss';

const VideoPreviewModal = ({
  activeId,
  blocked = false,
  defaultFullscreen = false,
  items,
  onCapture,
  onClose,
  onOpenExternal,
  onPickDir,
  onRequestDelete,
  onSelect,
  opened,
  storageScope,
}: VideoPreviewModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** 翻过几次：每次切到下一条加一，左上角的计数浮标据此浮出再自动收掉 */
  const [switchTick, setSwitchTick] = useState(0);
  /** 设置面板是否展开：开着手动隐藏 header、并收掉整组快捷键 */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** 整屏全屏：走浏览器 Fullscreen API，占整块屏幕 */
  const { active: fullscreen, exit, toggle: toggleBrowserFullscreen } =
    useBrowserFullscreen({
      autoEnter: opened && defaultFullscreen,
    });
  const {
    setArrowMode,
    setCaptureDir,
    setPreviewScale,
    setSeekStep,
    setSpaceMode,
    setViewportFullscreen,
    settings,
  } = useVideoSettings(storageScope);
  const index = items.findIndex((item) => item.id === activeId);
  const activeItem = index >= 0 ? items[index] : null;

  /** 网页全屏：框体铺满视口（不调浏览器 Fullscreen API），偏好记住，与整屏全屏各记一份 */
  const { viewportFullscreen } = settings;
  const toggleViewportFullscreen = () =>
    setViewportFullscreen(!viewportFullscreen);

  /**
   * header 是浮层：平时盖住画面顶部，指针静止一会儿就收起；
   * 设置面板 / 删除确认开着时恒可见，免得面板跟着 header 一起藏起来。
   */
  const headerVisible = useAutoHideHeader(
    !settingsOpen && !blocked,
    HEADER_HIDE_DELAY,
    undefined,
    MODAL_HEADER_SELECTOR,
  );

  /** `←` / `→`：按设置的步长快进 / 后退；方向键交给它之后翻篇只剩方括号 */
  const seekBy = (direction: FreeModalSeekDirection) => {
    const element = videoRef.current;

    if (element !== null) {
      element.currentTime = seekTargetTime(element, direction, settings.seekStep);
    }
  };

  const { capture, capturing, handleHoverFrameGrabberReady } =
    useFrameCapture(videoRef, onCapture);

  /** 空格 / 按钮共用：视频还没解出画面时按了不动 */
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

  if (activeItem === null) {
    return null;
  }

  /** 二次确认层与上层的删除确认同一口径：任一层开着，底下整组键位与焦点都收掉 */
  const interactionBlocked = blocked;

  /** 翻篇与选集点选共用一个入口：顺手让计数浮标闪一下 */
  const selectItem = (id: string) => {
    setSwitchTick((prev) => prev + 1);
    onSelect(id);
  };

  const previousItem = index > 0 ? items[index - 1] : null;
  const nextItem = index < items.length - 1 ? items[index + 1] : null;
  /** 方向键快进时翻篇只剩方括号；tooltip 跟着改口径 */
  const navShortcutHint =
    settings.arrowMode === 'seek' ? '[ · ]' : '[ / ← · ] / →';
  /** 控制栏那两颗箭头与实体方向键同一套去向：seek 模式快进 / 后退，nav 模式翻篇 */
  const stepSeek = settings.arrowMode === 'seek';
  const navBackward = previousItem ? () => selectItem(previousItem.id) : null;
  const navForward = nextItem ? () => selectItem(nextItem.id) : null;
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
      closeOnEscape={!fullscreen && !settingsOpen && !interactionBlocked}
      closeOnSpace={
        settings.spaceMode === 'close' && !settingsOpen && !interactionBlocked
      }
      contentClassName={viewportFullscreen ? styles.viewportFullscreen : undefined}
      fullscreen={{
        active: fullscreen,
        onToggle: toggleBrowserFullscreen,
        showToggle: false,
      }}
      headerHidden={!headerVisible}
      headerOverlay
      media={{
        onToggleMute: toggleMute,
        onTogglePlay: settings.spaceMode === 'play' ? togglePlay : undefined,
      }}
      nav={{
        index: index + 1,
        onNext: nextItem ? () => selectItem(nextItem.id) : null,
        onPrevious: previousItem ? () => selectItem(previousItem.id) : null,
        shortcutHint: navShortcutHint,
        total: items.length,
      }}
      onCapture={() => void capture(settings.captureDir)}
      onClose={requestClose}
      onRequestDelete={onRequestDelete ? requestDelete : null}
      onSeek={settings.arrowMode === 'seek' ? seekBy : undefined}
      opened={opened}
      shortcutsEnabled={!interactionBlocked && !settingsOpen}
      title={activeItem.name}
      trapFocus={!interactionBlocked}
    >
      <div className={styles.stage}>
        <FreeVideo
          actions={
            <VideoFooterActions
              activeId={activeItem.id}
              browserFullscreen={fullscreen}
              capturing={capturing}
              items={items}
              onCapture={() => void capture(settings.captureDir)}
              onOpenExternal={
                onOpenExternal ? () => onOpenExternal(activeItem.id) : undefined
              }
              onRequestDelete={onRequestDelete ? requestDelete : null}
              onSelect={selectItem}
              onSettingsChangeOpened={setSettingsOpen}
              onToggleBrowserFullscreen={toggleBrowserFullscreen}
              onToggleViewportFullscreen={toggleViewportFullscreen}
              settings={{
                arrowMode: settings.arrowMode,
                captureDir: settings.captureDir,
                onArrowModeChange: setArrowMode,
                onCaptureDirChange: setCaptureDir,
                onPickDir,
                onPreviewScaleChange: setPreviewScale,
                onSeekStepChange: setSeekStep,
                onSpaceModeChange: setSpaceMode,
                previewScale: settings.previewScale,
                seekStep: settings.seekStep,
                spaceMode: settings.spaceMode,
              }}
              settingsOpen={settingsOpen}
              viewportFullscreen={viewportFullscreen}
            />
          }
          key={activeItem.id}
          nav={{
            nextLabel: stepNextLabel,
            onNext: stepForward,
            onPrevious: stepBackward,
            previousLabel: stepPreviousLabel,
          }}
          onHoverFrameGrabberReady={handleHoverFrameGrabberReady}
          previewScale={settings.previewScale / 100}
          src={activeItem.src}
          videoRef={videoRef}
        />
        <PreviewCounter index={index + 1} tick={switchTick} total={items.length} />
      </div>
    </FreeModal>
  );
};

export default VideoPreviewModal;
