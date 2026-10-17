import {
  ActionIcon,
  Group,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { IconLayoutDashboard, IconMoon, IconSun } from '@tabler/icons-react';

import styles from './index.scss';

const Header = () => {
  const { setColorScheme } = useMantineColorScheme();
  const isDark = useComputedColorScheme('light') === 'dark';

  return (
    <Group className={styles.inner} gap="md" h="100%" wrap="nowrap">
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
        <ActionIcon
          aria-label={isDark ? '切换到亮色主题' : '切换到暗色主题'}
          className={styles.themeToggle}
          onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
          size="lg"
          title={isDark ? '切换到亮色主题' : '切换到暗色主题'}
          variant="subtle"
        >
          {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
        </ActionIcon>
      </Group>
    </Group>
  );
};

export default Header;
