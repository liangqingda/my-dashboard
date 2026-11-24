import { Badge, Divider, ScrollArea, Stack, Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { VolumeBusyConfirmProps } from './types';

import styles from './index.scss';

/**
 * 外接盘被占用：第一次卸载没成功时弹这扇窗，逐条列出还占着盘的进程。
 * 确认只会结束「同用户、非系统关键」的进程，然后重试普通卸载（从不强制推出）。
 * 系统进程（Spotlight、Finder 这类）与别的用户起的进程只展示、不做动作。
 */
const VolumeBusyConfirm = ({
  busy,
  loading,
  onCancel,
  onConfirm,
  volume,
}: VolumeBusyConfirmProps) => {
  const holders = busy?.holders ?? [];
  const killable = holders.filter((holder) => holder.canKill);
  const protectedCount = holders.length - killable.length;

  const summary = (() => {
    if (busy === null) {
      return null;
    }

    if (!busy.holdersKnown) {
      return '没能列出具体是哪个程序在占用（系统工具不可用或超时），可以在「活动监视器」里看谁在读写这块盘。';
    }

    if (holders.length === 0) {
      return '这次没查出具体进程，可能是系统还在收尾，可以稍等几秒再试一次。';
    }

    return '结束这些程序后会自动重试卸载。被结束的进程里未保存的改动会丢失。';
  })();

  return (
    <ConfirmModal
      cancelLabel="不推出"
      confirmDisabled={busy === null}
      confirmLabel={
        killable.length > 0 ? `结束 ${killable.length} 个进程并推出` : '重试推出'
      }
      danger={killable.length > 0}
      description={
        <>
          <Text size="sm">
            「
            <Text component="span" fw={600}>
              {volume?.name ?? '外接盘'}
            </Text>
            」还被{holders.length > 0 ? ` ${holders.length} 个进程` : '别的程序'}占着，
            系统拒绝了这次卸载。
          </Text>
          {busy?.message ? (
            <Text c="dimmed" mt={4} size="xs">
              {busy.message}
            </Text>
          ) : null}
          <Text c="dimmed" mt={4} size="xs">
            {summary}
          </Text>
        </>
      }
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
      opened={busy !== null}
      size={460}
      title="外接盘还被占用"
    >
      {holders.length > 0 ? (
        <ScrollArea.Autosize className={styles.holderList} mah={220} type="auto">
          <Stack gap={0}>
            {holders.map((holder, index) => (
              <Stack gap={2} key={holder.pid} pb={6} pt={index > 0 ? 6 : 0}>
                {index > 0 ? <Divider mb={4} /> : null}
                <Text fw={600} size="sm" truncate>
                  {holder.name}
                  <Text c="dimmed" component="span" fw={400} ml={6} size="xs">
                    PID {holder.pid}
                    {holder.user ? ` · ${holder.user}` : ''}
                  </Text>
                </Text>
                {holder.canKill ? null : (
                  <Badge color="gray" size="xs" variant="light">
                    不会自动结束
                  </Badge>
                )}
                {holder.reason ? (
                  <Text c="dimmed" size="xs">
                    {holder.reason}
                  </Text>
                ) : null}
              </Stack>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      ) : null}

      {protectedCount > 0 ? (
        <Text c="dimmed" mt="xs" size="xs">
          标了「不会自动结束」的 {protectedCount} 个进程需要你自己关掉（系统进程或别的用户启动的），
          否则还会挡住卸载。
        </Text>
      ) : null}
    </ConfirmModal>
  );
};

export default VolumeBusyConfirm;
