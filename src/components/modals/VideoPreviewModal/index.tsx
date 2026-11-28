/**
 * 视频预览弹窗：`FreeModal` + `FreeVideo` 的 B 站式布局，操作全部收进底部控制栏。
 * 键盘：空格播放 / 收坞，`Enter` 截图，`m` 静音，`[` `]` 翻篇，`←` `→` 快进 / 后退（可改翻篇），
 * `F` 整屏全屏，`Delete` 删除；双击画面切整屏，单击播放 / 暂停要等一个双击窗口。
 * header 与控制栏默认藏着，指针活动才浮出；设置面板含步长、方向键去向、空格去向、预览帧与截图目录。
 */

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import PreviewCounter from '@/components/feedback/PreviewCounter';
import FreeVideo from '@/components/file-preview/FreeVideo';
import {
  VIDEO_CONTROLS_SELECTOR,
  VIDEO_FALLBACK_ASPECT,
} from '@/components/file-preview/FreeVideo/constants';
import { useBrowserFullscreen } from '@/hooks/useBrowserFullscreen';
import FreeModal, { MODAL_HEADER_SELECTOR } from '@/components/modals/FreeModal';
import type { FreeModalSeekDirection } from '@/components/modals/FreeModal/types';
import { cx } from '@/utils/cx';

import { useFrameCapture } from './hooks/useFrameCapture';
import { useVideoSettings } from './hooks/useVideoSettings';
import { useVideoViewport } from './hooks/useVideoViewport';
import type { VideoPreviewModalProps } from './types';
import { createVideoDock } from './utils/dock';
import { seekTargetTime } from './utils/seek';
import VideoFooterActions from './VideoFooterActions';

import styles from './index.scss';

const VideoPreviewModal = ({
  activeId,
  batched = false,
  blocked = false,
  defaultFullscreen = false,
  dockId,
  dockOrigin = 'page',
  externalApp,
  items,
  onCapture,
  onClose,
  onOpenExternal,
  onPickDir,
  onRequestDelete,
  onSelect,
  onToggleBatch,
  opened,
  storageScope,
  switchTick,
}: VideoPreviewModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** 设置面板是否展开：开着手动隐藏 header、并收掉整组快捷键 */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** 选集弹层是否展开：与设置面板汇总成「有没有业务弹层开着」 */
  const [episodeOpen, setEpisodeOpen] = useState(false);
  /**
   * 片源宽高比：普通窗里正文框按它收，画面正好填满、上下不再各留一截黑底。
   * 元数据还没解出来先按兜底 16:9 排；换片时**保留上一段的实际比例**，等新片子报自己的比例，
   * 不先跳回 16:9 再跳一次——那两下尺寸重算就是切上 / 下一段时弹窗闪的原因。
   */
  const [videoAspect, setVideoAspect] = useState(VIDEO_FALLBACK_ASPECT);
  /** 整屏全屏：走浏览器 Fullscreen API，占整块屏幕 */
  const { active: fullscreen, exit, toggle: toggleBrowserFullscreen } =
    useBrowserFullscreen({ autoEnter: opened && defaultFullscreen });
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

  /**
   * 网页全屏：页面窗沿用设置里记住的偏好；程序坞窗固定普通尺寸，
   * 窗内可临时铺满，收起前复位（见 `useVideoViewport`）。
   */
  const {
    beforeMinimize, popoverZIndex, toggleViewportFullscreen, viewportFullscreen,
  } = useVideoViewport({
    dockOrigin, exit, fullscreen, settings, setViewportFullscreen,
  });

  /** `←` / `→`：按设置的步长快进 / 后退；方向键交给它之后翻篇只剩方括号 */
  const seekBy = (direction: FreeModalSeekDirection) => {
    const element = videoRef.current;

    if (element !== null) {
      element.currentTime = seekTargetTime(element, direction, settings.seekStep);
    }
  };

  const { capture, capturing, handleHoverFrameGrabberReady } = useFrameCapture(videoRef, onCapture);

  /** 任一业务弹层开着：点画面只收弹层，不切播放 */
  const overlayOpen = settingsOpen || episodeOpen;

  /** 点画面收弹层：设置面板直接关；选集是点击弹层，收掉内部开合即可 */
  const closeOverlay = () => {
    setSettingsOpen(false);
    setEpisodeOpen(false);
  };

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

    onRequestDelete?.(activeItem.id);
  };

  /** 二次确认层与上层的删除确认同一口径：任一层开着，底下整组键位与焦点都收掉 */
  const interactionBlocked = blocked;

  const previousItem = index > 0 ? items[index - 1] : null;
  const nextItem = index < items.length - 1 ? items[index + 1] : null;
  /** 方向键快进时翻篇只剩方括号；tooltip 跟着改口径 */
  const navShortcutHint =
    settings.arrowMode === 'seek' ? '[ · ]' : '[ / ← · ] / →';
  /** 控制栏那两颗箭头与实体方向键同一套去向：seek 模式快进 / 后退，nav 模式翻篇 */
  const stepSeek = settings.arrowMode === 'seek';
  /** 翻篇与选集点选都直接走 `onSelect`：切换序号由 `usePreviewList` 统一加，这里不再包一层 */
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
  /**
   * 只有普通窗才按片源比例收框：网页全屏 / 整屏全屏要的就是铺满屏幕，
   * 屏幕比例由设备定，收框反而在屏幕边上留一圈弹窗底。
   */
  const aspectFrame = !fullscreen && !viewportFullscreen;

  /**
   * 程序坞描述：整个目录与当前段都进快照，换页 / 刷新后仍能重开；
   * 业务弹层与删除确认开着时不让收；全屏时允许收，收起前由 `beforeMinimize` 先退全屏。
   */
  const dock = createVideoDock({
    activeId: activeItem.id, disabled: blocked || settingsOpen || episodeOpen,
    externalApp, id: dockId, items, origin: dockOrigin, storageScope, title: activeItem.name,
  });

  /*
   * header 是浮层：设置面板 / 删除确认开着时暂停唤出，免得面板跟着 header 一起藏起来；
   * 其余时候打开即收起、鼠标一动浮出、静止 1s 收起（`FreeModal` 的 `headerOverlay`）。
   * 控制栏（footer）是同一套节奏（打开即收起、指针一动浮出、静止 1s 收起，暂停也收），
   * 两层跟着同一片指针活动一起浮出、一起收掉。
   * 指针停在控制栏（footer）上不算「想唤出 header」：在上面挪指针只是想操作播放，
   * 不该把标题栏顶出来——由 `ignoreSelector` 圈掉，指针回到画面才浮出。
   */
  return (
    <FreeModal
      beforeMinimize={beforeMinimize}
      closeOnEscape={!fullscreen && !settingsOpen && !interactionBlocked}
      closeOnSpace={
        settings.spaceMode === 'close' && !settingsOpen && !interactionBlocked
      }
      contentClassName={cx(
        viewportFullscreen && styles.viewportFullscreen,
        aspectFrame && styles.contentAspect,
      )}
      contentStyle={{ '--video-aspect': String(videoAspect) } as CSSProperties}
      dock={dock}
      fullscreen={{
        active: fullscreen,
        onToggle: toggleBrowserFullscreen,
        reportActive: fullscreen || viewportFullscreen,
        showToggle: false,
      }}
      headerOverlay={{
        ignoreSelector: VIDEO_CONTROLS_SELECTOR,
        suspended: settingsOpen || blocked,
      }}
      innerClassName={viewportFullscreen ? styles.innerFullscreen : undefined}
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
      onCapture={
        onCapture ? () => void capture(settings.captureDir) : undefined
      }
      onClose={requestClose}
      onRequestDelete={onRequestDelete ? requestDelete : null}
      onSeek={settings.arrowMode === 'seek' ? seekBy : undefined}
      opened={opened}
      overlayTone="dark"
      shortcutsEnabled={!interactionBlocked && !settingsOpen}
      tipDark
      title={activeItem.name}
      trapFocus={!interactionBlocked}
    >
      <div className={styles.stage}>
        <FreeVideo
          actions={
            <VideoFooterActions
              activeId={activeItem.id}
              batched={batched}
              browserFullscreen={fullscreen}
              capturing={capturing}
              externalApp={externalApp}
              items={items}
              onCapture={
                onCapture ? () => void capture(settings.captureDir) : undefined
              }
              onEpisodeChangeOpened={setEpisodeOpen}
              onOpenExternal={
                onOpenExternal ? () => onOpenExternal(activeItem.id) : undefined
              }
              onRequestDelete={onRequestDelete ? requestDelete : null}
              onSelect={onSelect}
              onSettingsChangeOpened={setSettingsOpen}
              onToggleBatch={
                onToggleBatch
                  ? () => onToggleBatch(activeItem.id)
                  : undefined
              }
              onToggleBrowserFullscreen={toggleBrowserFullscreen}
              onToggleViewportFullscreen={toggleViewportFullscreen}
              popoverZIndex={popoverZIndex}
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
              tipDark
              viewportFullscreen={viewportFullscreen}
            />
          }
          expanded={fullscreen || viewportFullscreen}
          hideControlsOnSelector={MODAL_HEADER_SELECTOR}
          key={activeItem.id}
          nav={{
            nextLabel: stepNextLabel,
            onNext: stepForward,
            onPrevious: stepBackward,
            previousLabel: stepPreviousLabel,
          }}
          onAspectChange={setVideoAspect}
          onCloseOverlay={closeOverlay}
          onDoubleClick={blocked ? undefined : toggleBrowserFullscreen}
          onHoverFrameGrabberReady={handleHoverFrameGrabberReady}
          overlayOpen={overlayOpen}
          poster={activeItem.poster}
          previewScale={settings.previewScale / 100}
          src={activeItem.src}
          tipDark
          videoRef={videoRef}
        />
        <PreviewCounter index={index + 1} tick={switchTick} total={items.length} />
      </div>
    </FreeModal>
  );
};

export default VideoPreviewModal;
