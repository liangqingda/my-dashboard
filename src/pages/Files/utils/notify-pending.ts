/**
 * 图片预览里那颗「加入 / 移出待拖拽区」的两句提示：这一步发生在预览盖着页面的时候，
 * 待拖拽区此刻是藏着的，只能靠一条 toast 让人知道动成了没有、这一批现在几条。
 */

import { notifications } from '@mantine/notifications';

/** 已加入：说清是哪张、这一批共几条、关掉预览后去哪 */
export const notifyPendingAdded = (name: string, total: number): void => {
  notifications.show({
    autoClose: 4000,
    color: 'teal',
    message: `「${name}」已加入待拖拽区，这一批共 ${total} 项；关掉预览后可整批拖走`,
    title: '已加入待拖拽区',
  });
};

/** 已移出：说清移走了哪张、还剩几条；一条不剩时直接说空了 */
export const notifyPendingRemoved = (name: string, total: number): void => {
  notifications.show({
    autoClose: 3000,
    color: 'gray',
    message:
      total === 0
        ? `「${name}」已移出，待拖拽区现在空了`
        : `「${name}」已移出待拖拽区，还剩 ${total} 项`,
    title: '已移出待拖拽区',
  });
};
