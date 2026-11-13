/**
 * 预览弹窗的标题栏：左侧上一篇 / 下一篇与文件名，右侧分成两段操作——
 * 「文档操作」（复制相对路径 / 筛选 / 正文字号 / 刷新 / 全屏）与「编辑流程」（编辑 / 预览 / 保存 / 放弃改动，
 * 在 HeaderActions 里），两段之间一条竖线隔开。
 * 编辑态（含草稿预览）只留编辑流程：文档操作整组不渲染，往这一组新增按钮不必再各判一次。
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
import { cx } from '@/utils/cx';

import type { TitleBarProps } from '../types';
import PreviewHeaderActions from '../HeaderActions';

import styles from './index.scss';

/** 同档图标（翻篇 / 文档操作 / 编辑）的尺寸与线宽 */
const ICON_SIZE = 15;
const STEP_ICON_SIZE = 16;
const ICON_STROKE = 1.9;

const TitleBar = ({
  canEdit,
  editing,
  filterButton,
  fontControl,
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
}: TitleBarProps) => {
  /**
   * 编辑态与草稿预览都算「正在改这篇文档」：header 只留退出、预览、保存，
   * 文档操作组（复制路径 / 筛选 / 字号 / 刷新 / 全屏，以及以后加进这一组的按钮）整套不出现。
   */
  const documentActionsVisible = !editing.editing;

  return (
    <div
      className={cx(
        styles.titleRow,
        documentActionsVisible && styles.titleRowBeforeClose,
      )}
    >
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
      {/*
       * 文档操作组：编辑 / 草稿预览时正文不是「读」而是「改」，
       * 复制路径、刷盘、全屏都用不上，整组收掉；新增按钮放进这里即自动遵守同一规则。
       * 全屏也收掉是因为这时要看的是块编辑器，全屏只会把表单抻大。
       */}
      {documentActionsVisible ? (
        <div className={styles.documentActions}>
          {/* 复制相对路径：路径由调用方给，只在预览态出现 */}
          {relativePath ? (
            <CopyIconButton
              iconSize={ICON_SIZE}
              label="复制相对路径"
              size="sm"
              text={relativePath}
            />
          ) : null}
          {/* 筛选正文：图标按钮 + 就近弹层，筛什么由调用方给 */}
          {filterButton}
          {/* 正文字号：图标按钮 + 就近弹层，调的是阅读偏好（跨篇记住） */}
          {fontControl}
          {/* 刷新预览内容：正文从盘里读时才有效，编辑中刷了只会把草稿盖掉 */}
          {onRefresh ? (
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
          <Tooltip
            label={fullscreen ? '退出全屏（Esc）' : '全屏预览'}
            withArrow
          >
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
        </div>
      ) : null}
      {/* 文档操作与编辑流程之间一条竖线；编辑态只剩编辑流程，不画 */}
      {documentActionsVisible ? (
        <span aria-hidden="true" className={styles.actionDivider} />
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
};

export default TitleBar;
