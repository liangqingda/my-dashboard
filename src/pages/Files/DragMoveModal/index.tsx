import { useState } from 'react';
import { Group, Loader, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import {
  IconArrowUp,
  IconCornerUpLeft,
  IconFile,
  IconFolderFilled,
} from '@tabler/icons-react';

import FreeModal from '@/components/modals/FreeModal';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import DirBreadcrumb from '../DirBreadcrumb';
import { SPRING_HOVER_MS } from '../hooks/use-drag-move/constants';
import type { FolderEntry } from '../types';

import type { DragMoveModalProps } from './types';
import { acceptMove, isInsideSelf } from './utils';

import styles from './index.scss';

/**
 * 全屏常驻：落点要铺满整块屏幕才够展开多级目录，
 * header 按约定只留标题与关闭按钮，所以不给全屏切换入口。
 */
const FULLSCREEN = { active: true, onToggle: () => undefined, showToggle: false };

/** 条目还在飞（正被拖着）时的提示 */
const HINT_DRAGGING = '拖到文件夹上松手即移入；停留 0.5 秒会进入该文件夹继续挑。';

/** 条目已经放回手里时的提示：这时只剩「再拖一次」与「点文件夹进去逛」两条路 */
const HINT_HANDED =
  '条目在手里：拖起来放到文件夹上松手即移入，点文件夹可以直接进去。';

/** 还没有子文件夹时共用一个空数组，免得每次渲染都造一个新的 */
const NO_FOLDERS: FolderEntry[] = [];

/**
 * 拖拽移动弹窗：拖起列表里的任一条目后自动打开，占满整屏。正文五段——
 * 当前路径（可点的面包屑）、手持卡片（条目本体，能再次拖起）、这一层的子文件夹、
 * 底部两个停靠区（左「上一层」、右「回最外层」）。
 *
 * 松手在文件夹上＝移进去；停在同一文件夹上 0.5 秒＝它先弹一下，然后进入它；
 * 松手在列表空白处＝放进当前这一层；两个停靠区与其余区域只改「看哪一层」或什么都不做，
 * 条目一律放回手里、弹窗不关——关窗只认关闭按钮与 Esc。
 */
const DragMoveModal = ({ dragMove }: DragMoveModalProps) => {
  const {
    beginDrag,
    close,
    dragActive,
    dropOnBlank,
    dropOnCancelZone,
    dropOnFolder,
    dropOnParentZone,
    endDrag,
    error,
    goTo,
    handed,
    hoverFolder,
    hoverParentZone,
    hoverPath,
    isRoot,
    leaveFolder,
    leaveParentZone,
    loading,
    parentHovering,
    session,
    springPath,
    view,
  } = dragMove;
  /** 右下角停靠区正被拖拽经过：加深底纹，让「松手就回最外层」先被看见 */
  const [rootHovered, setRootHovered] = useState(false);

  const folders = view?.folders ?? NO_FOLDERS;
  /** 拖拽在飞时点不动任何东西：避免刚松手的那一下被当成点击 */
  const idle = !dragActive;

  return (
    <FreeModal
      closeOnClickOutside={false}
      closeOnEscape
      closeOnSpace={false}
      fullscreen={FULLSCREEN}
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
              onDragEnd={endDrag}
              onDragStart={(event) => {
                const { dataTransfer } = event;

                dataTransfer.effectAllowed = 'move';
                dataTransfer.setData('text/plain', session.path);
                beginDrag();
              }}
            >
              {session.kind === 'folder' ? (
                <IconFolderFilled
                  aria-hidden="true"
                  className={styles.handIcon}
                  size={22}
                  stroke={1.2}
                />
              ) : (
                <IconFile
                  aria-hidden="true"
                  className={styles.handIcon}
                  size={22}
                  stroke={1.4}
                />
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
            <Text c="dimmed" className={styles.handHint} size="xs">
              {handed ? HINT_HANDED : HINT_DRAGGING}
            </Text>
          </Group>

          <div
            className={styles.list}
            onDragOver={acceptMove}
            onDrop={(event) => {
              event.preventDefault();
              dropOnBlank();
            }}
          >
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
                {isRoot
                  ? '这个目录里没有子文件夹，按 Esc 或右上角可以关窗。'
                  : '这个目录里没有子文件夹，拖到底部可以换一层再看。'}
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
                      onDragLeave={(event) => {
                        if (isInsideSelf(event)) {
                          return;
                        }

                        leaveFolder(folder.path);
                      }}
                      onDragOver={(event) => {
                        acceptMove(event);
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

          <div className={styles.dock}>
            <UnstyledButton
              className={cx(
                styles.zone,
                styles.backZone,
                parentHovering && styles.backHovered,
                isRoot && styles.zoneMuted,
              )}
              onClick={idle ? dropOnParentZone : undefined}
              onDragLeave={(event) => {
                if (isInsideSelf(event)) {
                  return;
                }

                leaveParentZone();
              }}
              onDragOver={(event) => {
                acceptMove(event);
                hoverParentZone();
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                dropOnParentZone();
              }}
            >
              <IconArrowUp
                aria-hidden="true"
                className={styles.zoneIcon}
                size={20}
                stroke={1.8}
              />
              <Text className={styles.zoneTitle} component="span" size="md">
                {isRoot ? '没有上一层' : '回到上一层'}
              </Text>
              <Text className={styles.zoneHint} component="span" size="xs">
                {isRoot ? '这里就是根目录' : '停 0.5 秒或点一下都能回去'}
              </Text>
            </UnstyledButton>

            <UnstyledButton
              className={cx(
                styles.zone,
                styles.rootZone,
                rootHovered && styles.rootHovered,
                isRoot && styles.zoneMuted,
              )}
              onClick={idle ? dropOnCancelZone : undefined}
              onDragEnter={() => setRootHovered(true)}
              onDragLeave={(event) => {
                if (isInsideSelf(event)) {
                  return;
                }

                setRootHovered(false);
              }}
              onDragOver={acceptMove}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setRootHovered(false);
                dropOnCancelZone();
              }}
            >
              <IconCornerUpLeft
                aria-hidden="true"
                className={styles.zoneIcon}
                size={20}
                stroke={1.8}
              />
              <Text className={styles.zoneTitle} component="span" size="md">
                {isRoot ? '已经在最外层' : '回到最外层'}
              </Text>
              <Text className={styles.zoneHint} component="span" size="xs">
                {isRoot ? '条目留在手里，接着挑或关窗' : '一路回到根目录，条目留在手里'}
              </Text>
            </UnstyledButton>
          </div>
        </div>
      )}
    </FreeModal>
  );
};

export default DragMoveModal;
