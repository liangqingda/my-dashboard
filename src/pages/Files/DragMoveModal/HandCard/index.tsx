import { Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { FILE_CATEGORY_LABELS } from '../../constants';
import type { DraggableEntry, FileEntry } from '../../types';
import { writeDragPayload } from '../../utils/drag-image';
import { entryIcon } from '../../utils/entry-icon';

import type { HandCardProps } from './types';

import styles from './index.scss';

/** 条目的提示句：多条讲「单独拖 / 空白处整批拖」，单条讲「再拖一次」 */
const handHint = (entries: DraggableEntry[], handed: boolean): string => {
  if (entries.length > 1) {
    return `拖某一条只搬它，拖这块空白处搬这 ${entries.length} 项`;
  }

  return handed ? '按住这条再拖一次，放到目标文件夹上' : '放到目标文件夹上松手即移入';
};

/** 能点开内置预览的分类：与目录页点瓦片打开的那两扇预览同口径 */
const PREVIEW_CATEGORIES = new Set<FileEntry['category']>(['image', 'video']);

/**
 * 弹窗里的待拖拽区：一批条目**平铺**在这儿，不再叠成一个卡片。
 *
 * - 拖**某一条**：只搬它（弹窗把会话收窄到这一条，其余继续留在页面上的待拖拽区）；
 * - 拖**这块空白处**（条目列表下面的区域）：整批一起搬；
 * - 只有一条且是图片 / 视频时，它的图标可点——点它不拖，打开内置预览。
 *
 * 实线边＝正在拖；虚线边 + 呼吸光＝已经放回手里、等你再拖一次（浏览器在松手那一刻就结束了整次拖拽，
 * 全屏弹窗又盖住了列表，所以必须把条目留在弹窗里让人重新拿起）。
 */
const HandCard = ({
  entries,
  focusPath = null,
  ghostAll = false,
  handed,
  onDragEnd,
  onDragEntry,
  onDragStart,
  onPreview,
}: HandCardProps) => {
  /** 单项才谈得上「预览的是哪一个」；多项时图标只是列表里的一枚 */
  const previewFile =
    entries.length === 1 &&
    'category' in entries[0] &&
    PREVIEW_CATEGORIES.has(entries[0].category)
      ? entries[0]
      : null;

  return (
    <div
      className={cx(styles.tray, handed ? styles.idle : styles.live)}
      data-hand-blank="true"
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        writeDragPayload(
          event.dataTransfer,
          entries.map((entry) => entry.path),
        );
        onDragStart();
      }}
    >
      <div className={styles.chips}>
        {entries.map((entry) => {
          const Icon = entryIcon(entry);
          const previewable = previewFile !== null && previewFile.path === entry.path;

          /*
           * 正被单条拖的那一格、以及整批搬起时的全部条目，都留成「虚」的一格：
           * 位子不动、内容照旧看得见（图标与名字压暗、边换虚线），只是不再是可拖的实体。
           */
          const ghost = ghostAll || focusPath === entry.path;

          return (
            <div
              className={cx(styles.chip, ghost && styles.ghost)}
              draggable={!ghost}
              key={entry.path}
              onDragEnd={ghost ? undefined : onDragEnd}
              onDragStart={
                ghost
                  ? undefined
                  : (event) => {
                      // 这一条自己就是拖拽源，别让外层「整批拖」再拦一次
                      event.stopPropagation();
                      writeDragPayload(event.dataTransfer, [entry.path]);
                      onDragEntry(entry);
                    }
              }
            >
              <IconGripVertical aria-hidden="true" className={styles.grip} size={13} stroke={1.6} />
              {previewable ? (
                <Tooltip label={`预览${FILE_CATEGORY_LABELS[previewFile.category]}`} withArrow>
                  <UnstyledButton
                    aria-label={`预览${FILE_CATEGORY_LABELS[previewFile.category]} ${previewFile.name}`}
                    className={styles.iconButton}
                    component="span"
                    onClick={() => onPreview?.(previewFile)}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cx(styles.icon, styles.iconClickable)}
                      size={18}
                      stroke={1.2}
                    />
                  </UnstyledButton>
                </Tooltip>
              ) : (
                <Icon aria-hidden="true" className={styles.icon} size={18} stroke={1.2} />
              )}
              <FreeTruncatedText
                className={styles.name}
                disabled
                ellipsis="middle"
                text={entry.name}
              />
            </div>
          );
        })}
      </div>

      <Text c="dimmed" className={styles.hint} size="xs">
        {handHint(entries, handed)}
      </Text>
    </div>
  );
};

export default HandCard;
