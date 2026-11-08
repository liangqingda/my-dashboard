/**
 * 服务日志面板：折叠开关 + 运行 / 部署日志切换 + 清空，展开后按固定间隔跟踪日志尾巴。
 */

import { useState } from 'react';
import { Button, Group, Loader, SegmentedControl, Text } from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconTrash,
} from '@tabler/icons-react';

import type { ServiceLogPanelProps } from './types';

import type { LogKind } from '@/services/types';

import { useServiceLog } from '../hooks/useServiceLog';
import { resolveLogContent } from '../utils';

import styles from './index.scss';

const ServiceLogPanel = ({ offline, service }: ServiceLogPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<LogKind>('service');
  const { log, loading, error, clearing, clear } = useServiceLog({
    enabled: expanded && !offline,
    kind,
    serviceId: service.id,
  });
  const kindLabel = kind === 'deploy' ? '部署' : '运行';
  const logContent = resolveLogContent(log, loading);

  return (
    <>
      <div className={styles.bar}>
        <button
          aria-controls={`log-${service.id}`}
          aria-expanded={expanded}
          className={styles.toggle}
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
                  { label: '运行日志', value: 'service' },
                  { label: '部署日志', value: 'deploy' },
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
              aria-label={`清空 ${service.name} ${kindLabel}日志`}
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
            aria-label={`${service.name} ${kindLabel}日志内容`}
            className={styles.log}
            tabIndex={0}
          >
            {logContent}
          </pre>
        </div>
      )}
    </>
  );
};

export default ServiceLogPanel;
