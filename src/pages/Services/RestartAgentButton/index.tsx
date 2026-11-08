/**
 * 服务页头部的「重启 agent」按钮：重启本机 agent，成功后重新读一次服务状态。
 * 从顶栏挪到这里，是因为它只对服务页有意义。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconReload } from '@tabler/icons-react';

import { restartAgent } from '@/services/api';
import { useServices } from '@/services/hooks/useServices';
import { getErrorMessage } from '@/utils/error';

import styles from './index.scss';

const RestartAgentButton = () => {
  const { agentOnline, busy, refresh, services } = useServices();
  const [restarting, setRestarting] = useState(false);

  const handleRestart = async () => {
    setRestarting(true);

    try {
      await restartAgent();
      await refresh();
      notifications.show({
        title: 'agent 已重启',
        message: '已加载最新配置和代码',
        color: 'teal',
      });
    } catch (err) {
      notifications.show({
        title: 'agent 重启失败',
        message: getErrorMessage(err, '请检查 agent 日志'),
        color: 'red',
      });
    } finally {
      setRestarting(false);
    }
  };

  // agent 不在线、有服务正在操作或部署时不允许重启，否则会打断进行中的任务
  const blocked =
    !agentOnline ||
    Object.keys(busy).length > 0 ||
    services.some((service) => service.deploying);

  return (
    <Tooltip label="重启 agent" withArrow>
      <ActionIcon
        aria-label="重启 agent"
        className={styles.icon}
        disabled={blocked}
        loading={restarting}
        onClick={() => void handleRestart()}
        size="sm"
        variant="subtle"
      >
        <IconReload size={16} stroke={1.9} />
      </ActionIcon>
    </Tooltip>
  );
};

export default RestartAgentButton;
