/**
 * 服务管理面板：服务页的主体内容。
 * 包含 agent 在线提示、汇总计数与各服务的启停列表。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconPlayerPlay, IconReload } from '@tabler/icons-react';

import { startAgent } from '@/features/services/api';
import { useServices } from '@/features/services/hooks/useServices';
import QuickCommands from '@/features/services/quick-commands';
import ServiceRow from '@/features/services/service-row';

import styles from './index.scss';

const ServicesManager = () => {
  const { services, loading, agentOnline, error, busy, refresh, start, stop, restart, deploy } =
    useServices();

  const [agentStarting, setAgentStarting] = useState(false);

  const handleStartAgent = async () => {
    setAgentStarting(true);

    try {
      await startAgent();
      await refresh();
    } catch (err) {
      notifications.show({ title: 'agent 启动失败', message: err instanceof Error ? err.message : '请稍后重试', color: 'red' });
    } finally {
      setAgentStarting(false);
    }
  };

  const runningCount = services.filter((service) => service.running).length;
  const stoppedCount = services.length - runningCount;
  const autoStartCount = services.filter((service) => service.autoStart).length;

  return (
    <div className={styles.manager}>
      {!loading && !agentOnline && (
        <Alert
          className={styles.alert}
          color="yellow"
          icon={<IconAlertCircle size={18} />}
          title="无法连接本机服务 agent"
          variant="light"
        >
          <Group align="center" gap="md" justify="space-between">
            <Text size="sm">
              {import.meta.env.DEV ? (
                '服务管理暂不可用。点击「启动 agent」恢复连接；若已在运行，可尝试重新连接。'
              ) : (
                <>服务管理暂不可用。请在本机启动 agent（<code className={styles.code}>pnpm agent:bg</code>），再重新连接。</>
              )}
            </Text>
            <Group gap="xs">
              {import.meta.env.DEV && (
                <Button
                  leftSection={<IconPlayerPlay size={14} />}
                  loading={agentStarting}
                  onClick={() => void handleStartAgent()}
                  size="xs"
                  variant="light"
                >
                  启动 agent
                </Button>
              )}
              <Button
                disabled={agentStarting}
                leftSection={<IconReload size={14} />}
                onClick={() => void refresh()}
                size="xs"
                variant="subtle"
              >
                重新连接
              </Button>
            </Group>
          </Group>
        </Alert>
      )}

      {agentOnline && error && (
        <Alert
          className={styles.alert}
          color="red"
          icon={<IconAlertCircle size={18} />}
          title="操作提示"
          variant="light"
        >
          {error}
        </Alert>
      )}

      <div className={styles.summary}>
        <Group gap="md" wrap="nowrap">
          <Text c="dimmed" size="sm">
            共 {services.length} 个服务
          </Text>
          <Text className={styles.runningCount} size="sm">
            运行 {runningCount}
          </Text>
          <Text c="dimmed" size="sm">
            停止 {stoppedCount}
          </Text>
          <Text className={styles.autoStartCount} size="sm">
            开机自启 {autoStartCount}
          </Text>
        </Group>
        {loading && <Text c="dimmed" size="sm">加载中…</Text>}
      </div>

      <div className={styles.grid}>
        <div className={styles.list}>
          {!loading && services.length === 0 && (
            <Text c="dimmed" className={styles.empty}>
              暂无服务，可在 agent/services.json 中登记。
            </Text>
          )}
          {services.map((service) => (
            <ServiceRow
              busy={busy}
              key={service.id}
              onDeploy={deploy}
              onRestart={restart}
              onStart={start}
              onStop={stop}
              service={service}
            />
          ))}
        </div>

        <QuickCommands />
      </div>
    </div>
  );
};

export default ServicesManager;
