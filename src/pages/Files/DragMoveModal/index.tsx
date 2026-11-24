import { useState } from 'react';
import { Group, Loader, ScrollArea, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconFolderFilled, IconFolderPlus } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeModal from '@/components/modals/FreeModal';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import DirBreadcrumb from '../DirBreadcrumb';
import { CATEGORY_ICONS, FILE_CATEGORY_LABELS } from '../constants';
import { SPRING_HOVER_MS } from '../hooks/use-drag-move/constants';
import type { FileEntry, FolderEntry } from '../types';

import type { DragMoveModalProps } from './types';
import { acceptMove, leaveOutside } from './utils';

import styles from './index.scss';

/**
 * 全屏常驻：落点要铺满整块屏幕才够展开多级目录，
 * header 按约定只留标题与关闭按钮，所以不给全屏切换入口。
 */
const FULLSCREEN = { active: true, onToggle: () => undefined, showToggle: false };

/** 能点开内置预览的分类：与目录页点瓦片打开的那两扇预览同口径 */
const PREVIEW_CATEGORIES = new Set<FileEntry['category']>(['image', 'video']);

/** 条目还在飞（正被拖着）时的提示 */
const HINT_DRAGGING = '拖到文件夹上松手即移入；停留 0.5 秒会进入该文件夹继续挑。';

/** 还没有子文件夹时共用一个空数组，免得每次渲染都造一个新的 */
const NO_FOLDERS: FolderEntry[] = [];

/**
 * 拖拽移动弹窗：拖起列表里的任一条目后自动打开，占满整屏。正文四段——
 * 当前路径（可点的面包屑）、手持卡片（条目本体，能再次拖起）、这一层的子文件夹、
 * 底部两个停靠区（左「上一层」、右「取消移动」）。
 *
 * 松手在文件夹上＝移进去；停在同一文件夹上 0.5 秒＝它先弹一下，然后进入它；
 * 松手在落点区的空白处＝放进当前这一层（悬在空白处时整块落点区会亮起来提示）；
 * 左停靠区退一层、右停靠区取消并关窗，其余区域什么都不做、条目放回手里。
 * 只有移动成功与取消区会关窗，此外只认关闭按钮与 Esc。
 */
const DragMoveModal = ({ dragMove, onCreateFolder, onPreview }: DragMoveModalProps) => {
  const {
    beginDrag,
    close,
    dragActive,
    dropOnBlank,
    dropOnFolder,
    endDrag,
    error,
    goTo,
    handed,
    hoverFolder,
    hoverPath,
    leaveFolder,
    loading,
    session,
    springPath,
    view,
  } = dragMove;
  /**
   * 指针正悬在落点区的空白处（不在任何文件夹上）：
   * 这时给落点区挂一圈强调边 + 一句「松开即移入」，让人看出空白处也是一个落点。
   */
  const [blankHovered, setBlankHovered] = useState(false);

  const folders = view?.folders ?? NO_FOLDERS;
  /** 拖拽在飞时点不动任何东西：避免刚松手的那一下被当成点击 */
  const idle = !dragActive;
  /**
   * 空白落点的高亮再与 `dragActive` 相与：拖拽从页面瓦片发起、又落在关窗的位置时，
   * 这里记下的「正悬着」会留到下次打开，必须跟着拖拽状态一起失效。
   */
  const blankArmed = blankHovered && dragActive;
  /** 这一层就是条目原本所在的目录：松手不做移动，提示也要说清楚 */
  const blankInOrigin = view !== null && session !== null && view.path === session.origin;
  /** 被拖的文件条目（文件夹为 null）：手持卡片的图标与「能不能预览」都看它 */
  const handFile = session?.file ?? null;
  const HandIcon = handFile === null ? IconFolderFilled : CATEGORY_ICONS[handFile.category];
  /** 图片 / 视频才挂预览入口，其它分类只展示图标 */
  const previewFile = handFile !== null && PREVIEW_CATEGORIES.has(handFile.category) ? handFile : null;

  return (
    <FreeModal
      closeOnClickOutside={false}
      closeOnEscape
      closeOnSpace={false}
      fullscreen={FULLSCREEN}
      headerActions={
        view === null ? null : (
          <FreeIconAction
            label="新建文件夹"
            onClick={() => onCreateFolder(view.path)}
          >
            <IconFolderPlus size={16} stroke={1.9} />
          </FreeIconAction>
        )
      }
      onClose={close}
      opened={session !== null}
      title={session === null ? '' : `移动「${session.name}」`}
      trapFocus={false}
    >
      {session === null || view === null ? null : (
        <div className={styles.root}>
          <DirBreadcrumb currentDir={view.path} onNavigate={goTo} />

          <Group align="center" className={styles.handRow} gap="sm" wrap="nowrap">
            <div
              className={cx(styles.hand, handed ? styles.handIdle : styles.handLive)}
              draggable
              onDragEnd={() => {
                setBlankHovered(false);
                endDrag();
              }}
              onDragStart={(event) => {
                const { dataTransfer } = event;

                dataTransfer.effectAllowed = 'move';
                dataTransfer.setData('text/plain', session.path);
                beginDrag();
              }}
            >
              {previewFile === null ? (
                <HandIcon
                  aria-hidden="true"
                  className={styles.handIcon}
                  size={22}
                  stroke={1.2}
                />
              ) : (
                <Tooltip label={`预览${FILE_CATEGORY_LABELS[previewFile.category]}`} withArrow>
                  <UnstyledButton
                    aria-label={`预览${FILE_CATEGORY_LABELS[previewFile.category]} ${session.name}`}
                    className={styles.handIconButton}
                    component="span"
                    onClick={() => onPreview?.(previewFile)}
                  >
                    <HandIcon
                      aria-hidden="true"
                      className={cx(styles.handIcon, styles.handIconClickable)}
                      size={22}
                      stroke={1.2}
                    />
                  </UnstyledButton>
                </Tooltip>
              )}
              <FreeTruncatedText
                className={styles.handName}
                ellipsis="middle"
                text={session.name}
              />
              <Text className={styles.handBadge} component="span" size="xs">
                {handed ? '待拖拽' : '拖拽中'}
              </Text>
            </div>
            {dragActive ? (
              <Text c="dimmed" className={styles.handHint} size="xs">
                {HINT_DRAGGING}
              </Text>
            ) : null}
          </Group>

          <div
            className={cx(
              styles.list,
              blankArmed && (blankInOrigin ? styles.listOrigin : styles.listArmed),
            )}
            onDragLeave={(event) => leaveOutside(event, () => setBlankHovered(false))}
            onDragOver={(event) => {
              acceptMove(event);
              setBlankHovered(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setBlankHovered(false);
              dropOnBlank();
            }}
          >
            {blankArmed ? (
              <Text
                className={cx(
                  styles.blankHint,
                  blankInOrigin && styles.blankHintOrigin,
                )}
                size="xs"
              >
                {blankInOrigin
                  ? '它本来就在这个文件夹里，松开不做移动'
                  : '松开即移入当前文件夹'}
              </Text>
            ) : null}
            {loading ? (
              <Group className={styles.notice} gap="xs" justify="center" wrap="nowrap">
                <Loader size={14} type="oval" />
                <Text c="dimmed" size="xs">
                  正在读取子文件夹…
                </Text>
              </Group>
            ) : null}

            {!loading && error !== null ? (
              <Text className={cx(styles.notice, styles.noticeError)} size="sm">
                {error}
              </Text>
            ) : null}

            {!loading && error === null && folders.length === 0 ? (
              <Text c="dimmed" className={styles.notice} size="sm">
                这个目录里没有子文件夹：点面包屑换一层，或按 Esc 关窗。
              </Text>
            ) : null}

            {folders.length > 0 ? (
              <ScrollArea h="100%" offsetScrollbars="y" scrollbarSize={8} type="auto">
                <div className={styles.grid}>
                  {folders.map((folder) => (
                    <UnstyledButton
                      className={cx(
                        styles.folder,
                        hoverPath === folder.path && styles.hovered,
                        springPath === folder.path && styles.springing,
                      )}
                      key={folder.path}
                      onClick={idle ? () => goTo(folder.path) : undefined}
                      onDragLeave={(event) =>
                        leaveOutside(event, () => leaveFolder(folder.path))
                      }
                      onDragOver={(event) => {
                        event.stopPropagation();
                        acceptMove(event);
                        setBlankHovered(false);
                        hoverFolder(folder.path);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        dropOnFolder(folder.path);
                      }}
                    >
                      <IconFolderFilled
                        aria-hidden="true"
                        className={styles.folderIcon}
                        size={40}
                        stroke={1.2}
                      />
                      <FreeTruncatedText
                        className={styles.folderName}
                        ellipsis="middle"
                        lines={2}
                        text={folder.name}
                      />
                      {hoverPath === folder.path ? (
                        <span
                          aria-hidden="true"
                          className={styles.countdown}
                          style={{ animationDuration: `${SPRING_HOVER_MS}ms` }}
                        />
                      ) : null}
                    </UnstyledButton>
                  ))}
                </div>
              </ScrollArea>
            ) : null}
          </div>
        </div>
      )}
    </FreeModal>
  );
};

export default DragMoveModal;
