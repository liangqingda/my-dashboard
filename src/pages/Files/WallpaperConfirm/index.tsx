import { Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { WallpaperConfirmProps } from './types';

/**
 * 设为桌面墙纸确认：会立刻替换这台 Mac 所有屏幕与空间的桌面背景，
 * 不修改图片、也不删原文件；随时可以在系统设置里换回来。先问一句再动手。
 */
const WallpaperConfirm = ({
  loading,
  onCancel,
  onConfirm,
  request,
}: WallpaperConfirmProps) => (
  <ConfirmModal
    confirmLabel="设为墙纸"
    description={
      <>
        <Text size="sm">
          要把「
          <Text component="span" fw={600}>
            {request?.name ?? ''}
          </Text>
          」设为桌面墙纸吗？
        </Text>
        <Text c="dimmed" mt={4} size="xs">
          这台 Mac 所有屏幕与空间的桌面背景会立刻换成这张图；图片本身不会被修改，
          之后可以在系统设置里随时换回来。
        </Text>
      </>
    }
    loading={loading}
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={request !== null}
    size={400}
    title="设为桌面墙纸"
  />
);

export default WallpaperConfirm;
