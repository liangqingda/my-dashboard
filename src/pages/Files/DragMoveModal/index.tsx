import type { DragEvent } from 'react';
import { useState } from 'react';
import { Group, Loader, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconArrowUp, IconFolderFilled, IconX } from '@tabler/icons-react';

import FreeModal from '@/components/modals/FreeModal';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { FolderEntry } from '../types';

import type { DragMoveModalProps } from './types';

import styles from './index.scss';

/**
 * 全屏常驻：落点要铺满整块屏幕才够展开多级目录，
 * header 按约定只留标题与关闭按钮，所以不给全屏切换入口。
 */
const FULLSCREEN = { active: true, onToggle: () => undefined, showToggle: false };

/** 拖拽进行中的操作提示 */
const HINT_DRAGGING =
  '拖到文件夹上松手即移入；停留 1.5 秒会进入该文件夹继续挑目标。';

/**
 * 松手后弹窗留下时的提示。浏览器在松手那一刻就结束了整次拖拽，
 * 所以这时只剩点选一条路——不说清楚的话，弹窗看着像卡住了。
 */
const HINT_PICKING = '拖拽已经在松手时结束：点文件夹即可移入，点右下角取消或关窗放弃。';

/** 还没有子文件夹时共用一个空数组，免得每次渲染都造一个新的 */
const NO_FOLDERS: FolderEntry[] = [];

/** 拖拽经过可放置区域都先关掉默认行为，否则浏览器不给 drop */
const acceptMove = (event: DragEvent<HTMLElement>) => {
  const { dataTransfer } = event;

  event.preventDefault();
  dataTransfer.dropEffect = 'move';
};

/** 指针在父子元素之间移动也会触发 dragleave：只认真离开整块的那一次 */
const isInsideSelf = (event: DragEvent<HTMLElement>): boolean => {
  const next = event.relatedTarget;

  return next instanceof Node && event.currentTarget.contains(next);
};

/**
 * 拖拽移动弹窗：拖起列表里的任一条目后自动打开，占满整屏，正文分三段——
 * 我们走到哪一层（面包屑）、这一层的子文件夹、底部两个停靠区。
 *
 * 松手在文件夹上＝移进去；停在同一文件夹上 1.5 秒＝它先弹一下，然后进入它继续挑；
 * 松手在文件夹列表的空白处＝放进当前这一层；底部右侧取消区＝回最外层（弹窗不关），
 * 底部左侧「上一层」停够 0.5 秒＝退一层；两者都在起点层时就是放弃本次移动。
 */
const DragMoveModal = ({ dragMove }: DragMoveModalProps) => {
  const {
    close,
    dragEnded,
    dropOnBlank,
    dropOnCancelZone,
    dropOnFolder,
    dropOnParentZone,
    error,
    hoverFolder,
    hoverParentZone,
    hoverPath,
    leaveFolder,
    leaveParentZone,
    levels,
    loading,
    parentHovering,
    session,
    springPath,
  } = dragMove;
  /** 取消区正被拖拽经过：加深底纹，让「松手就是取消」先被看见 */
  const [cancelHovered, setCancelHovered] = useState(false);

  const activeLevel = levels.at(-1) ?? null;
  const folders = activeLevel?.folders ?? NO_FOLDERS;
  const canGoBack = levels.length > 1;
  /** 目录栈拼成一行面包屑：从拖拽起点一直到当前这一层 */
  const trail = levels.map((level) => level.name).join('  /  ');
  /** 松手后弹窗留着时才有「点选」这条路，其余时刻点文件夹不动作 */
  const pickFolder = dragEnded ? dropOnFolder : undefined;

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
      <div
        className={styles.root}
        onDragOver={acceptMove}
        onDrop={(event) => {
          event.preventDefault();
          dropOnBlank();
        }}
      >
        <Stack className={styles.head} gap={2}>
          <Text className={styles.trail} size="xs">
            {trail}
          </Text>
          <Text c="dimmed" size="xs">
            {dragEnded ? HINT_PICKING : HINT_DRAGGING}
          </Text>
        </Stack>

        {loading ? (
          <Group
            className={styles.notice}
            gap="xs"
            justify="center"
            wrap="nowrap"
          >
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
            {canGoBack
              ? '这个文件夹里没有子文件夹，拖到底部左侧可退回上一层。'
              : '这个文件夹里没有子文件夹，可以拖到右下角取消。'}
          </Text>
        ) : null}

        {folders.length > 0 ? (
          <div className={styles.list}>
            <ScrollArea
              h="100%"
              offsetScrollbars="y"
              scrollbarSize={8}
              type="auto"
            >
              <div className={styles.grid}>
                {folders.map((folder) => (
                  <UnstyledButton
                    className={cx(
                      styles.folder,
                      hoverPath === folder.path && styles.hovered,
                      springPath === folder.path && styles.springing,
                    )}
                    key={folder.path}
                    onClick={
                      pickFolder === undefined
                        ? undefined
                        : () => pickFolder(folder.path)
                    }
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
                      <span aria-hidden="true" className={styles.countdown} />
                    ) : null}
                  </UnstyledButton>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : null}

        <div className={styles.dock}>
          <UnstyledButton
            className={cx(
              styles.zone,
              styles.backZone,
              parentHovering && styles.backHovered,
              !canGoBack && styles.zoneMuted,
            )}
            onClick={dragEnded ? dropOnParentZone : undefined}
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
              {canGoBack ? '回到上一层' : '已经在最外层'}
            </Text>
            <Text className={styles.zoneHint} component="span" size="xs">
              {canGoBack
                ? '指针停在这里 0.5 秒自动退一层'
                : '没有更上层的目录，松手即放弃'}
            </Text>
          </UnstyledButton>

          <UnstyledButton
            className={cx(
              styles.zone,
              styles.cancelZone,
              cancelHovered && styles.cancelHovered,
            )}
            onClick={dragEnded ? close : undefined}
            onDragEnter={() => setCancelHovered(true)}
            onDragLeave={(event) => {
              if (isInsideSelf(event)) {
                return;
              }

              setCancelHovered(false);
            }}
            onDragOver={acceptMove}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setCancelHovered(false);
              dropOnCancelZone();
            }}
          >
            <IconX
              aria-hidden="true"
              className={styles.zoneIcon}
              size={20}
              stroke={1.8}
            />
            <Text className={styles.zoneTitle} component="span" size="md">
              {canGoBack ? '取消 · 回到最外层' : '取消本次移动'}
            </Text>
            <Text className={styles.zoneHint} component="span" size="xs">
              {canGoBack ? '弹窗不关闭，可以继续挑目标' : '弹窗关闭，条目留在原位'}
            </Text>
          </UnstyledButton>
        </div>
      </div>
    </FreeModal>
  );
};

export default DragMoveModal;
