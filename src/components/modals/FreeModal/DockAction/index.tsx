/**
 * 弹窗 header 的收坞按钮：把窗口收进程序坞。
 *
 * 已收录的窗（从程序坞恢复、或页面里已有同 id 条目）用一条横线表示「最小化」；
 * 未收录的窗保留窗口最小化图标，表示「收起到程序坞」。两者动作相同，只是语义不同。
 */

import { IconMinus, IconWindowMinimize } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

type DockActionProps = {
  canRemove: boolean;
  disabled: boolean;
  iconSize: number;
  iconStroke: number;
  onMinimize: () => void;
  tipDark: boolean;
};

const DockAction = ({
  canRemove,
  disabled,
  iconSize,
  iconStroke,
  onMinimize,
  tipDark,
}: DockActionProps) => (
  <FreeIconAction
    disabled={disabled}
    label={canRemove ? '最小化到程序坞' : '收起到程序坞'}
    onClick={onMinimize}
    tipDark={tipDark}
    tooltipLabel={
      canRemove ? '最小化到程序坞（⌘M）' : '收起到程序坞（⌘M）'
    }
  >
    {canRemove ? (
      <IconMinus size={iconSize} stroke={iconStroke} />
    ) : (
      <IconWindowMinimize size={iconSize} stroke={iconStroke} />
    )}
  </FreeIconAction>
);

export default DockAction;
