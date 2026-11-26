/**
 * 拖拽移动的两句提示：搬完的总结与「本来就在这一层」的空结果。
 * 文案口径都在这里：一次批量只弹一条（进度走完、判完要不要关窗之后才弹）。
 */

import { notifications } from '@mantine/notifications';

import { baseNameOfPath } from '../../utils/files';

/** 一批里全都在目标目录里：什么都没搬，说清楚「不用搬」而不是装作搬成了 */
export const notifyNoMove = (targetDir: string): void => {
  notifications.show({
    autoClose: 4000,
    color: 'gray',
    message: `这些项目本来就在「${baseNameOfPath(targetDir)}」里`,
    title: '没有移动',
  });
};

/** 搬完的那一句：说清搬走几个；被剔出来（本来就在目标目录里）的顺带说明 */
export const notifyMoveDone = (
  moved: number,
  skipped: number,
  targetDir: string,
): void => {
  const target = baseNameOfPath(targetDir);
  const note =
    skipped === 0 ? '' : `；另有 ${skipped} 个本来就在「${target}」里，没有移动`;

  notifications.show({
    autoClose: skipped === 0 ? 4000 : 6000,
    color: skipped === 0 ? 'teal' : 'yellow',
    message: `已移动 ${moved} 个项目${note}`,
    title: '已移动',
  });
};
