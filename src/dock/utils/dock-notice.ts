/**
 * 程序坞「收不进去」时的两条提示：满员拒收、状态存不下来。
 *
 * 两条都用固定 id：连续点几次只会替换同一条通知，不叠一摞一样的红条。
 * 这里不发「收起成功」之类的正向提示——收起有飞入动画本身给反馈，多余的通知只是噪音。
 */

import { notifications } from '@mantine/notifications';

import { MAX_DOCK_ENTRIES } from '../constants';

const DOCK_FULL_NOTICE_ID = 'dock-full';
const DOCK_PERSIST_NOTICE_ID = 'dock-persist-failed';

/** 程序坞已满：这一条没有收进去，不动坞里已有的条目 */
export const notifyDockFull = (): void => {
  notifications.show({
    color: 'orange',
    id: DOCK_FULL_NOTICE_ID,
    message: `程序坞已满（最多 ${MAX_DOCK_ENTRIES} 条），先从程序坞移除一条再收`,
  });
};

/** 条目写不进存储：本次会话仍可用，刷新后回到上次的列表 */
export const notifyDockPersistFailed = (): void => {
  notifications.show({
    color: 'red',
    id: DOCK_PERSIST_NOTICE_ID,
    message: '程序坞状态没能存进本地存储，刷新后会回到上次的列表',
  });
};
