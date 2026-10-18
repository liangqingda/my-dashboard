import { Stack, Title } from '@mantine/core';

import ServicesOverview from '@/features/services/services-overview';

import styles from './index.scss';

const Home = () => (
  <div className={styles.page}>
    <Stack gap="md">
      <Title order={2}>概览</Title>
      <ServicesOverview />
    </Stack>
  </div>
);

export default Home;
