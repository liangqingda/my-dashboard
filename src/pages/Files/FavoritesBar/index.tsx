import { Group, UnstyledButton } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { FavoritesBarProps } from './types';

import styles from './index.scss';

/**
 * 收藏条：已收藏的目录排成一行可点胶囊，点名字直达该目录；当前正在浏览的那条高亮，
 * 胶囊尾部的小按钮移除收藏。列表为空时整条不渲染。
 */
const FavoritesBar = ({
  favorites,
  currentDir,
  onOpen,
  onRemove,
}: FavoritesBarProps) => (
  <Group className={styles.bar} gap={6} wrap="wrap">
    {favorites.map((favorite) => {
      const active = favorite.path === currentDir;

      return (
        <Group
          className={cx(styles.chip, active && styles.chipActive)}
          gap={2}
          key={favorite.path}
          wrap="nowrap"
        >
          <UnstyledButton
            className={styles.label}
            onClick={() => onOpen(favorite.path)}
            type="button"
          >
            <FreeTruncatedText inline position="top" text={favorite.name} />
          </UnstyledButton>
          <FreeIconAction
            label="移除收藏"
            onClick={() => onRemove(favorite.path)}
            size="xs"
            tooltip="none"
          >
            <IconX size={13} />
          </FreeIconAction>
        </Group>
      );
    })}
  </Group>
);

export default FavoritesBar;
