/**
 * 标题栏「刷新当前页面」按钮的反馈。
 *
 * 点下去先让按钮转圈，等当前页面真正取完数再提示结果：
 * 成功给一句「已刷新」，页面没订阅刷新就说明没有可重新读取的数据，
 * 失败必须可见——否则按钮转一圈就停，用户不知道数据没取到。
 */

import { useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';
import { requestPageRefresh } from '@/utils/page-refresh';

/** 成功 / 无需刷新的提示自动收起，失败提示留着等用户处理 */
const INFO_CLOSE_DELAY = 3000;

/** 刷新按钮的状态与点击处理。 */
export const usePageRefresh = (): {
  refreshing: boolean;
  refresh: () => void;
} => {
  const [refreshing, setRefreshing] = useState(false);
  /** 连点时挡住后一次点击：state 更新是异步的，拿它当闸门挡不住同一帧里的第二次 */
  const busy = useRef(false);

  const refresh = () => {
    if (busy.current) {
      return;
    }

    busy.current = true;
    setRefreshing(true);

    void requestPageRefresh()
      .then((result) => {
        if (result === 'empty') {
          notifications.show({
            title: '无需刷新',
            message: '当前页面没有可以重新读取的数据',
            color: 'gray',
            autoClose: INFO_CLOSE_DELAY,
          });

          return;
        }

        notifications.show({
          title: '已刷新',
          message: '当前页面的数据已重新读取',
          color: 'teal',
          autoClose: INFO_CLOSE_DELAY,
        });
      })
      .catch((err: unknown) => {
        notifications.show({
          title: '刷新失败',
          message: getErrorMessage(err, '请稍后再试'),
          color: 'red',
          autoClose: false,
        });
      })
      .finally(() => {
        busy.current = false;
        setRefreshing(false);
      });
  };

  return { refreshing, refresh };
};
