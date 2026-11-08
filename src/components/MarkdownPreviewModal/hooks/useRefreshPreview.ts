/**
 * 刷新按钮的状态：只做「正在取数」与「失败提示」两件事。
 *
 * 成功不额外打扰（正文更新本身就是反馈）；失败必须可见，否则按钮转一圈就停、
 * 用户不知道盘上的内容没取到。刷新过程中按钮显示 loading，结束后无论成败都收起。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

/**
 * 包一层刷新流程：调用方只传取数函数，loading 与失败提示由这里管。
 *
 * @param onRefresh 调用方重新取正文的回调；不提供则不产生刷新行为
 * @returns `refreshing` 供按钮显示 loading，`refresh` 直接给按钮 onClick
 */
export const useRefreshPreview = (
  onRefresh?: (() => Promise<void> | void) | null,
): { refreshing: boolean; refresh: () => void } => {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    if (!onRefresh) {
      return;
    }

    setRefreshing(true);
    void Promise.resolve()
      .then(() => onRefresh())
      .catch((err: unknown) => {
        notifications.show({
          color: 'red',
          message: getErrorMessage(err, '请稍后再试'),
          title: '刷新预览失败',
        });
      })
      .finally(() => setRefreshing(false));
  };

  return { refresh, refreshing };
};
