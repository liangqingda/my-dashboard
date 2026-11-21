/**
 * 预览弹窗的标题栏：左侧上一篇 / 下一篇与文件名，右侧分成两段操作——
 * 「文档操作」（复制相对路径 / 筛选 / 正文字号 / 刷新 / 全屏 / 删除）与「编辑流程」（编辑 / 预览 / 保存 / 放弃改动，
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
  IconTrash,
} from '@tabler/icons-react';

import CopyIconButton from '@/components/CopyIconButton';
import FilterButton from '@/components/FilterButton';
import { cx } from '@/utils/cx';

import type { TitleBarProps } from '../types';
import AnchorLinkControl from '../AnchorLinkControl';
import PreviewHeaderActions from '../HeaderActions';
import HeaderIconAction from '../HeaderActions/IconAction';
import ProseFontControl from '../ProseFontControl';

import styles from './index.scss';

/** 同档图标（翻篇 / 文档操作 / 编辑）的尺寸与线宽 */
const ICON_SIZE = 15;
const STEP_ICON_SIZE = 16;
const ICON_STROKE = 1.9;

const TitleBar = ({
  anchorBehavior,
  anchorScope,
  canEdit,
  editing,
  filter,
  fontScale,
  fullscreen,
  hasAnchorLinks,
  highlightNavigation,
  loading,
  onAnchorBehaviorChange,
  onAnchorScopeChange,
  onNext,
  onPanelChange,
  onPrevious,
  onRefresh,
  onRemove,
  onStartEdit,
  onToggleFullscreen,
  panel,
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
      <Tooltip label="上一篇（[ / ←）" withArrow>
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
      </Tooltip>
      <Tooltip label="下一篇（] / →）" withArrow>
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
      </Tooltip>
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
              label="复制相对路径（C）"
              size="sm"
              text={relativePath}
            />
          ) : null}
          {/* 筛选正文：图标按钮 + 就近弹层，筛什么由调用方给；加载中没有正文可筛 */}
          {filter && !loading ? (
            <FilterButton
              active={filter.active}
              label="筛选正文"
              onChange={(next) => onPanelChange(next ? 'filter' : null)}
              opened={panel === 'filter'}
              shortcut="S"
            >
              {filter.render({
                close: () => onPanelChange(null),
                navigation: highlightNavigation,
              })}
            </FilterButton>
          ) : null}
          {/* 正文字号：图标按钮 + 就近弹层，调的是阅读偏好（跨篇记住） */}
          {loading ? null : (
            <ProseFontControl
              onChange={(next) => onPanelChange(next ? 'font' : null)}
              opened={panel === 'font'}
              scale={fontScale}
              shortcut="A"
            />
          )}
          {/* 同文档链接打开方式：图标按钮 + 就近弹层，值同样是跨篇记住的阅读偏好 */}
          {hasAnchorLinks && !loading ? (
            <AnchorLinkControl
              behavior={anchorBehavior}
              onBehaviorChange={onAnchorBehaviorChange}
              onChange={(next) => onPanelChange(next ? 'anchor' : null)}
              onScopeChange={onAnchorScopeChange}
              opened={panel === 'anchor'}
              scope={anchorScope}
            />
          ) : null}
          {/* 刷新预览内容：正文从盘里读时才有效，编辑中刷了只会把草稿盖掉 */}
          {onRefresh ? (
            <Tooltip label="刷新预览内容（R）" withArrow>
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
            label={fullscreen ? '退出全屏（F）' : '全屏预览（F）'}
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
          {/* 删除这篇文档：调用方给了删除能力才出；与同排图标同色（常态弱色、hover 主色） */}
          {onRemove ? (
            <HeaderIconAction
              label="删除这篇文档（Delete）"
              onClick={onRemove}
            >
              <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
            </HeaderIconAction>
          ) : null}
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
