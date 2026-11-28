/** 程序坞收录窗的「最小化回坞」按钮：与系统关闭叉分左右，语义不再混。 */

import { IconWindowMinimize } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

type MinimizeActionProps = {
  iconSize: number;
  iconStroke: number;
  onClick: () => void;
  tipDark?: boolean;
};

const MinimizeAction = ({
  iconSize,
  iconStroke,
  onClick,
  tipDark,
}: MinimizeActionProps) => (
  <FreeIconAction
    label="最小化到程序坞"
    onClick={onClick}
    tipDark={tipDark}
    tooltipLabel="最小化到程序坞（⌘M）"
  >
    <IconWindowMinimize size={iconSize} stroke={iconStroke} />
  </FreeIconAction>
);

export default MinimizeAction;
