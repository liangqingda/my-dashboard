/**
 * 移动进度弹窗：照着 macOS 搬文件的观感——一句「正在将『a』移到『b』」+ 一条进度条 +
 * 「已搬 x / y 项」。搬到外接硬盘这类慢盘上一条要几秒，进度得看得见，不然会以为卡住了。
 *
 * 只在真的在搬时出现，搬的中途不给关（关窗键与遮罩点击全关掉）：这时中断只会在中间留下半截，
 * 失败的那一条会由移动那一侧弹通知并停在手持态，这里只负责如实显示走到哪一步。
 */
import { Progress, Stack, Text } from '@mantine/core';

import FreeModal from '@/components/modals/FreeModal';

import { baseNameOfPath } from '../utils/files';

import type { MoveProgressModalProps } from './types';

import styles from './index.scss';

const MoveProgressModal = ({ progress }: MoveProgressModalProps) => {
  /** 照 macOS 的口径：「正在将『旧名字』移到『目标目录名』」 */
  const currentName = progress === null ? '' : baseNameOfPath(progress.current);
  const targetName = progress === null ? '' : baseNameOfPath(progress.targetDir);
  const percent =
    progress === null || progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  return (
    <FreeModal
      centered
      closeButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      closeOnSpace={false}
      headerActions={
        progress === null ? null : (
          <Text c="dimmed" size="xs">
            {progress.done} / {progress.total}
          </Text>
        )
      }
      height="auto"
      onClose={() => undefined}
      opened={progress !== null}
      shortcutsEnabled={false}
      size="min(420px, 88vw)"
      title="正在移动"
      trapFocus={false}
      zIndex={700}
    >
      <Stack className={styles.body} gap="sm">
        <Text className={styles.line} size="sm">
          正在将「{currentName}」移到「{targetName}」
        </Text>
        <Progress
          animated={progress !== null}
          aria-label="移动进度"
          radius="sm"
          size="md"
          striped={progress !== null}
          value={percent}
        />
        <Text c="dimmed" size="xs">
          已搬 {progress?.done ?? 0} / {progress?.total ?? 0} 项，别关这个窗口就好
        </Text>
      </Stack>
    </FreeModal>
  );
};

export default MoveProgressModal;
