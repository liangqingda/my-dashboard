import { useState } from 'react';
import { Alert, Button, Group, Text } from '@mantine/core';
import {
  IconAlertCircle,
  IconPlayerPlay,
  IconRefresh,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

import { startAgent } from '@/features/services/api';
import { useServices } from '@/features/services/hooks/useServices';

import styles from './index.scss';

const ServiceConnection = () => {
  const { loading, refreshing, agentOnline, error, lastUpdated, refresh } =
    useServices();
  const [starting, setStarting] = useState(false);

  const connect = async () => {
    setStarting(true);

    try {
      await startAgent();
      await refresh();
    } catch (err) {
      notifications.show({
        title: '连接失败',
        message: err instanceof Error ? err.message : '请稍后重试',
        color: 'red',
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={styles.connection}>
      {!loading && !agentOnline && (
        <Alert
          color="yellow"
          icon={<IconAlertCircle size={18} />}
          title="本机服务连接中断"
        >
          {lastUpdated
            ? '以下为上次读取的数据，状态可能已变化。恢复连接后才能操作服务。'
            : '暂时无法读取服务状态，请尝试恢复连接。'}
          {error && (
            <Text mt={4} size="xs">
              {error}
            </Text>
          )}
          {!import.meta.env.DEV && (
            <Text mt={4} size="xs">
              请在本机运行 pnpm agent:bg 后重新连接。
            </Text>
          )}
        </Alert>
      )}
      <Group gap="sm" justify="space-between">
        <Text aria-live="polite" c="dimmed" size="xs">
          {loading
            ? '正在读取服务状态…'
            : `${agentOnline ? '已连接' : '已离线'} · ${lastUpdated ? `上次更新 ${new Date(lastUpdated).toLocaleTimeString()}` : '尚未同步'}`}
        </Text>
        <Group gap="xs">
          {!loading && !agentOnline && import.meta.env.DEV && (
            <Button
              leftSection={<IconPlayerPlay size={14} />}
              loading={starting}
              onClick={() => void connect()}
              size="xs"
              variant="light"
            >
              恢复连接
            </Button>
          )}
          <Button
            disabled={starting}
            leftSection={<IconRefresh size={14} />}
            loading={refreshing}
            onClick={() => void refresh()}
            size="xs"
            variant="subtle"
          >
            {agentOnline ? '刷新状态' : '重新连接'}
          </Button>
        </Group>
      </Group>
    </div>
  );
};

export default ServiceConnection;
