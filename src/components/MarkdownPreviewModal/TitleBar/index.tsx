/**
 * 预览弹窗的标题栏：左侧上一篇 / 下一篇与文件名，右侧复制相对路径、刷新、全屏，
 * 以及编辑 / 预览 / 保存 / 放弃改动那一组（在 HeaderActions 里）。
 * 这里只管排布与图标尺寸，编辑态语义归 HeaderActions 与弹窗自己的状态机。
 */

import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
  IconRefresh,
} from '@tabler/icons-react';

import CopyIconButton from '@/components/CopyIconButton';

import type { TitleBarProps } from '../types';
import PreviewHeaderActions from '../HeaderActions';

import styles from './index.scss';

/** 同档图标（翻篇 / 刷新 / 全屏 / 复制）的尺寸与线宽，与 HeaderActions 非编辑态一致 */
const ICON_SIZE = 15;
const STEP_ICON_SIZE = 16;
const ICON_STROKE = 1.9;
/** 编辑态那排图标放大一档，复制也跟着放大，标题栏里不出现突兀的小按钮 */
const EDIT_ICON_SIZE = 18;

const TitleBar = ({
  canEdit,
  editing,
  fullscreen,
  onNext,
  onPrevious,
  onRefresh,
  onStartEdit,
  onToggleFullscreen,
  position,
  refreshing,
  relativePath,
  title,
}: TitleBarProps) => (
  <div className={styles.titleRow}>
    <ActionIcon
      aria-label="上一篇"
      className={styles.stepButton}
      disabled={!onPrevious || editing.editing}
      onClick={onPrevious ?? undefined}
      size="sm"
      variant="subtle"
    >
      <IconChevronLeft size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
    </ActionIcon>
    <ActionIcon
      aria-label="下一篇"
      className={styles.stepButton}
      disabled={!onNext || editing.editing}
      onClick={onNext ?? undefined}
      size="sm"
      variant="subtle"
    >
      <IconChevronRight size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
    </ActionIcon>
    {position ? (
      <span className={styles.position}>
        {position.index} / {position.total}
      </span>
    ) : null}
    <span className={styles.fileName}>{title}</span>
    <span className={styles.titleGap} />
    {/* 复制相对路径：路径由调用方给，与编辑态无关，跟着那排图标一起放大 */}
    {relativePath ? (
      <CopyIconButton
        iconSize={editing.editing ? EDIT_ICON_SIZE : ICON_SIZE}
        label="复制相对路径"
        size={editing.editing ? 'lg' : 'sm'}
        text={relativePath}
      />
    ) : null}
    {/* 编辑中不显示刷新：正文不是从盘里读的，刷了也只会把草稿盖掉 */}
    {onRefresh && !editing.editing ? (
      <Tooltip label="刷新预览内容" withArrow>
        <ActionIcon
          aria-label="刷新预览内容"
          className={styles.refreshButton}
          loading={refreshing}
          onClick={onRefresh}
          size="sm"
          variant="subtle"
        >
          <IconRefresh size={ICON_SIZE} stroke={ICON_STROKE} />
        </ActionIcon>
      </Tooltip>
    ) : null}
    {/* 编辑态（含草稿预览）不提供全屏：这时要看的是块编辑器，全屏只放大表单 */}
    {!editing.editing ? (
      <Tooltip label={fullscreen ? '退出全屏（Esc）' : '全屏预览'} withArrow>
        <ActionIcon
          aria-label={fullscreen ? '退出全屏预览' : '全屏预览'}
          className={styles.fullscreenButton}
          onClick={onToggleFullscreen}
          size="sm"
          variant="subtle"
        >
          {fullscreen ? (
            <IconMinimize size={ICON_SIZE} stroke={ICON_STROKE} />
          ) : (
            <IconMaximize size={ICON_SIZE} stroke={ICON_STROKE} />
          )}
        </ActionIcon>
      </Tooltip>
    ) : null}
    <PreviewHeaderActions
      askDiscard={editing.askDiscard}
      canEdit={canEdit}
      editing={editing.editing}
      onCancelEdit={editing.requestExitEditing}
      onDiscard={editing.discardAndExitEditing}
      onKeepEditing={editing.keepEditing}
      onSaveEdit={editing.save}
      onStartEdit={onStartEdit}
      onStartPreview={editing.startPreview}
      onStopPreview={editing.stopPreview}
      previewing={editing.previewing}
      saveError={editing.saveError}
      saveNotice={editing.saveNotice}
      savedAt={editing.savedAt}
      saving={editing.saving}
    />
  </div>
);

export default TitleBar;
