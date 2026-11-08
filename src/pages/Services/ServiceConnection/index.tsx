import { useState } from 'react';
import { Alert, Button, Group, Text } from '@mantine/core';
import {
  IconAlertCircle,
  IconPlayerPlay,
  IconRefresh,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';

import { startAgent } from '@/services/api';
import { useServices } from '@/services/hooks/useServices';
import { getErrorMessage } from '@/utils/error';
import { formatTime } from '@/utils/format';

import styles from './index.scss';

const ServiceConnection = () => {
  const { loading, refreshing, agentOnline, error, lastUpdated, refresh } =
    useServices();
  const [starting, setStarting] = useState(false);
  const [showRefreshActivity] = useDebouncedValue(refreshing, 200);
  const connectionLabel = agentOnline ? '已连接' : '已离线';
  const updatedLabel = lastUpdated
    ? `上次更新 ${formatTime(lastUpdated)}`
    : '尚未同步';
  const statusText = loading
    ? '正在读取服务状态…'
    : `${connectionLabel} · ${updatedLabel}`;

  const connect = async () => {
    setStarting(true);

    try {
      await startAgent();
      await refresh();
    } catch (err) {
      notifications.show({
        title: '连接失败',
        message: getErrorMessage(err, '请稍后重试'),
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
              请在本机运行 pnpm start 后重新连接。
            </Text>
          )}
        </Alert>
      )}
      <Group gap="sm" justify="space-between">
        <Text aria-live="polite" c="dimmed" size="xs">
          {statusText}
        </Text>
        {/* 在线时由侧边栏刷新图标与页面自身刷新取数，这里只在离线后给出手动重连入口 */}
        {!loading && !agentOnline ? (
          <Group gap="xs">
            {import.meta.env.DEV ? (
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                loading={starting}
                onClick={() => void connect()}
                size="xs"
                variant="light"
              >
                恢复连接
              </Button>
            ) : null}
            <Button
              aria-busy={refreshing}
              aria-disabled={starting || refreshing}
              className={styles.refreshButton}
              disabled={starting}
              leftSection={
                <IconRefresh
                  aria-hidden="true"
                  className={showRefreshActivity ? styles.refreshing : undefined}
                  size={14}
                />
              }
              onClick={() => void refresh()}
              size="xs"
              variant="subtle"
            >
              重新连接
            </Button>
          </Group>
        ) : null}
      </Group>
    </div>
  );
};

export default ServiceConnection;
