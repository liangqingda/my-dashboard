/** 弹窗 header 行尾的 X：所有弹窗统一放最右，已收录的窗在这一下里连条目一起移除。 */

import { IconX } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

type CloseActionProps = {
  iconSize: number;
  iconStroke: number;
  label: string;
  onClick: () => void;
  tipDark?: boolean;
};

const CloseAction = ({
  iconSize,
  iconStroke,
  label,
  onClick,
  tipDark,
}: CloseActionProps) => (
  <FreeIconAction
    label={label}
    onClick={onClick}
    tipDark={tipDark}
    tooltipLabel={`${label}（Esc）`}
  >
    <IconX size={iconSize} stroke={iconStroke} />
  </FreeIconAction>
);

export default CloseAction;
