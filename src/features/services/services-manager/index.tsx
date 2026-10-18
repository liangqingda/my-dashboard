import { Group, Text } from '@mantine/core';

import { useServices } from '@/features/services/hooks/useServices';
import QuickCommands from '@/features/services/quick-commands';
import ServiceConnection from '@/features/services/service-connection';
import ServiceRow from '@/features/services/service-row';

import styles from './index.scss';

const ServicesManager = () => {
  const { services, loading, agentOnline, busy, start, stop, restart, deploy } =
    useServices();
  const running = services.filter((service) => service.running).length;
  const failed = services.filter(
    (service) => service.build === 'fail' || service.deployOutcome === 'failed',
  ).length;

  return (
    <div className={styles.manager}>
      <ServiceConnection />
      {services.length > 0 && (
        <Group aria-label="服务统计" gap="md">
          <Text c="dimmed" size="sm">
            共 {services.length} 个服务
          </Text>
          <Text className={styles.runningCount} size="sm">
            运行 {running}
          </Text>
          <Text c="dimmed" size="sm">
            停止 {services.length - running}
          </Text>
          {failed > 0 && (
            <Text c="red" size="sm">
              异常 {failed}
            </Text>
          )}
          <Text c="dimmed" size="sm">
            开机自启 {services.filter((service) => service.autoStart).length}
          </Text>
        </Group>
      )}
      <div className={styles.grid}>
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
        <QuickCommands />
      </div>
    </div>
  );
};

export default ServicesManager;
