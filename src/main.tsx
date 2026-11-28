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
import { NOTIFICATION_Z_INDEX } from '@/dock/constants';
import ServicesProvider from '@/services/provider';
import '@/styles/global.scss';

const theme = createTheme({
  /*
   * Tooltip 统一抬到 1200：程序坞恢复出来的窗口在 1000、程序坞条在 1010，
   * 弹窗 header 上的图标 tip 默认 300 会被这两层盖住；tip 本身是浮层，压在最上面才可读。
   */
  components: {
    Tooltip: {
      defaultProps: {
        multiline: true,
        zIndex: 1200,
        styles: {
          tooltip: {
            maxWidth: 'min(360px, calc(100vw - 32px))',
            maxHeight: 'min(280px, 42vh)',
            overflowX: 'hidden',
            overflowY: 'auto',
            overflowWrap: 'anywhere',
            overscrollBehavior: 'contain',
          },
        },
      },
    },
  },
  defaultRadius: 'md',
  /*
   * 焦点环全站关掉：这个项目里按钮大多是「键盘快捷键也能触发」的图标按钮
   * （md 预览的上一篇 / 下一篇、目录、全屏…），快捷键触发后按钮上再亮一圈主色焦点环，
   * 看起来像是「刚才点的是这个按钮」。输入框的聚焦提示不靠这圈环——Mantine 用
   * `--input-bd-focus` 换边框色，所以关掉环不影响「输入框正在输入」的可读性。
   */
  focusRing: 'never',
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
        {/* 层级压在全屏拖拽弹窗（700）、搬家全屏遮罩（645）与飞行块（720）之上，
            也压过程序坞恢复窗口（1000）与程序坞条（1010）：程序坞窗口里截图的提示要看得见 */}
        <Notifications
          limit={5}
          position="bottom-right"
          zIndex={NOTIFICATION_Z_INDEX}
        />
        <ServicesProvider>
          <App />
        </ServicesProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
