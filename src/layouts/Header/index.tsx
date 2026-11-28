/**
 * 系统顶栏：品牌、移动端侧栏开关、程序坞显示切换、全局设置与主题切换。
 *
 * 设置入口放在这里而不是某个页面：它是应用级偏好（程序坞位置 / 放大 / 毛玻璃浓度），
 * 换页面不影响；面板内容见 `@/dock/settings-panel`。
 */

import { useState } from 'react';
import {
  ActionIcon,
  Burger,
  Group,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconApps,
  IconLayoutDashboard,
  IconMoon,
  IconSettings,
  IconSun,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import IconPopoverButton from '@/components/buttons/IconPopoverButton';
import { DOCK_Z_INDEX } from '@/dock/constants';
import { useDock } from '@/dock/hooks/useDock';
import DockSettingsPanel from '@/dock/settings-panel';

import type { HeaderProps } from './types';

import styles from './index.scss';

const ICON_SIZE = 15;

const Header = ({ menuOpened, onToggleMenu }: HeaderProps) => {
  const { setColorScheme } = useMantineColorScheme();
  const isDark = useComputedColorScheme('light') === 'dark';
  const [settingsOpened, setSettingsOpened] = useState(false);
  const { entries, revealed, settings, toggleDock } = useDock();
  /** 自动隐藏开着时，顶栏这颗按钮反映「现在露着没有」；关着时程序坞常显，不画它 */
  const dockVisible = !settings.autoHide || revealed;

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
        {settings.autoHide && entries.length > 0 ? (
          <FreeIconAction
            label={dockVisible ? '隐藏程序坞' : '显示程序坞'}
            onClick={toggleDock}
            size={26}
            tone={dockVisible ? 'accent' : 'normal'}
          >
            <IconApps size={ICON_SIZE} />
          </FreeIconAction>
        ) : null}
        <IconPopoverButton
          icon={<IconSettings size={ICON_SIZE} />}
          label="全局设置"
          maxHeight="min(72dvh, 560px)"
          onChange={setSettingsOpened}
          opened={settingsOpened}
          padding={10}
          position="bottom-end"
          width={316}
          zIndex={DOCK_Z_INDEX + 60}
        >
          <DockSettingsPanel />
        </IconPopoverButton>
        <Tooltip label={isDark ? '切换到亮色主题' : '切换到暗色主题'} withArrow>
          <ActionIcon
            aria-label={isDark ? '切换到亮色主题' : '切换到暗色主题'}
            className={styles.iconButton}
            onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            size={26}
            variant="subtle"
          >
            {isDark ? (
              <IconSun size={ICON_SIZE} />
            ) : (
              <IconMoon size={ICON_SIZE} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
};

export default Header;
