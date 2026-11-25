import { useState } from 'react';
import { Group, Loader, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconFolderFilled,
  IconFolderOpen,
  IconFolderPlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import IconPopoverButton from '@/components/buttons/IconPopoverButton';
import FreeModal from '@/components/modals/FreeModal';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { getErrorMessage } from '@/utils/error';
import { cx } from '@/utils/cx';

import DirBreadcrumb from '../DirBreadcrumb';
import FavoritesPanel from '../FilesActions/FavoritesPanel';
import { SPRING_HOVER_MS } from '../hooks/use-drag-move/constants';
import { sessionLayout } from '../hooks/use-drag-move/utils';
import type { DraggableEntry, FolderEntry } from '../types';

import HandCard from './HandCard';
import type { DragMoveModalProps } from './types';
import { acceptMove, leaveOutside, modalTitle } from './utils';

import styles from './index.scss';

/**
 * 全屏常驻：落点要铺满整块屏幕才够展开多级目录，
 * header 按约定只留标题与关闭按钮，所以不给全屏切换入口。
 */
const FULLSCREEN = { active: true, onToggle: () => undefined, showToggle: false };

/** 条目还在飞（正被拖着）时的提示 */
const HINT_DRAGGING = '拖到文件夹上松手即移入；停留 0.5 秒会进入该文件夹继续挑。';

/** 弹窗里收藏弹层的层级：要盖在全屏弹窗的遮罩与框体之上 */
const POPOVER_Z_INDEX = 600;

/** 还没有子文件夹 / 条目时共用一个空数组，免得每次渲染都造一个新的 */
const NO_FOLDERS: FolderEntry[] = [];
const NO_ENTRIES: DraggableEntry[] = [];

/**
 * 拖拽移动弹窗：拖起列表里的一条或一批条目后自动打开，占满整屏。正文三段——
 * 当前路径（可点的面包屑）、待拖拽区（条目平铺，能逐条或整批再拖起）、这一层的子文件夹。
 *
 * 松手在文件夹上＝移进去；停在同一个文件夹上 0.5 秒＝它先弹一下，然后进入它；
 * 松手在落点区的空白处＝放进当前这一层（悬在空白处时整块落点区会亮起来提示）；
 * 其余区域什么都不做、条目放回手里。只有移动成功才关窗，
 * 此外只认关闭按钮、Esc 与空格。
 */
const DragMoveModal = ({
  dragMove,
  favorites,
  onCreateFolder,
  onPickDir,
  onPreview,
}: DragMoveModalProps) => {
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
  /** header 的收藏弹层；同时只开这一块 */
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  /** 系统目录选择框开着：按钮转圈，避免连点弹两个框 */
  const [picking, setPicking] = useState(false);
  /** 拖拽在飞时点不动任何东西：避免刚松手的那一下被当成点击 */
  const idle = !dragActive;
  /**
   * 空白落点的高亮再与 `dragActive` 相与：拖拽从页面瓦片发起、又落在关窗的位置时，
   * 这里记下的「正悬着」会留到下次打开，必须跟着拖拽状态一起失效。
   */
  const blankArmed = blankHovered && dragActive;
  /** 这一层就是条目原本所在的目录：松手不做移动，提示也要说清楚 */
  const blankInOrigin = view !== null && session !== null && view.path === session.origin;
  /** 待拖拽区按整批的原位平铺；单独拖起某一条时，那一条的位置留成虚位 */
  const handEntries = session === null ? NO_ENTRIES : sessionLayout(session);
  const focusPath = session?.rest === undefined ? null : (session.entries[0]?.path ?? null);

  return (
    <FreeModal
      closeOnClickOutside={false}
      closeOnEscape
      closeOnSpace
      extraKeys={{ c: () => setFavoritesOpen((open) => !open) }}
      fullscreen={FULLSCREEN}
      headerActions={
        view === null ? null : (
          <>
            <IconPopoverButton
              active={favorites.isFavorite(view.path)}
              hint={
                favorites.isFavorite(view.path)
                  ? '取消收藏这个目录'
                  : '收藏这个目录'
              }
              icon={
                favorites.isFavorite(view.path) ? (
                  <IconBookmarkFilled size={16} stroke={1.6} />
                ) : (
                  <IconBookmark size={16} stroke={1.6} />
                )
              }
              label="收藏目录"
              onChange={setFavoritesOpen}
              opened={favoritesOpen}
              shortcut="C"
              zIndex={POPOVER_Z_INDEX}
            >
              <FavoritesPanel
                disabled={false}
                favorites={favorites.entries}
                isFavorite={favorites.isFavorite(view.path)}
                onClose={() => setFavoritesOpen(false)}
                onMove={favorites.onMove}
                onOpen={(path) => {
                  goTo(path);
                  setFavoritesOpen(false);
                }}
                onRemove={favorites.onRemove}
                onToggleFavorite={() => favorites.onToggleFavorite(view.path)}
                onTogglePinned={favorites.onTogglePinned}
              />
            </IconPopoverButton>
            <FreeIconAction label="新建文件夹" onClick={() => onCreateFolder(view.path)}>
              <IconFolderPlus size={16} stroke={1.9} />
            </FreeIconAction>
            <FreeIconAction
              label={picking ? '正在打开目录选择框' : '选择本地目录'}
              loading={picking}
              onClick={() => {
                setPicking(true);
                void onPickDir(view.path)
                  .then((picked) => {
                    if (picked !== null) {
                      goTo(picked);
                    }
                  })
                  .catch((error: unknown) => {
                    notifications.show({
                      autoClose: false,
                      color: 'red',
                      message: getErrorMessage(error, '选择目录失败，请稍后重试'),
                      title: '选择目录失败',
                    });
                  })
                  .finally(() => setPicking(false));
              }}
            >
              <IconFolderOpen size={16} stroke={1.9} />
            </FreeIconAction>
          </>
        )
      }
      onClose={close}
      opened={session !== null}
      title={modalTitle(session)}
      trapFocus={false}
    >
      {session === null || view === null ? null : (
        <div className={styles.root}>
          <div className={styles.handRow}>
            <HandCard
              entries={handEntries}
              focusPath={focusPath}
              ghostAll={dragActive && focusPath === null}
              handed={handed}
              onDragEnd={() => {
                setBlankHovered(false);
                endDrag();
              }}
              onDragEntry={(entry) => {
                if (dragMove.focusEntry(entry.path)) {
                  beginDrag();
                }
              }}
              onDragStart={beginDrag}
              onPreview={onPreview}
            />
            {dragActive ? (
              <Text c="dimmed" className={styles.handHint} size="xs">
                {HINT_DRAGGING}
              </Text>
            ) : null}
          </div>

          <DirBreadcrumb currentDir={view.path} onNavigate={goTo} />

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
