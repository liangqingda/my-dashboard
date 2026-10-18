import { Link } from 'react-router';
import { Group, Skeleton, Text } from '@mantine/core';
import { IconExternalLink, IconServer } from '@tabler/icons-react';

import { useServices } from '@/features/services/hooks/useServices';
import ServiceStatusPill from '@/features/services/service-status-pill';

import styles from './index.scss';

const ServicesOverview = () => {
  const { services, loading, agentOnline, lastUpdated } = useServices();
  const running = services.filter((service) => service.running).length;

  return (
    <section aria-label="本机服务概览" className={styles.card}>
      <header className={styles.header}>
        <Group gap="xs">
          <IconServer aria-hidden="true" className={styles.icon} size={17} />
          <Text component="h3" fw={600} size="sm">
            本机服务
          </Text>
          {!loading && agentOnline && (
            <Text c="dimmed" size="xs">
              运行 {running} / {services.length}
            </Text>
          )}
        </Group>
        <Link className={styles.more} to="/services">
          服务管理 →
        </Link>
      </header>
      {loading && (
        <div aria-label="正在读取服务" className={styles.loading}>
          <Skeleton h={36} />
          <Skeleton h={36} />
        </div>
      )}
      {!loading && services.length === 0 && (
        <Text c="dimmed" className={styles.empty} size="sm">
          {agentOnline
            ? '暂无已登记的服务。'
            : '暂时无法读取服务状态，可前往服务管理恢复连接。'}
        </Text>
      )}
      {services.length > 0 && (
        <ul aria-label="服务状态" className={styles.list}>
          {services.map((service) => {
            const canOpen =
              agentOnline &&
              service.running &&
              /^https?:\/\//.test(service.url ?? '');
            const ports = [
              service.port,
              ...service.extraPorts.map((port) => port.port),
            ]
              .filter((port) => port !== null)
              .join(' / ');

            return (
              <li className={styles.row} key={service.id}>
                <div className={styles.info}>
                  {canOpen ? (
                    <a
                      aria-label={`访问 ${service.name}`}
                      className={styles.nameLink}
                      href={service.url ?? undefined}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {service.name}
                      <IconExternalLink aria-hidden="true" size={12} />
                    </a>
                  ) : (
                    <Text fw={600} size="sm">
                      {service.name}
                    </Text>
                  )}
                  <Text c="dimmed" className={styles.description} size="xs">
                    {[service.description, ports].filter(Boolean).join(' · ')}
                  </Text>
                  {service.deployOutcome === 'failed' && (
                    <Text c="red" size="xs">
                      最近部署失败
                    </Text>
                  )}
                </div>
                {agentOnline ? (
                  <ServiceStatusPill
                    build={service.build}
                    compact
                    running={service.running}
                  />
                ) : (
                  <Text c="dimmed" size="xs">
                    未同步
                  </Text>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!loading && (
        <footer className={styles.footer}>
          <Text c="dimmed" size="xs">
            {agentOnline ? '已连接' : '已离线，状态待同步'}
            {lastUpdated
              ? ` · 上次更新 ${new Date(lastUpdated).toLocaleTimeString()}`
              : ''}
          </Text>
        </footer>
      )}
    </section>
  );
};

export default ServicesOverview;
