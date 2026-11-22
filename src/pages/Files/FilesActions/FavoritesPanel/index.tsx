/**
 * 收藏目录弹层面板：已收藏条目整行点击直达；移除按钮靠右、自己吞掉冒泡。
 * 「收藏 / 取消收藏当前目录」整宽按钮排在列表下方。
 * 条目两行：目录名在上，完整路径在下；路径过长省略，hover 显示全文。
 * 列表数据与持久化归 `useFavorites`，这里只排布与条目事件。
 */

import { Button, Stack, Text } from '@mantine/core';
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
    {favorites.length === 0 ? (
      <Text c="dimmed" size="xs">
        还没有收藏的目录
      </Text>
    ) : (
      <Stack gap={2}>
        {favorites.map((entry) => (
          <div
            className={styles.row}
            key={entry.path}
            onClick={() => {
              onOpen(entry.path);
              onClose();
            }}
          >
            <div className={styles.info}>
              <FreeTruncatedText className={styles.name} text={entry.name} />
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
          </div>
        ))}
      </Stack>
    )}

    <Button
      disabled={disabled}
      fullWidth
      onClick={onToggleFavorite}
      size="sm"
      variant="default"
    >
      {isFavorite ? '取消收藏当前目录' : '收藏当前目录'}
    </Button>
  </Stack>
);

export default FavoritesPanel;
