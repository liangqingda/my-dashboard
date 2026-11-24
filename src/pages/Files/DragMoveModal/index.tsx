import type { DragEvent } from 'react';
import { useState } from 'react';
import { Group, Loader, ScrollAreaAutosize, Stack, Text } from '@mantine/core';
import { IconCornerUpLeft, IconFolderFilled } from '@tabler/icons-react';

import FreeModal from '@/components/modals/FreeModal';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { FolderEntry } from '../types';

import type { DragMoveModalProps } from './types';

import styles from './index.scss';

/** 弹窗宽度：文件夹再多也不铺满整屏，窄屏两侧留出边距 */
const MODAL_SIZE = 'min(760px, 94vw)';

/** 文件夹列表最高一档：再高会把取消区挤出视线 */
const FOLDER_LIST_MAX_HEIGHT = 'min(42vh, 340px)';

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
 * 拖拽移动弹窗：拖起列表里的任一条目后自动打开，正文分三段——
 * 当前位置（目录栈）、当前这一层的子文件夹、底部整条取消区。
 *
 * 松手在文件夹上＝移进去；停在同一文件夹上 1.5 秒＝它先弹一下，然后进入它继续挑；
 * 松手在文件夹列表的空白处＝放进当前这一层；松手在取消区＝多层时退回最外层（弹窗不关），
 * 已在最外层则取消整次移动并关窗。点关闭 / Esc / 拖拽自行结束同样只取消、不移动。
 */
const DragMoveModal = ({ dragMove }: DragMoveModalProps) => {
  const {
    close,
    dropOnBlank,
    dropOnCancelZone,
    dropOnFolder,
    error,
    hoverFolder,
    hoverPath,
    leaveFolder,
    levels,
    loading,
    session,
    springPath,
  } = dragMove;
  /** 取消区正被拖拽经过：加深底纹，让「松手就是取消」先被看见 */
  const [cancelHovered, setCancelHovered] = useState(false);

  const activeLevel = levels.at(-1) ?? null;
  const folders = activeLevel?.folders ?? NO_FOLDERS;
  const canGoOuter = levels.length > 1;
  /** 目录栈拼成一行面包屑：从拖拽起点一直到当前这一层 */
  const trail = levels.map((level) => level.name).join('  /  ');

  return (
    <FreeModal
      closeOnClickOutside={false}
      closeOnEscape
      height="auto"
      onClose={close}
      opened={session !== null}
      size={MODAL_SIZE}
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
        <Stack gap={2}>
          <Text className={styles.trail} size="xs">
            {trail}
          </Text>
          <Text c="dimmed" size="xs">
            拖到文件夹上松手即移入；停留 1.5 秒会进入该文件夹继续挑。
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
            这个文件夹里没有子文件夹，可以拖到底部取消区。
          </Text>
        ) : null}

        {folders.length > 0 ? (
          <ScrollAreaAutosize
            className={styles.scroll}
            mah={FOLDER_LIST_MAX_HEIGHT}
            offsetScrollbars="y"
            scrollbarSize={6}
            type="auto"
          >
            <div className={styles.grid}>
              {folders.map((folder) => (
                <div
                  className={cx(
                    styles.folder,
                    hoverPath === folder.path && styles.hovered,
                    springPath === folder.path && styles.springing,
                  )}
                  key={folder.path}
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
                    size={30}
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
                </div>
              ))}
            </div>
          </ScrollAreaAutosize>
        ) : null}

        <div
          className={cx(
            styles.cancelZone,
            cancelHovered && styles.cancelHovered,
          )}
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
          <IconCornerUpLeft
            aria-hidden="true"
            className={styles.cancelIcon}
            size={16}
            stroke={1.8}
          />
          <Text className={styles.cancelTitle} size="sm">
            {canGoOuter ? '松手回到最外层' : '松手取消本次移动'}
          </Text>
          <Text className={styles.cancelHint} size="xs">
            {canGoOuter ? '弹窗不关闭，可以继续挑目标' : '弹窗关闭，条目留在原位'}
          </Text>
        </div>
      </div>
    </FreeModal>
  );
};

export default DragMoveModal;
