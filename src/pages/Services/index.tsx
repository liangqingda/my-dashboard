/**
 * 服务页：展示并启停本机所有已登记服务。
 */

import { Stack, Title } from '@mantine/core';

import ServicesManager from '@/features/services/services-manager';

import styles from './index.scss';

const Services = () => (
  <div className={styles.page}>
    <Stack gap="md">
      <Title order={2}>服务</Title>
      <ServicesManager />
    </Stack>
  </div>
);

export default Services;
