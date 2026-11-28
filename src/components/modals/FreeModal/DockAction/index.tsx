/**
 * 弹窗 header 的收录按钮：页面弹窗把窗口收进程序坞；
 * 已经由程序坞恢复的窗口改显示「移除」，不再重复收录。
 */

import {
  IconWindowMinimize,
  IconX,
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

  /*
   * 已收录时这颗按钮是「关闭并从程序坞移除」，图标用 X；
   * 未收录时是「收起到程序坞」，图标用最小化窗格。
   * 已收录时 header 行尾换成最小化图标，Mantine 原生关闭叉隐藏，
   * 两处视觉语义不能都像关闭。
   */
  return (
    <FreeIconAction
      disabled={disabled}
      label={canRemove ? '关闭并从程序坞移除' : '收起到程序坞'}
      onClick={canRemove ? onRemove : onMinimize}
      tipDark={tipDark}
      tooltipLabel={canRemove ? '关闭并从程序坞移除' : '收起到程序坞（⌘M）'}
    >
      {canRemove ? (
        <IconX size={iconSize} stroke={iconStroke} />
      ) : (
        <IconWindowMinimize size={iconSize} stroke={iconStroke} />
      )}
    </FreeIconAction>
  );
};

export default DockAction;
