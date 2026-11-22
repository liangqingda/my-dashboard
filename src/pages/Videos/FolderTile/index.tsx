import { memo } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconFolderFilled } from '@tabler/icons-react';

import type { FolderTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条子文件夹：蓝色文件夹图标 + 名称 + 直属视频数，点击进入下一层目录。
 * 计数只数直属视频，不递归子文件夹（与中间件口径一致）。
 */
const FolderTile = memo(({ folder, onOpen }: FolderTileProps) => (
  <UnstyledButton
    aria-label={`打开文件夹 ${folder.name}`}
    className={styles.tile}
    onClick={() => onOpen(folder.path)}
    type="button"
  >
    <IconFolderFilled
      aria-hidden="true"
      className={styles.icon}
      size={32}
      stroke={1.2}
    />
    <span className={styles.body}>
      <span className={styles.name}>{folder.name}</span>
      <span className={styles.count}>
        {folder.videoCount > 0 ? `${folder.videoCount} 个视频` : '无视频'}
      </span>
    </span>
  </UnstyledButton>
));

export default FolderTile;
