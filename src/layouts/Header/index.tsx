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
import { IconLayoutDashboard, IconMoon, IconSun } from '@tabler/icons-react';

import type { HeaderProps } from './types';

import styles from './index.scss';

const Header = ({ menuOpened, onToggleMenu }: HeaderProps) => {
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
        <Tooltip label={isDark ? '切换到亮色主题' : '切换到暗色主题'} withArrow>
          <ActionIcon
            aria-label={isDark ? '切换到亮色主题' : '切换到暗色主题'}
            className={styles.iconButton}
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
