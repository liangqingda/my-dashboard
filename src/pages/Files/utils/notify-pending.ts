/**
 * 图片预览里把一张图加入待拖拽区时的提示：这一步发生在预览盖着页面的时候，
 * 待拖拽区此刻是藏着的，只能靠一条 toast 让人知道加没加上、这一批现在几条。
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
