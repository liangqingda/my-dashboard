import { Group, Text } from '@mantine/core';

import { useServices } from '@/services/hooks/useServices';
import ServiceActivity from '@/pages/Services/ServiceActivity';
import ServiceConnection from '@/pages/Services/ServiceConnection';
import ServiceRow from '@/pages/Services/ServiceRow';
import QuickCommands from '@/pages/Services/QuickCommands';
import { summarizeServices } from '@/pages/Services/utils';

import styles from './index.scss';

const ServicesManager = () => {
  const { services, loading, agentOnline, busy, start, stop, restart, deploy } =
    useServices();
  const { total, running, failed, autoStart } = summarizeServices(services);

  return (
    <div className={styles.manager}>
      <ServiceConnection />
      <Group gap="sm" justify="space-between">
        {services.length > 0 && (
          <Group aria-label="服务统计" gap="md">
            <Text c="dimmed" size="sm">
              共 {total} 个服务
            </Text>
            <Text className={styles.runningCount} size="sm">
              运行 {running}
            </Text>
            <Text c="dimmed" size="sm">
              停止 {total - running}
            </Text>
            {failed > 0 && (
              <Text c="red" size="sm">
                异常 {failed}
              </Text>
            )}
            <Text c="dimmed" size="sm">
              开机自启 {autoStart}
            </Text>
          </Group>
        )}
        <Group gap="xs">
          <ServiceActivity />
          <QuickCommands />
        </Group>
      </Group>
      <div aria-busy={loading} className={styles.list}>
        {loading && <Text className={styles.empty}>正在读取服务…</Text>}
        {!loading && agentOnline && services.length === 0 && (
          <Text c="dimmed" className={styles.empty}>
            暂无已登记的服务。
          </Text>
        )}
        {!loading && !agentOnline && services.length === 0 && (
          <Text c="dimmed" className={styles.empty}>
            恢复连接后显示服务列表。
          </Text>
        )}
        {services.map((service) => (
          <ServiceRow
            busy={busy}
            key={service.id}
            offline={!agentOnline}
            onDeploy={deploy}
            onRestart={restart}
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
