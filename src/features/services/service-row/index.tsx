/**
 * 服务行：单条服务的展示、启停操作与可展开日志。
 * 日志在用户展开时按需拉取，并缓存于本地状态，避免随轮询重复请求。
 *
 * 主按钮为启停切换：运行中显示「停止」，已停止显示「启动」，
 * build 为 fail 时显示「重启」。
 * 可跳转页面的服务（http url）：整行可点击跳转；
 * 内部的启停按钮、日志入口、GitHub 链接单独响应，不触发跳转。
 */

import { useState } from 'react';
import { Button, Group, Loader, Text, Tooltip } from '@mantine/core';
import {
  IconBrandGithub,
  IconChevronDown,
  IconChevronUp,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRocket,
  IconTrash,
} from '@tabler/icons-react';

import { clearServiceLog, fetchServiceLog } from '@/features/services/api';
import {
  isPrimaryBusy,
  isStopBusy,
  type ServiceBusy,
} from '@/features/services/hooks/useServices';
import ServiceStatusPill from '@/features/services/service-status-pill';
import type { ServiceStatus } from '@/features/services/types';

import styles from './index.scss';

export type ServiceRowProps = {
  /** 服务状态快照 */
  service: ServiceStatus;
  /** 正在执行的动作 */
  busy: ServiceBusy;
  /** 启动回调 */
  onStart: (id: string) => void;
  /** 停止回调 */
  onStop: (id: string) => void;
  /** 重启回调（编译失败时使用） */
  onRestart: (id: string) => void;
  /** 重新部署回调（如部署到 CloudBase） */
  onDeploy: (id: string) => void;
};

const ServiceRow = ({ service, busy, onStart, onStop, onRestart, onDeploy }: ServiceRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<string>(service.log);
  const [logLoading, setLogLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const isFailed = service.build === 'fail';
  const primaryLoading = isPrimaryBusy(busy, service.id);
  const stopLoading = isStopBusy(busy, service.id);

  const isHttpUrl = service.url?.startsWith('http') ?? false;
  const canOpen = isHttpUrl && service.running;

  // 主操作按钮：build fail → 重启；运行中 → 停止；已停止 → 启动
  let actionColor: 'teal' | 'gray' = 'teal';
  let actionIcon = <IconPlayerPlay size={15} stroke={2} />;
  let actionLabel = '启动';
  let handlePrimaryAction = () => onStart(service.id);

  if (isFailed) {
    actionIcon = <IconRefresh size={15} stroke={2} />;
    actionLabel = '重启';
    handlePrimaryAction = () => onRestart(service.id);
  } else if (service.running) {
    actionColor = 'gray';
    actionIcon = <IconPlayerStop size={15} stroke={2} />;
    actionLabel = '停止';
    handlePrimaryAction = () => onStop(service.id);
  }

  /** 点击整行 → 新标签打开服务页面（仅可跳转服务） */
  const handleRowClick = () => {
    if (canOpen) {window.open(service.url ?? '', '_blank', 'noopener');}
  };

  /** 阻止内部交互元素（按钮/链接/日志入口）的点击冒泡到整行跳转 */
  const stopClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleRowKeyDown = (event: React.KeyboardEvent) => {
    if (canOpen && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleRowClick();
    }
  };

  /** 清空该服务的日志文件，并同步清空本地已加载的日志 */
  const handleClearLog = async () => {
    setClearing(true);

    try {
      await clearServiceLog(service.id);
      setLog('');
    } catch {
      setLog('（日志清理失败）');
    } finally {
      setClearing(false);
    }
  };

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

  const rowContent = (
    <div
      className={`${styles.row} ${canOpen ? styles.rowClickable : ''}`}
      onClick={canOpen ? handleRowClick : undefined}
      onKeyDown={canOpen ? handleRowKeyDown : undefined}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
    >
      <div className={styles.topRow}>
        <div className={styles.nameRow}>
          <Text className={styles.name} fw={600}>
            {service.name}
          </Text>
          {service.autoStart && <span className={styles.autoStart}>开机自启</span>}
          <ServiceStatusPill build={service.build} compact running={service.running} />
        </div>

        <div className={styles.right} onClick={canOpen ? stopClick : undefined}>
          {service.repo && (
            <a
              className={styles.repo}
              href={service.repo}
              rel="noreferrer"
              target="_blank"
              title="打开 GitHub 仓库"
            >
              <IconBrandGithub size={14} />
            </a>
          )}
          <Group gap="xs" wrap="nowrap">
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
                  onClick={() => void onDeploy(service.id)}
                  p={6}
                  size="xs"
                  variant="light"
                >
                  <IconRocket size={15} stroke={2} />
                </Button>
              </Tooltip>
            )}
            {service.deployOutcome === 'success' && (
              <Text c="dimmed" className={styles.deployOk} size="xs">
                部署成功
              </Text>
            )}
            {service.deployOutcome === 'failed' && (
              <Text c="dimmed" className={styles.deployFail} size="xs">
                部署失败
              </Text>
            )}
          </Group>
        </div>
      </div>

      <div className={styles.desc}>
        <Text c="dimmed" component="span" size="sm">
          {service.description}
        </Text>
        {service.port !== null && (
          <span className={styles.port}>
            {[
              service.portLabel ? `${service.portLabel} ${service.port}` : String(service.port),
              ...service.extraPorts.map((p) =>
                p.label ? `${p.label} ${p.port}` : String(p.port),
              ),
            ].join(' · ')}
          </span>
        )}
      </div>

      <div className={styles.logBar} onClick={canOpen ? stopClick : undefined}>
        <button
          aria-expanded={expanded}
          className={styles.logToggle}
          onClick={() => void toggleLog()}
          type="button"
        >
          <span>日志{logLoading ? '（加载中…）' : ''}</span>
          {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </button>
        <button
          className={styles.clearLog}
          disabled={clearing}
          onClick={() => void handleClearLog()}
          title="清空日志"
          type="button"
        >
          {clearing ? <Loader color="gray" size={13} /> : <IconTrash size={13} />}
        </button>
      </div>

      {expanded && (
        <pre className={styles.log} onClick={canOpen ? stopClick : undefined}>
          {log.trim() ? log : '（暂无日志输出）'}
        </pre>
      )}
    </div>
  );

  return rowContent;
};

export default ServiceRow;
