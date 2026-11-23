import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { AppEntry } from '../types';
import { openApp } from '../utils/files-api';

/**
 * 应用启动：点应用瓦片把路径交给中间件 `open`，应用自己起窗口，页面不等它退出。
 * 同一时刻只允许一个启动请求（连点不重复拉起），失败弹通知；成功不打扰。
 */
export const useAppLaunch = () => {
  /** 正在启动的应用路径；null 表示空闲 */
  const [launchingPath, setLaunchingPath] = useState<string | null>(null);

  const launchApp = useCallback(
    (app: AppEntry) => {
      if (launchingPath !== null) {
        return;
      }

      setLaunchingPath(app.path);

      openApp(app.path)
        .catch((error: unknown) => {
          notifications.show({
            color: 'red',
            message: getErrorMessage(error, '请稍后重试'),
            title: '打开应用失败',
          });
        })
        .finally(() => {
          setLaunchingPath(null);
        });
    },
    [launchingPath],
  );

  return { launchApp, launchingPath };
};
