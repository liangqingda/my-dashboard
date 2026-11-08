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

import { ACTION_LABELS } from '@/services/constants';
import { formatDateTime } from '@/utils/format';

import { PRIMARY_ACTION_TONES } from '../constants';
import ServiceLogPanel from '../ServiceLogPanel';
import ServiceStatusPill from '../ServiceStatusPill';
import {
  canOpenService,
  formatServicePorts,
  resolvePrimaryAction,
} from '../utils';
import type { PrimaryServiceAction } from '../types';

import type { ServiceRowProps } from './types';

import styles from './index.scss';

/** 主操作按钮的图标：停止 / 启动 / 重启 */
const PRIMARY_ACTION_GLYPHS: Record<
  PrimaryServiceAction,
  typeof IconPlayerStop
> = {
  start: IconPlayerPlay,
  stop: IconPlayerStop,
  restart: IconRefresh,
};

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
  const primaryAction = resolvePrimaryAction(service);
  const PrimaryGlyph = PRIMARY_ACTION_GLYPHS[primaryAction];
  const primaryLabel = ACTION_LABELS[primaryAction];
  const disabled = offline || Boolean(busy[service.id]) || service.deploying;
  const openable = canOpenService(service);
  const ports = formatServicePorts(service);
  /**
   * 运行中但编译失败时，停止按钮旁再给一个独立的重启入口；
   * 工作台自身不允许停止，主按钮已经是重启，不用再重复
   */
  const showRestartShortcut =
    service.running && service.canStop !== false && service.build === 'fail';

  const runPrimary = (id: string) => {
    if (primaryAction === 'start') {
      onStart(id);
      return;
    }

    if (primaryAction === 'stop') {
      onStop(id);
      return;
    }

    onRestart(id);
  };

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
          {showRestartShortcut && (
            <Button
              aria-label={`重启 ${service.name}`}
              disabled={disabled}
              leftSection={<IconRefresh size={14} />}
              loading={busy[service.id] === 'restart'}
              onClick={() => onRestart(service.id)}
              size="xs"
              variant="light"
            >
              重启
            </Button>
          )}
          <Button
            aria-label={`${primaryLabel} ${service.name}`}
            color={PRIMARY_ACTION_TONES[primaryAction]}
            disabled={disabled}
            leftSection={<PrimaryGlyph size={14} />}
            loading={busy[service.id] === primaryAction}
            onClick={() => runPrimary(service.id)}
            size="xs"
            variant="light"
          >
            {primaryLabel}
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
