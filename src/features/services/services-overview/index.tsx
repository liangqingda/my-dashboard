/**
 * 服务概览区域：首页概览中的本机服务摘要。
 * 每个服务以卡片形式展示（名称、状态、端口、快捷启停），可跳转至服务页。
 * 主操作按钮按编译状态自适应：build 为 fail 时显示「重启」，否则为「启动」。
 */

import { Button, Group, Text, Tooltip } from '@mantine/core';
import {
  IconBrandGithub,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRocket,
  IconServer,
} from '@tabler/icons-react';
import { Link } from 'react-router';

import {
  isPrimaryBusy,
  isStopBusy,
  useServices,
} from '@/features/services/hooks/useServices';
import ServiceStatusPill from '@/features/services/service-status-pill';

import styles from './index.scss';

export type ServicesOverviewProps = {
  /** 轮询间隔（毫秒），默认 5 秒 */
  pollIntervalMs?: number;
};

const ServicesOverview = ({ pollIntervalMs = 5000 }: ServicesOverviewProps) => {
  const { services, loading, agentOnline, busy, start, stop, restart, deploy } =
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

      {!agentOnline && !loading && (
        <Text c="dimmed" className={styles.offline} size="sm">
          agent 未运行，无法读取服务状态。
        </Text>
      )}

      {agentOnline && (
        <div className={styles.grid}>
          {services.map((service) => {
            const isFailed = service.build === 'fail';
            const primaryLoading = isPrimaryBusy(busy, service.id);
            const stopLoading = isStopBusy(busy, service.id);
            const isHttpUrl = service.url?.startsWith('http') ?? false;
            const canOpen = isHttpUrl && service.running;
            const urlText = service.url?.replace(/^https?:\/\//, '') ?? null;

            // 主操作按钮：build fail → 重启；运行中 → 停止；已停止 → 启动
            let actionColor: 'teal' | 'gray' = 'teal';
            let actionIcon = <IconPlayerPlay size={15} stroke={2} />;
            let actionLabel = '启动';
            let handlePrimaryAction = () => start(service.id);

            if (isFailed) {
              actionIcon = <IconRefresh size={15} stroke={2} />;
              actionLabel = '重启';
              handlePrimaryAction = () => restart(service.id);
            } else if (service.running) {
              actionColor = 'gray';
              actionIcon = <IconPlayerStop size={15} stroke={2} />;
              actionLabel = '停止';
              handlePrimaryAction = () => stop(service.id);
            }

            return (
              <div className={styles.card} key={service.id}>
                <div className={styles.cardHead}>
                  {canOpen ? (
                    <Tooltip label={`打开 ${urlText}`} withArrow>
                      <button
                        className={`${styles.cardInfo} ${styles.canOpen}`}
                        onClick={() => void window.open(service.url ?? '', '_blank', 'noopener')}
                        type="button"
                      >
                        <Group gap="xs" wrap="nowrap">
                          <Text className={styles.cardName} fw={600}>
                            {service.name}
                          </Text>
                          {service.autoStart && (
                            <span className={styles.cardAutoStart}>开机自启</span>
                          )}
                        </Group>
                      </button>
                    </Tooltip>
                  ) : (
                    <Group gap="xs" wrap="nowrap">
                      <Text className={styles.cardName} fw={600}>
                        {service.name}
                      </Text>
                      {service.autoStart && (
                        <span className={styles.cardAutoStart}>开机自启</span>
                      )}
                    </Group>
                  )}
                  <Group gap="xs" wrap="nowrap">
                    {service.repo && (
                      <a
                        className={styles.cardRepo}
                        href={service.repo}
                        rel="noreferrer"
                        target="_blank"
                        title="打开 GitHub 仓库"
                      >
                        <IconBrandGithub size={15} />
                      </a>
                    )}
                    <ServiceStatusPill build={service.build} running={service.running} />
                  </Group>
                </div>

                {!canOpen && service.url && (
                  <Text c="dimmed" className={styles.cardUrl} size="sm">
                    {urlText}
                  </Text>
                )}

                <Group className={styles.cardActions} gap="xs" wrap="nowrap">
                  <Tooltip label={actionLabel} withArrow>
                    <Button
                      color={actionColor}
                      disabled={primaryLoading || stopLoading}
                      loading={primaryLoading || stopLoading}
                      onClick={handlePrimaryAction}
                      p={6}
                      size="xs"
                      variant="light"
                    >
                      {actionIcon}
                    </Button>
                  </Tooltip>
                  {service.canDeploy && (
                    <Tooltip label="重新部署到 CloudBase" withArrow>
                      <Button
                        color="indigo"
                        disabled={service.deploying}
                        loading={service.deploying}
                        onClick={() => void deploy(service.id)}
                        p={6}
                        size="xs"
                        variant="light"
                      >
                        <IconRocket size={15} stroke={2} />
                      </Button>
                    </Tooltip>
                  )}
                </Group>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ServicesOverview;
