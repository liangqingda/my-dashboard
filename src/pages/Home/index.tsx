import { Card, Stack, Text, Title } from '@mantine/core';

import styles from './index.scss';

const Home = () => (
  <div className={styles.page}>
    <Stack gap="md">
      <Title order={2}>概览</Title>
      <Card className={styles.placeholder} radius="md" withBorder>
        <Text c="dimmed">
          框架已就绪。后续在 src/pages 下添加各信息模块，并在侧边栏登记导航即可。
        </Text>
      </Card>
    </Stack>
  </div>
);

export default Home;
