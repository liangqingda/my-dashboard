import { memo } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconFolderFilled } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import type { FolderTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条子文件夹：蓝色文件夹图标居上，名称与直属条目数纵向排在图标下方并居中，
 * 点击进入下一层目录。计数只数直属条目，不递归子文件夹（与中间件口径一致）；
 * 名称最多两行，超出做中间省略保留尾部，hover 时给全量。
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
      size={48}
      stroke={1.2}
    />
    <span className={styles.body}>
      <FreeTruncatedText
        className={styles.name}
        ellipsis="middle"
        lines={2}
        position="top"
        text={folder.name}
      />
      <span className={styles.count}>
        {folder.itemCount > 0 ? `${folder.itemCount} 个项目` : '空文件夹'}
      </span>
    </span>
  </UnstyledButton>
));

export default FolderTile;
