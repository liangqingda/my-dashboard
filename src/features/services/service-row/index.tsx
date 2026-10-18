/**
 * 服务行：单条服务的展示、启停操作与可展开日志。
 * 日志在用户展开时按需拉取，并缓存于本地状态，避免随轮询重复请求。
 */

import { useState } from 'react';
import { Button, Group, Text } from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconPlayerPlay,
  IconPlayerStop,
} from '@tabler/icons-react';

import { fetchServiceLog } from '@/features/services/api';
import ServiceStatusPill from '@/features/services/service-status-pill';
import type { ServiceStatus } from '@/features/services/types';

import styles from './index.scss';

export type ServiceRowProps = {
  /** 服务状态快照 */
  service: ServiceStatus;
  /** 是否为该服务执行动作中 */
  busy: boolean;
  /** 启动回调 */
  onStart: (id: string) => void;
  /** 停止回调 */
  onStop: (id: string) => void;
};

/** 把 ISO 时间格式化为本地时间字符串；非法或空返回 '—' */
const formatTime = (iso: string | null): string => {
  if (!iso) {return '—';}

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {return '—';}

  return date.toLocaleString('zh-CN', { hour12: false });
};

const ServiceRow = ({ service, busy, onStart, onStop }: ServiceRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<string>(service.log);
  const [logLoading, setLogLoading] = useState(false);

  const toggleLog = async () => {
    const next = !expanded;

    setExpanded(next);

    if (next) {
      setLogLoading(true);

      try {
        const result = await fetchServiceLog(service.id, 120);

        setLog(result.log);
      } catch {
        setLog('（日志加载失败）');
      } finally {
        setLogLoading(false);
      }
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.head}>
        <div className={styles.title}>
          <Text className={styles.name} fw={600}>
            {service.name}
          </Text>
          <Text c="dimmed" size="sm">
            {service.description}
          </Text>
        </div>

        <div className={styles.right}>
          <ServiceStatusPill build={service.build} running={service.running} />
          <Group gap="xs" wrap="nowrap">
            <Button
              color="teal"
              disabled={service.running}
              leftSection={<IconPlayerPlay size={15} stroke={2} />}
              loading={busy}
              onClick={() => onStart(service.id)}
              size="xs"
              variant="light"
            >
              启动
            </Button>
            <Button
              color="gray"
              disabled={!service.running}
              leftSection={<IconPlayerStop size={15} stroke={2} />}
              loading={busy}
              onClick={() => onStop(service.id)}
              size="xs"
              variant="light"
            >
              停止
            </Button>
          </Group>
        </div>
      </div>

      <div className={styles.meta}>
        <span>端口 {service.port ?? '—'}</span>
        <span>pid {service.pids.length > 0 ? service.pids.join(', ') : '—'}</span>
        <span>最近启动 {formatTime(service.lastStartedAt)}</span>
        <span className={styles.cmd} title={service.startCmd.join(' ')}>
          {service.startCmd.join(' ')}
        </span>
      </div>

      <button
        aria-expanded={expanded}
        className={styles.logToggle}
        onClick={() => void toggleLog()}
        type="button"
      >
        <span>日志{logLoading ? '（加载中…）' : ''}</span>
        {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </button>

      {expanded && (
        <pre className={styles.log}>
          {log.trim() ? log : '（暂无日志输出）'}
        </pre>
      )}
    </div>
  );
};

export default ServiceRow;
