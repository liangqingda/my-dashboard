/**
 * 子区域预览弹窗的 header：左侧前后切换 + 计数 + 区块标题，右侧只有正文字号与全屏。
 *
 * 这里只看「一块内容」：没有翻篇（那是整篇的事）、没有筛选与复制路径、也没有编辑，
 * 关闭按钮仍是 Modal 自带的那一个。按钮只留图标，含义交给 tooltip 与 aria-label。
 */

import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
} from '@tabler/icons-react';

import type { AnchorBlockHeaderProps } from '../../types';

import styles from './index.scss';

/** 与主预览标题栏同档：翻篇箭头 16px、其它图标 15px */
const STEP_ICON_SIZE = 16;
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

const AnchorBlockHeader = ({
  fontControl,
  fullscreen,
  nextButtonRef,
  onNext,
  onPrevious,
  onToggleFullscreen,
  position,
  previousButtonRef,
  title,
}: AnchorBlockHeaderProps) => (
  <div className={styles.titleRow}>
    <ActionIcon
      aria-label="上一个链接区块"
      className={styles.stepButton}
      disabled={!onPrevious}
      onClick={onPrevious ?? undefined}
      ref={previousButtonRef}
      size="sm"
      variant="subtle"
    >
      <IconChevronLeft size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
    </ActionIcon>
    <ActionIcon
      aria-label="下一个链接区块"
      className={styles.stepButton}
      disabled={!onNext}
      onClick={onNext ?? undefined}
      ref={nextButtonRef}
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
    <span className={styles.blockTitle}>{title}</span>
    <span className={styles.titleGap} />
    <div className={styles.actions}>
      {fontControl}
      <Tooltip label={fullscreen ? '退出全屏' : '全屏预览'} withArrow>
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
  </div>
);

export default AnchorBlockHeader;
