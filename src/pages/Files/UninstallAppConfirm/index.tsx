import { Group, Loader, ScrollArea, Stack, Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { UninstallAppConfirmProps } from './types';

import styles from './index.scss';

/**
 * 应用卸载确认：先退应用，再删整包与用户数据 / 缓存 / 偏好设置等残留，均不可恢复。
 * 残留清单在打开时现取，取到之前确认按钮不可点；清单逐条列出（标签 + 绝对路径），
 * 让用户看得到「卸载干净」到底删哪些位置，而不是一句笼统承诺。
 */
const UninstallAppConfirm = ({
  app,
  loadingReport,
  onCancel,
  onConfirm,
  report,
  reportError,
  uninstalling,
}: UninstallAppConfirmProps) => (
  <ConfirmModal
    confirmDisabled={loadingReport || reportError !== null || report === null}
    confirmLabel="卸载"
    danger
    description={
      <>
        <Text size="sm">
          要卸载「
          <Text component="span" fw={600}>
            {app?.name ?? ''}
          </Text>
          」吗？
        </Text>
        <Text c="dimmed" className={styles.appPath} mt={4} size="xs">
          {app?.path ?? ''}
        </Text>
        <Text c="dimmed" mt={4} size="xs">
          会先退出应用，再删除应用包与残留；需要管理员权限时会弹出 macOS
          授权窗口。卸载后不可恢复。
        </Text>
      </>
    }
    loading={uninstalling}
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={app !== null}
    size={460}
    title="卸载应用"
  >
    {loadingReport ? (
      <Group gap="xs" justify="center" mt="sm" wrap="nowrap">
        <Loader size="xs" />
        <Text c="dimmed" size="xs">
          正在检测缓存与配置残留…
        </Text>
      </Group>
    ) : null}

    {reportError !== null ? (
      <Text c="red" mt="sm" size="xs">
        {reportError}
      </Text>
    ) : null}

    {report !== null && report.residues.length > 0 ? (
      <Stack gap={4} mt="sm">
        <Text fw={600} size="xs">
          {`将一并删除以下 ${report.residues.length} 项残留`}
        </Text>
        <ScrollArea h={170} type="auto">
          <Stack gap={6}>
            {report.residues.map((residue) => (
              <div key={residue.path}>
                <Text c="dimmed" size="xs">
                  {residue.label}
                </Text>
                <Text className={styles.residuePath} size="xs">
                  {residue.path}
                </Text>
              </div>
            ))}
          </Stack>
        </ScrollArea>
      </Stack>
    ) : null}

    {report !== null && report.residues.length === 0 ? (
      <Text c="dimmed" mt="sm" size="xs">
        没有发现额外残留，只删除应用本体。
      </Text>
    ) : null}
  </ConfirmModal>
);

export default UninstallAppConfirm;
