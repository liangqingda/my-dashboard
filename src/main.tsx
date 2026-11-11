import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
// 日历的中文月份 / 星期名：先注册 dayjs 中文语言包，再由 DatesProvider 指定使用它
import 'dayjs/locale/zh-cn';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';

import App from '@/App';
import ServicesProvider from '@/services/provider';
import '@/styles/global.scss';

const theme = createTheme({
  defaultRadius: 'md',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Code", monospace',
  primaryColor: 'teal',
  headings: {
    fontFamily:
      '"Space Grotesk", Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="light" theme={theme}>
      {/* 全站日历统一口径：中文、周一为每周第一天 */}
      <DatesProvider settings={{ firstDayOfWeek: 1, locale: 'zh-cn' }}>
        <Notifications limit={5} position="bottom-right" />
        <ServicesProvider>
          <App />
        </ServicesProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
