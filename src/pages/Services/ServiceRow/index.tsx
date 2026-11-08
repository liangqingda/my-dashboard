import { memo } from 'react';
import { Button, Group, Text } from '@mantine/core';
import {
  IconBrandGithub,
  IconExternalLink,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRocket,
} from '@tabler/icons-react';

import type { ServiceRowProps } from './types';

import { formatDateTime } from '@/utils/format';

import ServiceLogPanel from '../ServiceLogPanel';
import ServiceStatusPill from '../ServiceStatusPill';
import {
  canOpenService,
  formatServicePorts,
  isPrimaryBusy,
  isStopBusy,
} from '../utils';

import styles from './index.scss';

/** 单个服务：状态、启停 / 部署操作；展开的日志面板交给 ServiceLogPanel */
const ServiceRow = ({
  service,
  busy,
  offline,
  onStart,
  onStop,
  onRestart,
  onDeploy,
}: ServiceRowProps) => {
  const primaryLoading = isPrimaryBusy(busy, service.id);
  const stopLoading = isStopBusy(busy, service.id);
  const disabled = offline || Boolean(busy[service.id]) || service.deploying;
  const openable = canOpenService(service);
  const ports = formatServicePorts(service);
  const stoppedAction = service.build === 'fail' ? '重启' : '启动';
  const action = service.running ? '停止' : stoppedAction;
  const onStoppedAction = service.build === 'fail' ? onRestart : onStart;
  const onAction = service.running ? onStop : onStoppedAction;
  const StoppedGlyph = service.build === 'fail' ? IconRefresh : IconPlayerPlay;
  const ActionGlyph = service.running ? IconPlayerStop : StoppedGlyph;

  return (
    <article aria-label={service.name} className={styles.row}>
      <div className={styles.topRow}>
        <div className={styles.nameRow}>
          {openable ? (
            <a
              aria-label={`访问 ${service.name}`}
              className={styles.nameLink}
              href={service.url ?? undefined}
              rel="noreferrer"
              target="_blank"
            >
              {service.name}
              <IconExternalLink aria-hidden="true" size={14} />
            </a>
          ) : (
            <Text className={styles.name} fw={600}>
              {service.name}
            </Text>
          )}
          {service.autoStart && (
            <span className={styles.autoStart}>开机自启</span>
          )}
          <ServiceStatusPill
            build={service.build}
            compact
            running={service.running}
          />
        </div>
        <Group className={styles.actions} gap="xs">
          {service.repo && (
            <a
              aria-label={`${service.name} GitHub 仓库`}
              className={styles.repo}
              href={service.repo}
              rel="noreferrer"
              target="_blank"
            >
              <IconBrandGithub aria-hidden="true" size={17} />
            </a>
          )}
          {service.deployedUrl && (
            <Button
              aria-label={`访问 ${service.name} 线上网页`}
              component="a"
              href={service.deployedUrl}
              leftSection={<IconExternalLink size={14} />}
              rel="noreferrer"
              size="xs"
              target="_blank"
              variant="light"
            >
              线上网页
            </Button>
          )}
          {service.running && service.build === 'fail' && (
            <Button
              aria-label={`重启 ${service.name}`}
              disabled={disabled}
              leftSection={<IconRefresh size={14} />}
              loading={primaryLoading}
              onClick={() => onRestart(service.id)}
              size="xs"
              variant="light"
            >
              重启
            </Button>
          )}
          <Button
            aria-label={`${action} ${service.name}`}
            color={service.running ? 'gray' : 'teal'}
            disabled={disabled}
            leftSection={<ActionGlyph size={14} />}
            loading={primaryLoading || stopLoading}
            onClick={() => onAction(service.id)}
            size="xs"
            variant="light"
          >
            {action}
          </Button>
          {service.canDeploy && (
            <Button
              aria-label={`部署 ${service.name}`}
              color="indigo"
              disabled={disabled}
              leftSection={<IconRocket size={14} />}
              loading={service.deploying || busy[service.id] === 'deploy'}
              onClick={() => onDeploy(service.id)}
              size="xs"
              variant="light"
            >
              {service.deploying ? '部署中' : '部署'}
            </Button>
          )}
        </Group>
      </div>
      <div className={styles.desc}>
        <Text c="dimmed" component="span" size="sm">
          {service.description}
        </Text>
        {ports && <span className={styles.port}>{ports}</span>}
      </div>
      {service.deployOutcome && !service.deploying && (
        <Text
          c={service.deployOutcome === 'failed' ? 'red' : 'dimmed'}
          mt={4}
          size="xs"
        >
          最近部署{service.deployOutcome === 'success' ? '成功' : '失败'}
          {service.lastDeployAt
            ? ` · ${formatDateTime(service.lastDeployAt)}`
            : ''}
        </Text>
      )}
      <ServiceLogPanel offline={offline} service={service} />
    </article>
  );
};

export default memo(ServiceRow);
