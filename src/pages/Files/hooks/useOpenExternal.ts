/**
 * 用外部播放器打开视频的共用动作：文件页视频预览与程序坞视频窗都走这一份。
 *
 * 成功按实际应用给提示；失败给原因，不让按钮点了没反应。
 */

import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';

import { useMounted } from '@/hooks/useMounted';
import { getErrorMessage } from '@/utils/error';

import { openFileExternally } from '../utils/video-api';

/**
 * 管理外部打开与结果提示。
 *
 * @returns 打开动作：给定应用优先，其次 IINA，再回落系统默认
 */
export const useOpenExternal = () => {
  const mounted = useMounted();

  return useCallback(
    (id: string, appName?: string) => {
      void openFileExternally(id, appName)
        .then((app) => {
          if (!mounted.current) {
            return;
          }

          notifications.show({
            message:
              app === 'default'
                ? '已用系统默认播放器打开这个视频'
                : `已用 ${app} 打开这个视频`,
          });
        })
        .catch((error: unknown) => {
          if (!mounted.current) {
            return;
          }

          notifications.show({
            color: 'red',
            message: getErrorMessage(error, '外部打开失败'),
          });
        });
    },
    [mounted],
  );
};
