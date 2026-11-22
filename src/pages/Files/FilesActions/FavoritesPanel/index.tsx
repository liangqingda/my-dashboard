/**
 * 收藏目录弹层面板：顶部收藏 / 取消当前目录，下方已收藏条目直达与移除。
 * 条目两行：目录名在上，完整路径在下；路径过长省略，hover 显示全文。
 * 列表数据与持久化归 `useFavorites`，这里只排布与条目事件。
 */

import { Button, Group, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import type { FavoritesPanelProps } from './types';

import styles from './index.scss';

const FavoritesPanel = ({
  disabled,
  favorites,
  isFavorite,
  onClose,
  onOpen,
  onRemove,
  onToggleFavorite,
}: FavoritesPanelProps) => (
  <Stack gap="sm">
    <Button
      disabled={disabled}
      fullWidth
      onClick={onToggleFavorite}
      size="compact-sm"
      variant="default"
    >
      {isFavorite ? '取消收藏当前目录' : '收藏当前目录'}
    </Button>

    {favorites.length === 0 ? (
      <Text c="dimmed" size="xs">
        还没有收藏的目录
      </Text>
    ) : (
      <Stack gap={2}>
        {favorites.map((entry) => (
          <Group className={styles.row} gap="xs" key={entry.path} wrap="nowrap">
            <div className={styles.info}>
              <FreeTruncatedText
                className={styles.name}
                onClick={() => {
                  onOpen(entry.path);
                  onClose();
                }}
                text={entry.name}
              />
              <FreeTruncatedText className={styles.path} text={entry.path} />
            </div>
            <FreeIconAction
              label="移除收藏"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(entry.path);
              }}
              size="xs"
              tooltip="none"
            >
              <IconX size={13} />
            </FreeIconAction>
          </Group>
        ))}
      </Stack>
    )}
  </Stack>
);

export default FavoritesPanel;
