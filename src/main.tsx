import '@mantine/core/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';

import App from '@/App';
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
      <App />
    </MantineProvider>
  </StrictMode>,
);
