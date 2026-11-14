import {
  ActionIcon,
  Burger,
  Group,
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
    <Group className={styles.inner} gap="sm" h="100%" wrap="nowrap">
      <Burger
        aria-controls="main-navigation"
        aria-expanded={menuOpened}
        aria-label={menuOpened ? '收起导航' : '展开导航'}
        hiddenFrom="sm"
        onClick={onToggleMenu}
        opened={menuOpened}
        size="xs"
      />
      <Group className={styles.brand} gap={8} wrap="nowrap">
        <span aria-hidden="true" className={styles.brandMark}>
          <IconLayoutDashboard size={14} stroke={2} />
        </span>
        <Title className={styles.title} order={1}>
          My Dashboard
        </Title>
      </Group>

      <Group gap={4} ml="auto" wrap="nowrap">
        <Tooltip label={isDark ? '切换到亮色主题' : '切换到暗色主题'} withArrow>
          <ActionIcon
            aria-label={isDark ? '切换到亮色主题' : '切换到暗色主题'}
            className={styles.iconButton}
            onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            size={26}
            variant="subtle"
          >
            {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
};

export default Header;
