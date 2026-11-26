import { useState } from 'react';
import { Progress, UnstyledButton } from '@mantine/core';
import { IconFolderFilled } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { SPRING_HOVER_MS } from '../../hooks/use-drag-move/constants';
import { allInsideDir } from '../../hooks/use-drag-move/utils';
import { acceptMove, leaveOutside } from '../utils';

import type { FolderGridProps } from './types';

import styles from './index.scss';

/** 拖过来的东西本来就全在那一格里：瓦片显示成禁用态，并在格子里说明原因 */
const HINT_ALREADY_INSIDE = '本来就在这个文件夹里';

/**
 * 弹窗里的文件夹落点网格：一格一个子文件夹。
 *
 * - **点一下**（不在拖拽时）＝进入这一层；
 * - **拖拽经过 1 秒**＝先弹一下再进入（前 0.5 秒不画进度，后 0.5 秒进度条才填）；
 * - **松手**＝移进这一格（由 `onDrop` 交给会话，那里再按父目录过滤一遍）；
 * - **手上的条目本来就全在这一格里**＝这一格是禁用落点：虚线边 + 压暗，指针压上来时
 *   在格子里补一句「本来就在这个文件夹里」，不起进入计时，也不画倒计时（放进去等于没动）。
 */
const FolderGrid = ({
  dragActive,
  entries,
  folders,
  hoverPath,
  idle,
  onDrop,
  onEnter,
  onLeave,
  onOpen,
  progress,
  springPath,
}: FolderGridProps) => {
  /** 指针正压在一个禁用落点上：只有它需要额外说明（其余格子没有禁用的理由） */
  const [blockedPath, setBlockedPath] = useState<string | null>(null);

  /** 这一格是不是「手上的条目本来就全在里面」：拖拽中才谈得上禁用，平常还要能点进去 */
  const isBlocked = (path: string): boolean =>
    dragActive && allInsideDir(entries, path);

  return (
    <div className={styles.grid}>
      {folders.map((folder) => {
        const blocked = isBlocked(folder.path);
        const blockedHovered = blocked && blockedPath === folder.path;
        /** 这一格就是本次搬家的落点：`done / total` 直接画在它身上 */
        const receiving =
          progress !== null && progress.targetDir === folder.path ? progress : null;
        const percent =
          receiving === null || receiving.total === 0
            ? 0
            : Math.round((receiving.done / receiving.total) * 100);

        return (
          <UnstyledButton
            className={cx(
              styles.folder,
              hoverPath === folder.path && styles.hovered,
              springPath === folder.path && styles.springing,
              blocked && styles.blocked,
              blockedHovered && styles.blockedOn,
              receiving !== null && styles.moving,
            )}
            key={folder.path}
            onClick={idle ? () => onOpen(folder.path) : undefined}
            onDragLeave={(event) =>
              leaveOutside(event, () => {
                onLeave(folder.path);
                setBlockedPath(null);
              })
            }
            onDragOver={(event) => {
              event.stopPropagation();

              if (blocked) {
                // 禁用落点：不给进入计时、也不亮倒计时，只在格子里说明原因
                event.preventDefault();
                const { dataTransfer } = event;

                dataTransfer.dropEffect = 'none';
                onLeave(folder.path);
                setBlockedPath(folder.path);

                return;
              }

              setBlockedPath(null);
              acceptMove(event);
              onEnter(folder.path);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setBlockedPath(null);
              onDrop(folder.path);
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
            {receiving === null ? null : (
              <span className={styles.movingText}>
                正在移动 {receiving.done} / {receiving.total}
              </span>
            )}
            {blockedHovered ? (
              <span className={styles.blockedTip}>{HINT_ALREADY_INSIDE}</span>
            ) : null}
            {!blocked && hoverPath === folder.path && receiving === null ? (
              <span
                aria-hidden="true"
                className={styles.countdown}
                style={{ animationDuration: `${SPRING_HOVER_MS}ms` }}
              />
            ) : null}
            {receiving === null ? null : (
              <Progress
                aria-label="移动进度"
                className={styles.moveBar}
                radius="xl"
                size={4}
                striped
                value={percent}
              />
            )}
          </UnstyledButton>
        );
      })}
    </div>
  );
};

export default FolderGrid;
