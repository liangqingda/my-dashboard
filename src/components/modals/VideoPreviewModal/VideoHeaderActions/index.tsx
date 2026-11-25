/**
 * 视频预览 header 的第一组操作：目录显隐、截图、外部打开。
 *
 * 设置那颗按钮留在弹窗里（它要连线一批设置值），这里只收「给一个动作就完事」的几颗；
 * 图标尺寸与线宽跟 header 那排保持一致，顺序也由这里定死。
 */

import { Group } from '@mantine/core';
import {
  IconCamera,
  IconExternalLink,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

import type { VideoHeaderActionsProps } from './types';

/** 与 header 那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

const VideoHeaderActions = ({
  capturing,
  onCapture,
  onOpenExternal,
  onToggleSidebar,
  sidebarVisible,
}: VideoHeaderActionsProps) => (
  <Group gap="xs" wrap="nowrap">
    <FreeIconAction
      label={sidebarVisible ? '隐藏视频列表（S）' : '显示视频列表（S）'}
      onClick={onToggleSidebar}
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
      onClick={onCapture}
    >
      <IconCamera size={ICON_SIZE} stroke={ICON_STROKE} />
    </FreeIconAction>
    {onOpenExternal ? (
      <FreeIconAction
        label="用外部播放器打开（IINA 优先；浏览器解不动或想更快起播时用）"
        onClick={onOpenExternal}
      >
        <IconExternalLink size={ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>
    ) : null}
  </Group>
);

export default VideoHeaderActions;
