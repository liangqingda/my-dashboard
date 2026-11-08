import { memo, useState } from 'react';
import { Button, Group, Loader, SegmentedControl, Text } from '@mantine/core';
import {
  IconBrandGithub,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRocket,
  IconTrash,
} from '@tabler/icons-react';

import type { LogKind } from '@/services/api';
import type { ServiceBusy, ServiceStatus } from '@/services/types';
import { useServiceLog } from '@/pages/Services/hooks/useServiceLog';
import ServiceStatusPill from '@/pages/Services/ServiceStatusPill';
import {
  canOpenService,
  formatServicePorts,
  isPrimaryBusy,
  isStopBusy,
} from '@/pages/Services/utils';
import { formatDateTime } from '@/utils/format';

import styles from './index.scss';

export type ServiceRowProps = {
  service: ServiceStatus;
  busy: ServiceBusy;
  offline: boolean;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onDeploy: (id: string) => void;
};

/** 单个服务：状态、启停 / 部署操作与可展开的日志面板 */
const ServiceRow = ({
  service,
  busy,
  offline,
  onStart,
  onStop,
  onRestart,
  onDeploy,
}: ServiceRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<LogKind>('service');
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
  const { log, loading, error, clearing, clear } = useServiceLog({
    enabled: expanded && !offline,
    kind,
    serviceId: service.id,
  });
  /** 日志正文；没有输出时区分「正在读取」和「确实没有」 */
  let logContent = log;

  if (!log.trim()) {
    logContent = loading ? '正在读取日志…' : '暂无日志输出';
  }

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
      <div className={styles.logBar}>
        <button
          aria-controls={`log-${service.id}`}
          aria-expanded={expanded}
          className={styles.logToggle}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          日志
          {expanded ? (
            <IconChevronUp aria-hidden="true" size={14} />
          ) : (
            <IconChevronDown aria-hidden="true" size={14} />
          )}
        </button>
        {expanded && (
          <Text c="dimmed" size="xs">
            {offline ? '已暂停更新' : '每 2 秒更新'}
            {loading && !offline && (
              <Loader className={styles.loader} size={10} />
            )}
          </Text>
        )}
      </div>
      {expanded && (
        <div id={`log-${service.id}`}>
          <Group gap="xs" justify="space-between" mt="xs">
            {service.canDeploy ? (
              <SegmentedControl
                aria-label={`${service.name} 日志类型`}
                data={[
                  { value: 'service', label: '运行日志' },
                  { value: 'deploy', label: '部署日志' },
                ]}
                onChange={(value) => {
                  setKind(value);
                }}
                size="xs"
                value={kind}
              />
            ) : (
              <Text c="dimmed" size="xs">
                运行日志
              </Text>
            )}
            <Button
              aria-label={`清空 ${service.name} ${kind === 'deploy' ? '部署' : '运行'}日志`}
              color="gray"
              disabled={offline || service.build === 'starting'}
              leftSection={<IconTrash size={13} />}
              loading={clearing}
              onClick={() => void clear()}
              size="xs"
              variant="subtle"
            >
              清空日志
            </Button>
          </Group>
          {error && (
            <Text c="red" role="alert" size="xs">
              {error}
            </Text>
          )}
          <pre
            aria-label={`${service.name} ${kind === 'deploy' ? '部署' : '运行'}日志内容`}
            className={styles.log}
            tabIndex={0}
          >
            {logContent}
          </pre>
        </div>
      )}
    </article>
  );
};

export default memo(ServiceRow);
