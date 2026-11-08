import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import {
  ActionIcon,
  Burger,
  Group,
  Text,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconLayoutDashboard,
  IconMoon,
  IconReload,
  IconSun,
} from '@tabler/icons-react';

import { restartAgent } from '@/services/api';
import { useServices } from '@/services/hooks/useServices';
import { getErrorMessage } from '@/utils/error';

import styles from './index.scss';

const Header = ({
  menuOpened,
  onToggleMenu,
}: {
  menuOpened: boolean;
  onToggleMenu: () => void;
}) => {
  const { refresh, agentOnline, busy, services } = useServices();
  const [agentRestarting, setAgentRestarting] = useState(false);

  const handleRestartAgent = async () => {
    setAgentRestarting(true);

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
      setAgentRestarting(false);
    }
  };

  const { setColorScheme } = useMantineColorScheme();
  const isDark = useComputedColorScheme('light') === 'dark';

  return (
    <Group className={styles.inner} gap="md" h="100%" wrap="nowrap">
      <Burger
        aria-controls="main-navigation"
        aria-expanded={menuOpened}
        aria-label={menuOpened ? '收起导航' : '展开导航'}
        hiddenFrom="sm"
        onClick={onToggleMenu}
        opened={menuOpened}
        size="sm"
      />
      <Group className={styles.brand} gap="sm" wrap="nowrap">
        <span aria-hidden="true" className={styles.brandMark}>
          <IconLayoutDashboard size={20} stroke={2} />
        </span>
        <Title className={styles.title} order={1}>
          My Dashboard
        </Title>
        <Text className={styles.tagline} component="span">
          personal overview
        </Text>
      </Group>

      <Group gap="xs" ml="auto" wrap="nowrap">
        <Tooltip label="重启 agent" withArrow>
          <ActionIcon
            aria-label="重启 agent"
            className={styles.themeToggle}
            disabled={
              !agentOnline ||
              Object.keys(busy).length > 0 ||
              services.some((service) => service.deploying)
            }
            loading={agentRestarting}
            onClick={() => void handleRestartAgent()}
            size="lg"
            variant="subtle"
          >
            <IconReload size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={isDark ? '切换到亮色主题' : '切换到暗色主题'} withArrow>
          <ActionIcon
            aria-label={isDark ? '切换到亮色主题' : '切换到暗色主题'}
            className={styles.themeToggle}
            onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            size="lg"
            variant="subtle"
          >
            {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
};

export default Header;
