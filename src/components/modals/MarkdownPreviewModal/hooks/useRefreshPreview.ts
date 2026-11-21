/**
 * 刷新按钮的状态：只做「正在取数」「成功短提示」与「失败提示」三件事。
 *
 * 成功给一条短提示（与页面刷新同一口径）：快捷键触发时按钮不在焦点上，正文更新本身
 * 不够明显，得让用户知道按键生效了；失败必须可见，否则按钮转一圈就停，用户不知道
 * 盘上的内容没取到。刷新过程中按钮显示 loading，结束后无论成败都收起。
 */

import { useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import {
  REFRESH_NOTICE_DURATION,
  REFRESH_SUCCESS_NOTICE_ID,
} from '../constants';

/**
 * 包一层刷新流程：调用方只传取数函数，loading 与成败提示由这里管。
 *
 * @param onRefresh 调用方重新取正文的回调；不提供则不产生刷新行为
 * @returns `refreshing` 供按钮显示 loading，`refresh` 直接给按钮 onClick
 */
export const useRefreshPreview = (
  onRefresh?: (() => Promise<void> | void) | null,
): { refreshing: boolean; refresh: () => void } => {
  const [refreshing, setRefreshing] = useState(false);
  /** 连点 / 连按时挡住后一次：state 更新是异步的，拿它当闸门挡不住同一帧里的第二次 */
  const busy = useRef(false);

  const refresh = () => {
    if (!onRefresh || busy.current) {
      return;
    }

    busy.current = true;
    setRefreshing(true);
    void Promise.resolve()
      .then(() => onRefresh())
      .then(() => {
        notifications.show({
          autoClose: REFRESH_NOTICE_DURATION,
          color: 'teal',
          id: REFRESH_SUCCESS_NOTICE_ID,
          message: '正文已重新读取',
          title: '已刷新',
        });
      })
      .catch((err: unknown) => {
        notifications.show({
          color: 'red',
          message: getErrorMessage(err, '请稍后再试'),
          title: '刷新失败',
        });
      })
      .finally(() => {
        busy.current = false;
        setRefreshing(false);
      });
  };

  return { refreshing, refresh };
};
