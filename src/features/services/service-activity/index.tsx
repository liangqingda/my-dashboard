import { Group, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

import { useServices } from '@/features/services/hooks/useServices';

import styles from './index.scss';

const ServiceActivity = () => {
  const { activity } = useServices();

  return (
    <section aria-label="最近操作" className={styles.card}>
      <Group gap="xs" justify="space-between">
        <Group gap="xs">
          <IconClock aria-hidden="true" size={16} />
          <Text component="h3" fw={600} size="sm">
            最近操作
          </Text>
        </Group>
        <Text c="dimmed" size="xs">
          本次浏览会话
        </Text>
      </Group>
      {activity.length === 0 ? (
        <Text c="dimmed" mt="md" size="sm">
          服务操作和部署结果会记录在这里。
        </Text>
      ) : (
        <ul className={styles.list}>
          {activity.map((item) => (
            <li className={styles.item} key={item.id}>
              <Text size="sm">
                <span className={item.success ? styles.ok : styles.failed}>
                  {item.label}
                </span>{' '}
                · {item.serviceName}
              </Text>
              <Text c="dimmed" component="time" dateTime={item.at} size="xs">
                {new Date(item.at).toLocaleString()}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ServiceActivity;
