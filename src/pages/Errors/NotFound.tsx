import { Stack, Text, Title } from '@mantine/core';

const NotFound = () => (
  <Stack align="center" gap="xs" h="100%" justify="center">
    <Title order={2}>404</Title>
    <Text c="dimmed">页面不存在</Text>
  </Stack>
);

export default NotFound;
