/**
 * 服务概览区域：首页概览中的本机服务摘要。
 * 展示运行/停止计数、各服务状态的紧凑行与快捷启停，可跳转至服务页。
 */

import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconPlayerPlay, IconPlayerStop, IconServer } from '@tabler/icons-react';
import { Link } from 'react-router';

import { useServices } from '@/features/services/hooks/useServices';
import ServiceStatusPill from '@/features/services/service-status-pill';

import styles from './index.scss';

export type ServicesOverviewProps = {
  /** 轮询间隔（毫秒），默认 5 秒 */
  pollIntervalMs?: number;
};

const ServicesOverview = ({ pollIntervalMs = 5000 }: ServicesOverviewProps) => {
  const { services, loading, agentOnline, busyId, start, stop } =
    useServices(pollIntervalMs);

  const runningCount = services.filter((service) => service.running).length;

  return (
    <section aria-label="本机服务概览" className={styles.overview}>
      <Group className={styles.head} justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <IconServer className={styles.headIcon} size={18} stroke={1.9} />
          <Text fw={600}>本机服务</Text>
          {agentOnline && (
            <Text c="dimmed" size="sm">
              运行 {runningCount} / {services.length}
            </Text>
          )}
        </Group>
        <Link className={styles.more} to="/services">
          服务管理
        </Link>
      </Group>

      <div className={styles.body}>
        {!agentOnline && !loading && (
          <Text c="dimmed" size="sm">
            agent 未运行，无法读取服务状态。
          </Text>
        )}

        {agentOnline &&
          services.map((service) => (
            <div className={styles.row} key={service.id}>
              <div className={styles.rowTitle}>
                <Text className={styles.rowName} fw={500} size="sm">
                  {service.name}
                </Text>
                <Text c="dimmed" size="xs">
                  {service.port ? `端口 ${service.port}` : '—'}
                </Text>
              </div>

              <ServiceStatusPill build={service.build} running={service.running} />

              <Group gap="xs" wrap="nowrap">
                <Tooltip label="启动" withArrow>
                  <ActionIcon
                    aria-label={`启动 ${service.name}`}
                    color="teal"
                    disabled={service.running}
                    loading={busyId === service.id}
                    onClick={() => start(service.id)}
                    variant="light"
                  >
                    <IconPlayerPlay size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="停止" withArrow>
                  <ActionIcon
                    aria-label={`停止 ${service.name}`}
                    color="gray"
                    disabled={!service.running}
                    loading={busyId === service.id}
                    onClick={() => stop(service.id)}
                    variant="light"
                  >
                    <IconPlayerStop size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </div>
          ))}
      </div>
    </section>
  );
};

export default ServicesOverview;
