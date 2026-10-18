import { useEffect, useState } from 'react';
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

import {
  clearServiceLog,
  fetchServiceLog,
  type LogKind,
} from '@/features/services/api';
import {
  isPrimaryBusy,
  isStopBusy,
  type ServiceBusy,
} from '@/features/services/hooks/useServices';
import ServiceStatusPill from '@/features/services/service-status-pill';
import type { ServiceStatus } from '@/features/services/types';

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
  const [log, setLog] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [revision, setRevision] = useState(0);
  const primaryLoading = isPrimaryBusy(busy, service.id);
  const stopLoading = isStopBusy(busy, service.id);
  const disabled = offline || Boolean(busy[service.id]) || service.deploying;
  const canOpen =
    !offline && /^https?:\/\//.test(service.url ?? '') && service.running;
  const stoppedAction = service.build === 'fail' ? '重启' : '启动';
  const action = service.running ? '停止' : stoppedAction;
  const onStoppedAction = service.build === 'fail' ? onRestart : onStart;
  const onAction = service.running ? onStop : onStoppedAction;
  const StoppedIcon = service.build === 'fail' ? IconRefresh : IconPlayerPlay;
  const ActionIcon = service.running ? IconPlayerStop : StoppedIcon;
  const emptyLog = logLoading ? '正在读取日志…' : '暂无日志输出';

  useEffect(() => {
    if (!expanded || offline) {
      return;
    }

    let alive = true;
    let timer: number;
    const controller = new AbortController();

    const load = async () => {
      setLogLoading(true);

      try {
        const result = await fetchServiceLog(
          service.id,
          120,
          kind,
          controller.signal,
        );

        if (alive) {
          setLog(result.log);
          setLogError(null);
        }
      } catch (err) {
        if (alive) {
          setLogError(err instanceof Error ? err.message : '日志加载失败');
        }
      } finally {
        if (alive) {
          setLogLoading(false);
          timer = window.setTimeout(() => void load(), 2000);
        }
      }
    };

    timer = window.setTimeout(() => void load(), 0);

    return () => {
      alive = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [expanded, offline, service.id, kind, revision]);

  const clearLog = async () => {
    setClearing(true);

    try {
      await clearServiceLog(service.id, kind);
      setLog('');
      setLogError(null);
      setRevision((current) => current + 1);
    } catch (err) {
      setLogError(err instanceof Error ? err.message : '日志清理失败');
    } finally {
      setClearing(false);
    }
  };

  return (
    <article aria-label={service.name} className={styles.row}>
      <div className={styles.topRow}>
        <div className={styles.nameRow}>
          {canOpen ? (
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
            leftSection={<ActionIcon size={14} />}
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
        {service.port !== null && (
          <span className={styles.port}>
            {[
              service.portLabel
                ? `${service.portLabel} ${service.port}`
                : String(service.port),
              ...service.extraPorts.map((port) =>
                port.label ? `${port.label} ${port.port}` : String(port.port),
              ),
            ].join(' · ')}
          </span>
        )}
      </div>
      {service.deployOutcome && !service.deploying && (
        <Text
          c={service.deployOutcome === 'failed' ? 'red' : 'dimmed'}
          mt={4}
          size="xs"
        >
          最近部署{service.deployOutcome === 'success' ? '成功' : '失败'}
          {service.lastDeployAt
            ? ` · ${new Date(service.lastDeployAt).toLocaleString()}`
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
            {logLoading && !offline && (
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
                  setLog('');
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
              onClick={() => void clearLog()}
              size="xs"
              variant="subtle"
            >
              清空日志
            </Button>
          </Group>
          {logError && (
            <Text c="red" role="alert" size="xs">
              {logError}
            </Text>
          )}
          <pre
            aria-label={`${service.name} ${kind === 'deploy' ? '部署' : '运行'}日志内容`}
            className={styles.log}
            tabIndex={0}
          >
            {log.trim() ? log : emptyLog}
          </pre>
        </div>
      )}
    </article>
  );
};

export default ServiceRow;
