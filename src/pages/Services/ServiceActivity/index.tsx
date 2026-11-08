import { useState } from 'react';
import { Button, Modal, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

import { useServices } from '@/services/hooks/useServices';
import { formatDateTime } from '@/utils/format';

import styles from './index.scss';

const ServiceActivity = () => {
  const { activity } = useServices();
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button
        aria-haspopup="dialog"
        leftSection={<IconClock aria-hidden="true" size={14} />}
        onClick={() => setOpened(true)}
        size="xs"
        variant="light"
      >
        最近操作
      </Button>
      <Modal
        centered
        closeButtonProps={{ 'aria-label': '关闭最近操作' }}
        onClose={() => setOpened(false)}
        opened={opened}
        size="lg"
        title="最近操作"
      >
        <Text c="dimmed" size="xs">
          本次浏览会话
        </Text>
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
                  {formatDateTime(item.at)}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
};

export default ServiceActivity;
