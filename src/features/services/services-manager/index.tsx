/**
 * 服务管理面板：服务页的主体内容。
 * 包含 agent 在线提示、汇总计数与各服务的启停列表。
 */

import { Alert, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconReload } from '@tabler/icons-react';

import { useServices } from '@/features/services/hooks/useServices';
import ServiceRow from '@/features/services/service-row';

import styles from './index.scss';

export type ServicesManagerProps = {
  /** 轮询间隔（毫秒），默认 3 秒 */
  pollIntervalMs?: number;
};

const ServicesManager = ({ pollIntervalMs = 3000 }: ServicesManagerProps) => {
  const { services, loading, agentOnline, error, busyId, refresh, start, stop } =
    useServices(pollIntervalMs);

  const runningCount = services.filter((service) => service.running).length;
  const stoppedCount = services.length - runningCount;

  return (
    <div className={styles.manager}>
      {!agentOnline && (
        <Alert
          className={styles.alert}
          color="yellow"
          icon={<IconAlertCircle size={18} />}
          title="本机服务 agent 未运行"
          variant="light"
        >
          <Group align="center" gap="md" justify="space-between">
            <Text size="sm">
              服务启停需本地 agent（agent/server.mjs）。请先在 my-dashboard 目录运行
              <code className={styles.code}>pnpm agent:bg</code> 或
              <code className={styles.code}>pnpm agent</code>，再点刷新。
            </Text>
            <button className={styles.retry} onClick={() => void refresh()} type="button">
              <IconReload size={14} />
              刷新
            </button>
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
        </Group>
        {loading && <Text c="dimmed" size="sm">加载中…</Text>}
      </div>

      <div className={styles.list}>
        {!loading && services.length === 0 && (
          <Text c="dimmed" className={styles.empty}>
            暂无服务，可在 agent/services.json 中登记。
          </Text>
        )}
        {services.map((service) => (
          <ServiceRow
            busy={busyId === service.id}
            key={service.id}
            onStart={start}
            onStop={stop}
            service={service}
          />
        ))}
      </div>
    </div>
  );
};

export default ServicesManager;
