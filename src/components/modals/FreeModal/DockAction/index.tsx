/**
 * 弹窗 header 的收录按钮：页面弹窗把窗口收进程序坞；
 * 已经由程序坞恢复的窗口改显示「移除」，不再重复收录。
 */

import {
  IconCircleMinus,
  IconWindowMinimize,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

type DockActionProps = {
  canMinimize: boolean;
  canRemove: boolean;
  disabled: boolean;
  iconSize: number;
  iconStroke: number;
  onMinimize: () => void;
  onRemove: () => void;
  tipDark: boolean;
};

const DockAction = ({
  canMinimize,
  canRemove,
  disabled,
  iconSize,
  iconStroke,
  onMinimize,
  onRemove,
  tipDark,
}: DockActionProps) => {
  if (!canRemove && !canMinimize) {
    return null;
  }

  return (
    <FreeIconAction
      disabled={disabled}
      label={canRemove ? '从程序坞移除' : '收起到程序坞'}
      onClick={canRemove ? onRemove : onMinimize}
      tipDark={tipDark}
      tooltipLabel={canRemove ? '从程序坞移除' : '收起到程序坞（⌘M）'}
    >
      {canRemove ? (
        <IconCircleMinus size={iconSize} stroke={iconStroke} />
      ) : (
        <IconWindowMinimize size={iconSize} stroke={iconStroke} />
      )}
    </FreeIconAction>
  );
};

export default DockAction;
