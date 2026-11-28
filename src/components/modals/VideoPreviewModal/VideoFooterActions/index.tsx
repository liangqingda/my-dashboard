/**
 * 控制栏下层右侧的操作组：选集（点击弹层）→ 删除 → 截图 → 外部打开 →
 * 加入 / 移出待拖拽区 → 设置 → 网页全屏 → 整屏全屏，顺序固定在这里；
 * 按钮外观与弹窗其余图标同一档。
 *
 * 设置面板的取值与回调仍由弹窗持有，这里只把它的入口按钮排进这一组。
 */

import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize,
  IconCamera,
  IconDragDrop,
  IconExternalLink,
  IconTrash,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import ViewportFullscreenIcon from '@/components/file-preview/FreeVideo/PlayerIcons/ViewportFullscreenIcon';

import VideoEpisodeMenu from '../VideoEpisodeMenu';
import VideoSettingsPopover from '../VideoSettingsPopover';

import type { VideoFooterActionsProps } from './types';

/** 与控制栏其它图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

const VideoFooterActions = ({
  activeId,
  batched = false,
  browserFullscreen,
  capturing,
  externalApp,
  items,
  onCapture,
  onEpisodeChangeOpened,
  onOpenExternal,
  onRequestDelete,
  onSelect,
  onSettingsChangeOpened,
  onToggleBatch,
  onToggleBrowserFullscreen,
  onToggleViewportFullscreen,
  popoverZIndex,
  settings,
  settingsOpen,
  tipDark = false,
  viewportFullscreen,
}: VideoFooterActionsProps) => {
  const appName = externalApp?.trim();
  const externalLabel =
    appName === undefined || appName.length === 0
      ? '用外部播放器打开'
      : `用外部播放器打开（${appName}）`;

  return (
    <>
      <VideoEpisodeMenu
        activeId={activeId}
        items={items}
        onChangeOpened={onEpisodeChangeOpened}
        onSelect={onSelect}
        tipDark={tipDark}
        zIndex={popoverZIndex}
      />

      {onRequestDelete ? (
        <FreeIconAction
          label="删除这个视频（Delete）"
          onClick={onRequestDelete}
          tipDark={tipDark}
        >
          <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}

      {onCapture ? (
        <FreeIconAction
          label="截图当前画面（存到设置的目录）"
          loading={capturing}
          onClick={onCapture}
          tipDark={tipDark}
        >
          <IconCamera size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}

      {onOpenExternal ? (
        <FreeIconAction
          label={externalLabel}
          onClick={onOpenExternal}
          tipDark={tipDark}
        >
          <IconExternalLink size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}

      {onToggleBatch ? (
        <FreeIconAction
          label={batched ? '从待拖拽区移出' : '加入待拖拽区（随后可整批拖走）'}
          onClick={onToggleBatch}
          tipDark={tipDark}
          tone={batched ? 'accent' : 'normal'}
        >
          <IconDragDrop size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}

      <VideoSettingsPopover
        {...settings}
        onChangeOpened={onSettingsChangeOpened}
        opened={settingsOpen}
        tipDark={tipDark}
        zIndex={popoverZIndex}
      />

      <FreeIconAction
        label={viewportFullscreen ? '退出网页全屏' : '网页全屏'}
        onClick={onToggleViewportFullscreen}
        tipDark={tipDark}
      >
        <ViewportFullscreenIcon
          active={viewportFullscreen}
          size={ICON_SIZE}
          stroke={ICON_STROKE}
        />
      </FreeIconAction>

      <FreeIconAction
        label={browserFullscreen ? '退出整屏全屏（F）' : '整屏全屏（F）'}
        onClick={onToggleBrowserFullscreen}
        tipDark={tipDark}
      >
        {browserFullscreen ? (
          <IconArrowsDiagonalMinimize size={ICON_SIZE} stroke={ICON_STROKE} />
        ) : (
          <IconArrowsDiagonal size={ICON_SIZE} stroke={ICON_STROKE} />
        )}
      </FreeIconAction>
    </>
  );
};

export default VideoFooterActions;
