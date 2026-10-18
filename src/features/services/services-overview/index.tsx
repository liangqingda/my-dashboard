import { Link } from 'react-router';
import { Group, Skeleton, Text } from '@mantine/core';
import {
  IconArrowUpRight,
  IconCheck,
  IconClock,
  IconServer,
  IconAlertCircle,
} from '@tabler/icons-react';

import { useServices } from '@/features/services/hooks/useServices';
import ServiceConnection from '@/features/services/service-connection';

import styles from './index.scss';

const ServicesOverview = () => {
  const { services, loading, agentOnline, activity } = useServices();
  const running = services.filter((service) => service.running).length;
  const issues = services.filter(
    (service) => service.build === 'fail' || service.deployOutcome === 'failed',
  );
  const links = services.filter((service) =>
    /^https?:\/\//.test(service.url ?? ''),
  );
  const value = (number: number) => (loading || !agentOnline ? '—' : number);

  return (
    <div className={styles.overview}>
      <ServiceConnection />
      <section aria-label="本机服务概览" className={styles.stats}>
        {[
          { label: '已登记服务', number: services.length, icon: IconServer },
          { label: '正在运行', number: running, icon: IconCheck },
          { label: '需要关注', number: issues.length, icon: IconAlertCircle },
        ].map(({ label, number, icon: Icon }) => (
          <div className={styles.stat} key={label}>
            <Group gap="xs">
              <Icon aria-hidden="true" size={17} />
              <Text c="dimmed" size="sm">
                {label}
              </Text>
            </Group>
            <Text className={styles.statValue}>{value(number)}</Text>
          </div>
        ))}
      </section>
      <div className={styles.columns}>
        <section aria-label="常用入口" className={styles.panel}>
          <Group justify="space-between">
            <Text component="h3" fw={600}>
              常用入口
            </Text>
            <Link className={styles.more} to="/services">
              管理服务 →
            </Link>
          </Group>
          {loading && <Skeleton h={70} mt="md" />}
          {!loading && links.length === 0 && (
            <Text c="dimmed" mt="md" size="sm">
              {agentOnline ? '暂无可访问的服务。' : '连接后显示常用服务入口。'}
            </Text>
          )}
          <div className={styles.links}>
            {links.map((service) =>
              service.running && agentOnline ? (
                <a
                  className={styles.serviceLink}
                  href={service.url ?? undefined}
                  key={service.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div>
                    <Text fw={600} size="sm">
                      {service.name}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {service.description}
                    </Text>
                  </div>
                  <IconArrowUpRight aria-hidden="true" size={18} />
                </a>
              ) : (
                <div className={styles.serviceInactive} key={service.id}>
                  <div>
                    <Text fw={600} size="sm">
                      {service.name}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {agentOnline
                        ? '服务已停止，可前往服务页启动'
                        : '状态未同步'}
                    </Text>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
        <section aria-label="需要关注" className={styles.panel}>
          <Text component="h3" fw={600}>
            需要关注
          </Text>
          <div className={styles.items}>
            {loading && <Skeleton h={50} />}
            {!loading && !agentOnline && (
              <Text c="dimmed" size="sm">
                恢复连接后检查服务状态。
              </Text>
            )}
            {!loading && agentOnline && issues.length === 0 && (
              <Group gap="xs">
                <IconCheck aria-hidden="true" className={styles.ok} size={18} />
                <Text c="dimmed" size="sm">
                  当前没有报告的异常
                </Text>
              </Group>
            )}
            {!loading &&
              agentOnline &&
              issues.map((service) => (
                <Link className={styles.issue} key={service.id} to="/services">
                  <Text fw={600} size="sm">
                    {service.name}
                  </Text>
                  <Text c="red" size="xs">
                    {service.build === 'fail'
                      ? '服务启动或编译失败'
                      : '最近一次部署失败'}{' '}
                    · 查看日志 →
                  </Text>
                </Link>
              ))}
          </div>
        </section>
      </div>
      <section aria-label="最近操作" className={styles.panel}>
        <Group gap="xs">
          <IconClock aria-hidden="true" size={17} />
          <Text component="h3" fw={600}>
            最近操作
          </Text>
          <Text c="dimmed" size="xs">
            本次浏览会话
          </Text>
        </Group>
        <div className={styles.items}>
          {activity.length === 0 ? (
            <Text c="dimmed" size="sm">
              服务操作和部署结果会记录在这里。
            </Text>
          ) : (
            activity.map((item) => (
              <Group
                className={styles.activity}
                justify="space-between"
                key={item.id}
              >
                <Text size="sm">
                  <span className={item.success ? styles.ok : styles.failed}>
                    {item.label}
                  </span>{' '}
                  · {item.serviceName}
                </Text>
                <Text c="dimmed" component="time" dateTime={item.at} size="xs">
                  {new Date(item.at).toLocaleString()}
                </Text>
              </Group>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ServicesOverview;
